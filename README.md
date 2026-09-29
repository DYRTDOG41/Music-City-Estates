# Music City Estates MVP

A playable browser MVP for a music-career simulation. Start in a bedroom studio, create songs, perform, promote releases, grow a fanbase, and unlock new parts of Music City.

## Run locally

No build step or dependencies are required. From the repository root, start any static file server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

The BeGenius Studio entrance opens a walkable 3D executive lobby with a RushDee
plaque gallery, a five-second rotating official YouTube release wall, and a
connection to the universal recording workflow. Release destinations are
configured in `begenius_catalog.js`.

## Gameplay

- **Create Song** to gain XP, fans, and a release.
- **Perform Live** to earn cash, fans, and XP after creating a song.
- **Promote Music** to trade cash for reach.
- **Enter Battle** after reaching 25 fans.
- Use **View City** to track location unlocks.
- Use **View Phone** to see contacts, messages, social activity, and releases.
- Tour the walkable **Word Slaughter Warehouse** battle venue at any fan level; the three-round battle itself unlocks at 25 fans.
- Use **Live Freestyle** from the 3D battle stage for a phone-to-phone WebRTC battle test: Rapper A hosts, Rapper B joins by invite link, fans can listen and vote, and each device runs a synchronized generated beat.
- Explore the Warehouse **Community Space** to meet resident artists, build connections, join a collaboration challenge, showcase releases, and check in with an A&R.
- Visit **Merch & Backstage** for click-ready product displays, optional verified store or sponsor links, and artist battle check-in.
- Perform at the walkable **Hip-Hop Café** to select a release, play a three-part open-mic set, and grow toward the 50-fan venue milestone.

Progress is saved automatically in the browser with `localStorage`.

## Fusion board prototype

Open `fusion_board.html` to play the separate four-borough board match. The 40-space board,
cars, dice, producers, property income, manager, radio, and finale are adapted from the
Detroit Empire prototype. Hip-Hop Heights opens the existing walkable street and its rooms
in a board overlay; closing it returns to the same car, space, and turn. The BeGenius door
requires four producer sounds and a landing on its studio space during a board match.

The board's prompt-card song action and the full BeGenius room currently have separate song
state. An experimental online playtest room now uses PeerJS for host-authoritative turns, shared
board state, and text chat inside the in-game phone for up to four players on separate devices.
The host starts a local game, opens the phone, creates a room, and shares its invite; guests join
from the link and claim an available computer seat. Keep the host tab open. Only the host retains
the shared match save; uploaded song audio stays on each artist's device and does not play on
other phones. Voice chat, durable room accounts, reconnects, shared audio, and public-release
moderation need a production backend. Country Crossings, Latin Quarter, and Global Sound have
producer blocks and visible borough entrances, with walkable interiors to follow.

The phone's **Producer Network** displays each artist's four prompt slots. An online
artist who has collected a card can share a copy with a connected human artist
missing that borough's card, even when it is not the sender's turn. The host
validates the sender's actual room seat and the card; recipients cannot receive
duplicate borough cards or change a completed song. Card exchanges appear in room
chat, sync to all players, and remain part of the host's saved board state.
Complete all four prompts to preview/copy the combined song direction from your
phone, then land at BeGenius Studio to upload the finished song. AI music generation
is not wired into this board; use your chosen authorized generator externally.

**Two-phone playtest:** Phone A starts the board and creates a room from the
in-game phone. Share the invite with Phone B, which opens it, enters an artist
name and joins. Each phone should see the same turn and car positions. Collect
a producer card, open the phone and share it with the other artist; check the
recipient's Producer Network and both chat logs, then close and reopen the phone.
Finally, have the recipient gather all four cards and check the copied prompt.
Keep both browsers online and the host tab open while testing.

**Automated checks:** run `npm test` with Node.js 22. The fusion collaboration
suite checks missing-card and forged offers, off-turn exchanges, host seat
authorization, save/load persistence and four-card studio unlock. A real two-phone
test remains required before merging the draft PR into `dev`.

The Live Freestyle feature is an MVP test path. It uses PeerJS public signaling so no private game server is required for early phone testing. Production multiplayer should move signaling, identity, moderation, room persistence, and anti-abuse controls to owned infrastructure.

## Project structure

- `index.html` — lightweight launcher that opens the city map.
- `city_map.html` — the main starting screen for the current game world.
- `player-state.js` — shared player progress used by the current map and location pages.
- `sponsor_catalog.js` — optional merchandise, affiliate, and sponsored-placement links used by the 3D Merch Room.
- `begenius_catalog.js` — official YouTube destinations and plaque labels used by the 3D BeGenius lobby.

## Suggested next milestones

1. Add full song creation choices (genre, beat, vocals, polish, title, and cover art).
2. Turn venues into playable rhythm or choice-based performance events.
3. Add battle opponents, fan voting, rewards, and branching outcomes.
4. Add contact relationships, quests, and producer/DJ/A&R storylines.
5. Add authentication and cloud saves once the core loop is validated.

## ElevenLabs review integration

The review build includes a secure ElevenLabs provider layer:

- `elevenlabs_demo.html` — reviewer-facing live API demo.
- `api/elevenlabs/tts.js` — studio engineer Text to Speech.
- `api/elevenlabs/transcribe.js` — Scribe v2 vocal/freestyle transcription.
- `api/elevenlabs/status.js` — server-side credential validation without exposing the key.
- `api/music/generate.js` — Eleven Music v2.5 generation adapter.
- `api/music/reference.js` — Eleven Music audio-reference upload adapter.
- `record_music.html` — ElevenLabs-first studio workflow with Music City Native kept as an offline fallback.

Required server environment variables:

```text
ELEVENLABS_API_KEY=your_server_side_key
ELEVENLABS_MUSIC_MODEL=music_v2_5
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
ELEVENLABS_STT_MODEL=scribe_v2
ELEVENLABS_VOICE_ID=optional_voice_id
```

Never place the ElevenLabs API key in GitHub, HTML, client JavaScript, or a query string. The Music API itself is subject to the ElevenLabs account's API entitlement.
