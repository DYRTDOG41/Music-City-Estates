# Music City Estates MVP

A playable browser MVP for a music-career simulation. Start in a bedroom studio, create songs, perform, promote releases, grow a fanbase, and unlock new parts of Music City.

## Run locally

No build step or dependencies are required. From the repository root, start any static file server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Gameplay

- **Create Song** to gain XP, fans, and a release.
- **Perform Live** to earn cash, fans, and XP after creating a song.
- **Promote Music** to trade cash for reach.
- **Enter Battle** after reaching 25 fans.
- Use **View City** to track location unlocks.
- Use **View Phone** to see contacts, messages, social activity, and releases.

Progress is saved automatically in the browser with `localStorage`.

## Project structure

- `index.html` — semantic game screens and interface structure.
- `style.css` — responsive game UI and CSS location/studio artwork.
- `script.js` — player state, progression, actions, map unlocks, phone content, and persistence.

## Suggested next milestones

1. Add full song creation choices (genre, beat, vocals, polish, title, and cover art).
2. Turn venues into playable rhythm or choice-based performance events.
3. Add battle opponents, fan voting, rewards, and branching outcomes.
4. Add contact relationships, quests, and producer/DJ/A&R storylines.
5. Add authentication and cloud saves once the core loop is validated.
