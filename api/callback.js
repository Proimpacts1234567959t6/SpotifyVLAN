/**
 * Spotify OAuth callback. After the user authorizes on Spotify, Spotify redirects
 * them here. We show the authorization CODE so they can enter it in Discord (no token
 * exchange or DB write here – the bot does that when they submit the code).
 */
function isValidUserId(state) {
  const s = state != null ? String(state).trim() : '';
  return s.length >= 17 && s.length <= 20 && /^\d+$/.test(s);
}

function htmlPage(title, body, isError = false) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;}.box{max-width:480px;padding:32px;background:#141414;border:1px solid #2a2a2a;border-radius:12px;text-align:center;}h1{font-size:1.25rem;color:#fff;}a{color:#1db954;}.error{color:#e74c3c;}.code{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:12px 16px;margin:16px 0;word-break:break-all;font-family:monospace;font-size:0.9rem;}.hint{color:#888;font-size:0.9rem;margin-top:12px;}</style></head><body><div class="box"><h1>${title}</h1><p class="${isError ? 'error' : ''}">${body}</p></div></body></html>`;
}

function codePage(code) {
  const safe = (code || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Spotify – Enter code in Discord</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;}.box{max-width:520px;padding:32px;background:#141414;border:1px solid #2a2a2a;border-radius:12px;text-align:center;}h1{font-size:1.25rem;color:#fff;}p{margin:0 0 12px 0;color:#ccc;}.code{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 18px;margin:16px 0;word-break:break-all;font-family:monospace;font-size:0.95rem;user-select:all;cursor:pointer;}a{color:#1db954;}.hint{color:#888;font-size:0.9rem;margin-top:16px;}</style></head><body><div class="box"><h1>Spotify – Enter code in Discord</h1><p>Copy the code below, then go to Discord and click <strong>Enter code</strong> to paste it.</p><div class="code" onclick="navigator.clipboard.writeText(this.textContent);this.title='Copied!'" title="Click to copy">${safe}</div><p class="hint">The code expires in a few minutes. If it doesn’t work, get a new link from <code>,spotify link</code> or <code>/spotify link</code>.</p></div></body></html>`;
}

module.exports = async function handler(req, res) {
  const sendError = (message, status = 500) => {
    try {
      res.setHeader('Content-Type', 'text/html');
      res.status(status).end(htmlPage('Spotify', message, true));
    } catch (_) {}
  };
  try {
    if (!req || typeof req.method !== 'string') {
      sendError('Invalid request.', 400);
      return;
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).end('Method not allowed');
      return;
    }
    const query = req.query || {};
    const code = query.code;
    const state = query.state;
    const err = query.error;
    const botToken = (query.bot || '').trim();

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

  // Show the code so the user can enter it in Discord (bot will exchange it for tokens)
  const codeValue = String(code || '').trim();
  res.setHeader('Content-Type', 'text/html');
  res.status(200).end(codePage(codeValue));
  } catch (e) {
    console.error('[Spotify callback] Unhandled error:', e?.message || e);
    if (!res.headersSent) sendError('Something went wrong. Try again from Discord.', 500);
  }
};
