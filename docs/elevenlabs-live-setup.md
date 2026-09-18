# Music City Estates — Live ElevenLabs Setup

The code is ready for a live ElevenLabs Music preview. The remaining step is deployment and adding the private API key.

## What is already built

- `record_music.html` sends a normalized Music City generation job.
- `music_city_ai.js` can receive a real MP3 response and play it in the booth.
- `api/music/generate.js` securely calls ElevenLabs Music v2.5.
- `api/health.js` checks whether the backend is online without spending music credits.
- `vercel.json` configures the serverless function.
- `.env.example` documents the required secrets without containing any real key.

## Required server environment values

```
ELEVENLABS_API_KEY=<private key>
MUSIC_CITY_ALLOWED_ORIGIN=https://dyrtdog41.github.io
MUSIC_CITY_MAX_MUSIC_MS=15000
```

Do not put the real ElevenLabs key in GitHub, HTML, browser JavaScript, screenshots, or chat messages.

## Deploy on Vercel

1. Import the `DYRTDOG41/Music-City-Estates` GitHub repository into Vercel.
2. Add the three environment variables above in the Vercel project settings.
3. Deploy the project.
4. Open:
   `https://YOUR-VERCEL-DOMAIN.vercel.app/api/health`
5. Confirm the response shows:
   - `"ok": true`
   - `"elevenLabsConfigured": true`

## Connect GitHub Pages to the backend

Open the Music City recording booth once with the deployed endpoint in the query string:

```
record_music.html?aiBackend=https://YOUR-VERCEL-DOMAIN.vercel.app/api/music/generate
```

The browser stores that backend URL locally for future sessions.

Then choose:

- **Music City AI Engine:** ElevenLabs Music
- **Preview Length:** 8, 12, or 15 seconds
- press **CREATE WITH AI**

The generated MP3 returns through the secure backend and appears in the booth's audio player.

## Cost-control behavior

The first live backend deliberately caps requests at a maximum configured preview length. The default cap is 15 seconds. This is an MVP safety measure; full-song length can be raised later after usage controls, player authentication, quotas, and billing rules are in place.

## Current limitations

The current ElevenLabs adapter generates from the normalized Music City prompt. The recorded/uploaded vocal is detected by the UI but is not uploaded to ElevenLabs yet.

A later voice-aware adapter can add:

- vocal-reference upload
- user voice consent/verification
- voice transformation or voice-preserving generation where supported
- permanent song storage
- player catalog entries
- radio, battle, venue, fan and XP integration

## Production hardening before public launch

Before opening paid generation to all players, add:

- Music City user authentication
- per-player quotas
- rate limiting
- generation credit/billing rules
- abuse monitoring
- permanent object storage for generated songs
- database records for song ownership and provenance
