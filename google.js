// Google Calendar + Tasks, read-only. OAuth loopback flow with PKCE for desktop apps.
// The user supplies their own OAuth client (google-client.json in userData); the refresh
// token is encrypted with Windows DPAPI via safeStorage and never leaves this machine.
const { app, safeStorage, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly';
const clientFile = () => path.join(app.getPath('userData'), 'google-client.json');
const tokenFile = () => path.join(app.getPath('userData'), 'google-token.bin');
let access = null; // { token, expires }

function client() {
  const j = JSON.parse(fs.readFileSync(clientFile(), 'utf8'));
  const c = j.installed || j.web || j;
  if (!c.client_id) throw new Error('google-client.json has no client_id. Download it again from Google Cloud.');
  return c;
}

const connected = () => fs.existsSync(tokenFile());

async function tokenRequest(params) {
  const c = client();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret || '', ...params }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error_description || j.error || `Google sign-in failed (${res.status})`), { code: j.error });
  return j;
}

function waitForCode(state, authParams) {
  return new Promise((resolve, reject) => {
    let redirect;
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/') { res.writeHead(404).end(); return; } // e.g. favicon
      const code = u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(code
        ? "<p style=\"font:16px system-ui\">Penguin's Helper is connected to Google. You can close this tab.</p>"
        : '<p style="font:16px system-ui">Sign-in did not finish. Close this tab and click Connect Google again.</p>');
      clearTimeout(timer); server.close();
      code ? resolve({ code, redirect }) : reject(new Error(u.searchParams.get('error') === 'access_denied' ? 'Sign-in was cancelled' : 'Sign-in did not finish'));
    });
    const timer = setTimeout(() => { server.close(); reject(new Error('Sign-in timed out. Try again.')); }, 5 * 60 * 1000);
    server.listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${server.address().port}`;
      shell.openExternal('https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({ ...authParams, redirect_uri: redirect }));
    });
  });
}

async function connect() {
  if (!fs.existsSync(clientFile())) {
    shell.openPath(app.getPath('userData'));
    throw new Error('Put google-client.json in the folder that just opened. See the README.');
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows can't encrypt the Google sign-in here, so it won't be saved.");
  const verifier = crypto.randomBytes(48).toString('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  const { code, redirect } = await waitForCode(state, {
    client_id: client().client_id, response_type: 'code', scope: SCOPES, state,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
    access_type: 'offline', prompt: 'consent',
  });
  const j = await tokenRequest({ code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect });
  if (!j.refresh_token) throw new Error('Google did not grant offline access. Try connecting again.');
  fs.writeFileSync(tokenFile(), safeStorage.encryptString(j.refresh_token));
  access = { token: j.access_token, expires: Date.now() + (j.expires_in - 60) * 1000 };
}

function disconnect() {
  let refresh = null;
  try { refresh = safeStorage.decryptString(fs.readFileSync(tokenFile())); } catch {}
  fs.rmSync(tokenFile(), { force: true });
  access = null;
  if (refresh) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(refresh), { method: 'POST' }).catch(() => {});
}

async function accessToken() {
  if (access && Date.now() < access.expires) return access.token;
  const refresh = safeStorage.decryptString(fs.readFileSync(tokenFile()));
  try {
    const j = await tokenRequest({ refresh_token: refresh, grant_type: 'refresh_token' });
    access = { token: j.access_token, expires: Date.now() + (j.expires_in - 60) * 1000 };
    return access.token;
  } catch (e) {
    if (e.code === 'invalid_grant') disconnect(); // revoked or expired: make the user reconnect
    throw e;
  }
}

async function api(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (!res.ok) throw new Error(`Google API ${res.status} for ${new URL(url).pathname}`);
  return res.json();
}

// Timed events in the next 24h, all-day events today, and open tasks due by the day after tomorrow.
async function upcoming(now = new Date()) {
  const day = 24 * 60 * 60 * 1000;
  const ev = await api('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + new URLSearchParams({
    timeMin: now.toISOString(), timeMax: new Date(+now + day).toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '50',
  }));
  const items = (ev.items || [])
    .filter((e) => e.status !== 'cancelled' && !(e.attendees || []).some((a) => a.self && a.responseStatus === 'declined'))
    .map((e) => ({ id: 'e:' + e.id, kind: 'event', title: e.summary || '(No title)', start: e.start.dateTime, date: e.start.date }));
  const lists = await api('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100');
  for (const l of lists.items || []) {
    const t = await api(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(l.id)}/tasks?` + new URLSearchParams({
      showCompleted: 'false', showHidden: 'false', dueMax: new Date(+now + 2 * day).toISOString(), maxResults: '100',
    }));
    // Task due dates are date-only, sent as midnight UTC: the date part is the user's date.
    for (const x of t.items || []) if (x.due) items.push({ id: 't:' + x.id, kind: 'task', title: x.title || '(No title)', date: x.due.slice(0, 10) });
  }
  return items;
}

module.exports = { connect, disconnect, connected, upcoming };
