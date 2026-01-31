# Spotify Link Website

This site handles Spotify account linking. Users get a link from Discord (`/spotify link` or `,spotify link`); when they open it here with `?user_id=DISCORD_USER_ID`, they are sent to Spotify to authorize, then the callback writes tokens **directly to your MongoDB** (same database the bot uses). No code to copy—linking is automatic.

## Setup

1. **Deploy to Vercel** (or any host that supports serverless API routes).

2. **Environment variables** (Vercel project settings):

   | Variable | Description |
   |----------|-------------|
   | `SPOTIFY_CLIENT_ID` | From [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
   | `SPOTIFY_CLIENT_SECRET` | Same app |
   | `SPOTIFY_REDIRECT_URI` | **Must be** `https://YOUR-DEPLOYMENT.vercel.app/api/callback` (add this exact URL in your Spotify app’s Redirect URIs) |
   | `SPOTIFY_WEB_BASE` | Same as your deployment URL, e.g. `https://YOUR-DEPLOYMENT.vercel.app` (used for success redirect) |
   | `MONGODB_URI` | Full MongoDB connection string (same DB as the bot), or use `MONGODB_USERNAME` + `MONGODB_PASSWORD` + `MONGODB_HOST` |
   | `MONGODB_DB_NAME` | Optional, default `bot` |
   | `MONGODB_COLLECTION_NAME` | Optional, default `store` |

3. **Bot `.env`**: set `SPOTIFY_WEB_BASE=https://YOUR-DEPLOYMENT.vercel.app` (no trailing slash) so the bot sends users to this site.

4. **Spotify app**: In Redirect URIs, add exactly `https://YOUR-DEPLOYMENT.vercel.app/api/callback`.

## Flow

1. User runs `/spotify link` or `,spotify link` in Discord.
2. Bot replies with a link: `https://YOUR-SITE.vercel.app?user_id=123456789`.
3. User opens the link → this site fetches `/api/auth-url?user_id=123456789` and redirects to Spotify.
4. User authorizes on Spotify → Spotify redirects to `/api/callback?code=...&state=123456789`.
5. The callback API exchanges the code for tokens and writes `user_spotify` into your MongoDB (same structure the bot expects).
6. User is redirected to `/?success=1` and sees “Your Spotify account is linked.”

The website does **not** call the bot; it only talks to Spotify (token exchange) and to your database.
