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
