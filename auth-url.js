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

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const user_id = (req.query.user_id || req.query.userId || '').trim();
  if (!isValidUserId(user_id)) {
    return res.status(400).json({ error: 'Missing or invalid user_id (Discord user ID).' });
  }
  const { id, redirect } = getCredentials();
  if (!id || !redirect) {
    return res.status(500).json({ error: 'Spotify not configured (SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI).' });
  }
  const u = new URL(AUTH_URL);
  u.searchParams.set('client_id', id);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('state', user_id);
  return res.status(200).json({ url: u.toString() });
};
