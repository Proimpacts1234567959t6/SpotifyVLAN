/**
 * Spotify OAuth callback. After the user authorizes on Spotify, Spotify redirects
 * them here (to this API callback). We exchange the code for tokens and write to MongoDB.
 * Flow: user was sent to Spotify auth first → they authorized → Spotify sent them here.
 */
const { MongoClient } = require('mongodb');

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const STATE_DOC_ID = 'state';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'bot';
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME || 'store';

function getConnectionUri() {
  const uri = process.env.MONGODB_URI;
  if (uri && !uri.includes('undefined')) return uri;
  const username = process.env.MONGODB_USERNAME || '';
  const password = process.env.MONGODB_PASSWORD || '';
  const host = process.env.MONGODB_HOST || 'cluster0.6vktage.mongodb.net';
  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/?appName=Cluster0`;
}

function getCredentials() {
  const id = (process.env.SPOTIFY_CLIENT_ID || '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
  let redirect = (process.env.SPOTIFY_REDIRECT_URI || '').trim();
  const botToken = (process.env.SPOTIFY_REDIRECT_BOT_TOKEN || '').trim();
  if (botToken && redirect) {
    const sep = redirect.includes('?') ? '&' : '?';
    redirect = redirect + sep + 'bot=' + encodeURIComponent(botToken);
  }
  return { id, secret, redirect };
}

function isValidUserId(state) {
  const s = state != null ? String(state).trim() : '';
  return s.length >= 17 && s.length <= 20 && /^\d+$/.test(s);
}

async function exchangeCode(code, redirectUri) {
  const { id, secret } = getCredentials();
  if (!id || !secret) return null;
  const redirect = (redirectUri || '').trim();
  if (!redirect) return null;
  try {
    const auth = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code || '').trim(),
        redirect_uri: redirect
      }).toString()
    });
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        expires_at: expiresAt
      };
    }
    return null;
  } catch (err) {
    console.error('[Spotify callback] exchange error:', err?.message || err);
    return null;
  }
}

function htmlPage(title, body, isError = false) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;}.box{max-width:480px;padding:32px;background:#141414;border:1px solid #2a2a2a;border-radius:12px;text-align:center;}h1{font-size:1.25rem;color:#fff;}a{color:#1db954;}.error{color:#e74c3c;}</style></head><body><div class="box"><h1>${title}</h1><p class="${isError ? 'error' : ''}">${body}</p></div></body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method not allowed');
    return;
  }
  const code = req.query.code;
  const state = req.query.state;
  const err = req.query.error;
  const botToken = (req.query.bot || '').trim();

  // Spotify: redirect URI must match exactly. If SPOTIFY_REDIRECT_BOT_TOKEN is set, the redirect URI
  // must include it (e.g. https://yoursite.com/api/callback?bot=YourToken) and we verify it here.
  const expectedBotToken = (process.env.SPOTIFY_REDIRECT_BOT_TOKEN || '').trim();
  if (expectedBotToken && botToken !== expectedBotToken) {
    res.setHeader('Content-Type', 'text/html');
    res.status(403).end(htmlPage('Spotify', 'Invalid redirect. Use the link from Discord to link your account.', true));
    return;
  }

  if (err) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(htmlPage('Spotify', `Authorization denied or failed (${err}). Try again from Discord.`, true));
    return;
  }
  if (!code || !state) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(htmlPage('Spotify', 'Missing code or state. Use the link from Discord first.', true));
    return;
  }
  const userId = String(state).trim();
  if (!isValidUserId(userId)) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(htmlPage('Spotify', 'Invalid link session. Get a new link from Discord.', true));
    return;
  }

  const { redirect } = getCredentials();
  const tokens = await exchangeCode(code, redirect);
  if (!tokens || !tokens.access_token) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).end(htmlPage('Spotify', 'Token exchange failed. Check SPOTIFY_REDIRECT_URI matches your Spotify app dashboard.', true));
    return;
  }

  const uri = getConnectionUri();
  if (!uri || uri.includes('undefined')) {
    res.setHeader('Content-Type', 'text/html');
    res.status(500).end(htmlPage('Spotify', 'Database not configured. Set MONGODB_URI or MONGODB_USERNAME/PASSWORD.', true));
    return;
  }

  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    const coll = db.collection(MONGODB_COLLECTION_NAME);
    const doc = await coll.findOne({ _id: STATE_DOC_ID });
    const stateObj = doc && doc.state && typeof doc.state === 'object' ? doc.state : {};
    const user_spotify = Array.isArray(stateObj.user_spotify) ? stateObj.user_spotify : [];
    const existing = user_spotify.find(r => String(r.user_id || '').trim() === userId);
    const payload = {
      user_id: userId,
      access_token: String(tokens.access_token || ''),
      refresh_token: String(tokens.refresh_token || '').trim() || (existing ? String(existing.refresh_token || '') : ''),
      expires_at: Number(tokens.expires_at) || 0
    };
    let newArr;
    if (existing) {
      existing.access_token = payload.access_token;
      existing.refresh_token = payload.refresh_token;
      existing.expires_at = payload.expires_at;
      newArr = user_spotify;
    } else {
      newArr = [...user_spotify, payload];
    }
    const updatedState = { ...stateObj, user_spotify: newArr };
    await coll.replaceOne(
      { _id: STATE_DOC_ID },
      { _id: STATE_DOC_ID, state: updatedState },
      { upsert: true }
    );
  } catch (e) {
    console.error('[Spotify callback] DB error:', e?.message || e);
    res.setHeader('Content-Type', 'text/html');
    res.status(500).end(htmlPage('Spotify', 'Could not save your link to the database. Try again.', true));
    return;
  } finally {
    if (client) await client.close().catch(() => {});
  }

  const base = (process.env.SPOTIFY_WEB_BASE || req.headers.origin || '').replace(/\/$/, '');
  const successUrl = base ? `${base}/?success=1` : '/?success=1';
  res.writeHead(302, { Location: successUrl });
  res.end();
};
