# Music City AI Studio Engine

## Goal

Music City Estates owns the player experience and uses interchangeable AI music providers underneath it.

The recording booth sends one normalized Music City request. A secure backend then decides which provider adapter receives the job. This prevents the game UI from being locked to one vendor.

## Architecture

```
Music City recording booth
        |
        v
music_city_ai.js
        |
        v
Secure Music City backend
        |
        +--> ElevenLabs Music adapter
        +--> Stable Audio adapter
        +--> Google Lyria adapter
        +--> Future partner adapter (Suno / MyTunes if approved)
```

## Important security rule

Never place provider API keys in GitHub Pages, HTML, or browser JavaScript.

The browser should call a Music City backend endpoint such as:

```
POST /api/music/generate
```

The backend stores provider secrets in environment variables and makes the actual provider request.

## Normalized request

```json
{
  "provider": "elevenlabs",
  "title": "Midnight in Hip-Hop Heights",
  "lyrics": "optional lyrics or prompt",
  "style": "melodic trap, soulful keys",
  "mode": "Create Full Song",
  "vocalStyle": "Use My Voice",
  "creativity": 65,
  "influence": 55,
  "studio": "begenius",
  "beat": "Midnight Drive",
  "audioAttached": false
}
```

## Normalized response

```json
{
  "id": "job_123",
  "status": "submitted",
  "title": "Midnight in Hip-Hop Heights",
  "audioUrl": "https://secure.example/generated-track.mp3",
  "message": "Generation completed."
}
```

## Provider phases

1. **Demo engine** — works now and verifies the complete Music City interface and job flow without spending API credits.
2. **First live provider** — connect one official commercial API through a secure backend.
3. **Provider router** — add automatic selection by price, capability, latency, or studio perk.
4. **Partner adapters** — add Suno, MyTunes, or other services only if an official commercial API/partnership is available.
5. **Music City proprietary models** — optional future provider using the same interface.

## Game integration

Generated tracks can later be stored in a Music City song catalog and then connected to:

- artist profile and discography
- fan collections
- battles
- venue performances
- charts
- Music City Radio submissions
- XP, fans, and career progression

The AI vendor remains replaceable while the Music City progression system stays the same.
