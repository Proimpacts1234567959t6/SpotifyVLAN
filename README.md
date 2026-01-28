# Spotify callback site (Vercel)

Minimal static site that shows the Spotify OAuth callback code so users can paste it in Discord.

## Deploy on Vercel

1. Open [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project** → import this folder (`spotify-auth-site`).
3. **Root Directory:** set to `spotify-auth-site` if you import from the parent repo, or leave default if the repo root is this folder.
4. Deploy. Your URL will be like `https://your-project.vercel.app`.

## Configure the bot

In your bot’s `.env` set:

- `SPOTIFY_REDIRECT_URI=https://your-project.vercel.app/spotify/callback`

In the [Spotify Dashboard](https://developer.spotify.com/dashboard) → your app → **Edit Settings** → **Redirect URIs**, add that exact URL and save.

## Flow

1. User runs `/spotify link` in Discord.
2. Bot DMs the user a link to Spotify’s auth page (with `redirect_uri` pointing to this site).
3. User authorizes; Spotify redirects to `https://your-project.vercel.app/spotify/callback?code=...&state=...`.
4. This page shows **“This is your callback code”** and the code in a big box.
5. User copies the code and replies to the bot’s DM with it.
6. Bot exchanges the code for tokens and links their Spotify account.
