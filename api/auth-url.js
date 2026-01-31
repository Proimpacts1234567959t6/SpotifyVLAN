/**
 * Returns the Spotify OAuth authorization URL.
 * Flow: user hits our site with ?user_id=... → we return this URL → user is sent to
 * Spotify's authorization page first → after they authorize, Spotify redirects them
 * to our API callback (redirect_uri). We do not send users to the callback first.
 */
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-recently-played user-top-read user-modify-playback-state';

function getCredentials() {
  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  let redirect = (process.env.SPOTIFY_REDIRECT_URI || '').trim();
  const botToken = (process.env.SPOTIFY_REDIRECT_BOT_TOKEN || '').trim();
  if (botToken && redirect) {
    const sep = redirect.includes('?') ? '&' : '?';
    redirect = redirect + sep + 'bot=' + encodeURIComponent(botToken);
  }
  return { id, redirect };
}

function isValidUserId(userId) {
  const s = userId != null ? String(userId).trim() : '';
  return s.length >= 17 && s.length <= 20 && /^\d+$/.test(s);
}

function sendJson(res, status, body) {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.status(status).end(JSON.stringify(body));
  } catch (_) {}
}

module.exports = function handler(req, res) {
  try {
    if (!req || typeof req.method !== 'string') {
      sendJson(res, 400, { error: 'Invalid request.' });
      return;
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).end('Method not allowed');
      return;
    }
    const query = req.query || {};
    const user_id = (query.user_id || query.userId || '').trim();
    if (!isValidUserId(user_id)) {
      sendJson(res, 400, { error: 'Missing or invalid user_id (Discord user ID).' });
      return;
    }
    const { id, redirect } = getCredentials();
    if (!id || !redirect) {
      sendJson(res, 500, { error: 'Spotify not configured (SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI).' });
      return;
    }
    const u = new URL(AUTH_URL);
    u.searchParams.set('client_id', id);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('redirect_uri', redirect);
    u.searchParams.set('scope', SCOPES);
    u.searchParams.set('state', user_id);
    sendJson(res, 200, { url: u.toString() });
  } catch (e) {
    console.error('[Spotify auth-url] Unhandled error:', e?.message || e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error.' });
  }
};
