# Spotify Link Website

This site handles Spotify account linking. Users get a **direct Spotify authorization link** from Discord (`/spotify link` or `,spotify link`). When they open it, they go straight to Spotify to authorize. After they authorize, Spotify redirects them to this website’s callback with the user ID in `state`; the callback exchanges the code for tokens and writes **directly to your MongoDB** (same database the bot uses). No code to copy—linking is automatic.

## Setup

1. **Deploy to Vercel** (or any host that supports serverless API routes).

2. **Environment variables** (Vercel project settings):

   | Variable | Description |
   |----------|-------------|
   | `SPOTIFY_CLIENT_ID` | From [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
   | `SPOTIFY_CLIENT_SECRET` | Same app |
   | `SPOTIFY_REDIRECT_URI` | Base redirect URI, e.g. `https://YOUR-DEPLOYMENT.vercel.app/api/callback`. **Must match exactly** what is registered in your Spotify app’s Redirect URIs. |
   | `SPOTIFY_REDIRECT_BOT_TOKEN` | **(Recommended)** A secret token (e.g. a random string) that is included in the redirect URL per Spotify’s requirements. If set, the actual redirect URI sent to Spotify is `SPOTIFY_REDIRECT_URI?bot=TOKEN`. **Add that full URL** to your Spotify app’s Redirect URIs (e.g. `https://YOUR-DEPLOYMENT.vercel.app/api/callback?bot=YourSecretToken`). The callback verifies this token. |
   | `SPOTIFY_WEB_BASE` | Same as your deployment URL, e.g. `https://YOUR-DEPLOYMENT.vercel.app` (used for success redirect) |
   | `MONGODB_URI` | Full MongoDB connection string (same DB as the bot), or use `MONGODB_USERNAME` + `MONGODB_PASSWORD` + `MONGODB_HOST` |
   | `MONGODB_DB_NAME` | Optional, default `bot` |
   | `MONGODB_COLLECTION_NAME` | Optional, default `store` |

3. **Bot `.env`**: set `SPOTIFY_CLIENT_ID` and `SPOTIFY_REDIRECT_URI` (e.g. `https://YOUR-DEPLOYMENT.vercel.app/api/callback`) so the bot can build the direct Spotify authorization link. Optionally set `SPOTIFY_REDIRECT_BOT_TOKEN` to match the website. Set `SPOTIFY_WEB_BASE` for the success-page redirect after linking (e.g. `https://YOUR-DEPLOYMENT.vercel.app`).

4. **Spotify app**: In Redirect URIs, add the **exact** redirect URL:
   - Without bot token: `https://YOUR-DEPLOYMENT.vercel.app/api/callback`
   - With bot token (recommended): set `SPOTIFY_REDIRECT_BOT_TOKEN` to a secret string, then add `https://YOUR-DEPLOYMENT.vercel.app/api/callback?bot=YourSecretToken` to Spotify (use the same value as the env).

## Flow

1. User runs `/spotify link` or `,spotify link` in Discord.
2. Bot replies with the **direct Spotify authorization link** (e.g. `https://accounts.spotify.com/authorize?client_id=...&redirect_uri=...&state=123456789`).
3. User opens the link → they go **straight to Spotify** to authorize (accounts.spotify.com).
4. User authorizes on Spotify. **After they authorize, Spotify redirects them** to this website’s callback: `/api/callback?code=...&state=123456789` (user ID in `state`).
5. The callback API exchanges the code for tokens and writes `user_spotify` into your MongoDB (same structure the bot expects).
6. User is redirected to `/?success=1` and sees “Your Spotify account is linked.”

The bot builds the Spotify auth URL using `SPOTIFY_CLIENT_ID` and `SPOTIFY_REDIRECT_URI`. The website does **not** call the bot; it only handles the callback (token exchange) and writes to your database.
