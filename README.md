# Spotify Link Website

This site handles Spotify account linking. Users get a link from Discord (`/spotify link` or `,spotify link`); when they open it here with `?user_id=DISCORD_USER_ID`, they are sent to Spotify to authorize, then the callback writes tokens **directly to your MongoDB** (same database the bot uses). No code to copy—linking is automatic.

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

3. **Bot `.env`**: set `SPOTIFY_WEB_BASE=https://YOUR-DEPLOYMENT.vercel.app` (no trailing slash) so the bot sends users to this site.

4. **Spotify app**: In Redirect URIs, add the **exact** redirect URL:
   - Without bot token: `https://YOUR-DEPLOYMENT.vercel.app/api/callback`
   - With bot token (recommended): set `SPOTIFY_REDIRECT_BOT_TOKEN` to a secret string, then add `https://YOUR-DEPLOYMENT.vercel.app/api/callback?bot=YourSecretToken` to Spotify (use the same value as the env).

## Flow

1. User runs `/spotify link` or `,spotify link` in Discord.
2. Bot replies with a link: `https://YOUR-SITE.vercel.app?user_id=123456789`.
3. User opens the link → this site fetches `/api/auth-url?user_id=123456789` and **sends the user to the Spotify authorization page first** (accounts.spotify.com).
4. User authorizes on Spotify. **After they authorize, Spotify redirects them** to our API callback: `/api/callback?code=...&state=123456789`.
5. The callback API exchanges the code for tokens and writes `user_spotify` into your MongoDB (same structure the bot expects).
6. User is redirected to `/?success=1` and sees “Your Spotify account is linked.”

The website does **not** call the bot; it only talks to Spotify (token exchange) and to your database.
