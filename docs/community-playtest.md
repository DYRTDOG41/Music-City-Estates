# Music City Estates — Founding Team & Friend Alpha Playtest

**Purpose:** Make the existing music-career game fun and usable for real artists, then invite friends with engineering, music-production, 3D, and testing skills to build the next version together.

This is a working playbook. The founder approves priorities, releases, business terms, and public announcements. Nobody needs paid ChatGPT to join.

## Our three workspaces

- **Facebook Messenger — conversation:** use one "Music City Estates • Founding Build Team" chat for quick videos, screenshots, ideas, and check-ins. Pin the test link, this guide, and the week's top three priorities. Once the group grows, make separate tester and engineering chats to reduce noise.
- **GitHub — source of truth for code and bugs:** repo https://github.com/DYRTDOG41/Music-City-Estates. One GitHub issue per fix or feature; link the issue in Messenger instead of burying tasks in chat. Developers work in branches based on `dev`, submit pull requests back to `dev`, and get a review before merging. Do not push directly to `main`.
- **Shared planning document — team decisions:** summarize accepted ideas, task ownership, meeting notes, and decisions in one editable document. Keep private contacts, unpublished contracts, and service credentials out of this public repository. The founder can create a shared Google Doc with the contents of this guide if edit access is enabled.

## Team roles to fill

| Role | Owns | First deliverable |
| --- | --- | --- |
| Founder / Creative Director (William Watkins) | Vision, priorities, quality bar, partnerships, release approval | Choose 3 fixes for first alpha |
| Technical Lead / Release Keeper (recruit) | Architecture, pull-request reviews, test builds, avoiding regressions | Confirm dev build + reliable test URL |
| Gameplay / 3D Engineer (recruit) | Mobile movement, doors, avatar animations, rooms, performance | Fix top broken interaction from testers |
| Music / AI Production Engineer (recruit) | Beat preview, vocal and ad-lib recording, audio focus, AI-assisted polish | Make a simple record-preview-save flow |
| Test & Community Lead (recruit) | Friend invites, device coverage, bug intake, weekly recap | Collect 10 structured playtest reports |

Start with 3–5 contributors and 8–12 friend testers. The same person may cover multiple roles until we have consistent participation.

## First alpha — a 15–20-minute test

Send a private test invitation to the initial group only after the Tech Lead confirms the deployed URL, phone loading, and audio permissions.

1. Open the game on a phone; note device/browser, loading time, and whether any UI covers the screen.
2. Enter Hip-Hop Heights, walk to BeGenius Studio, and test avatar facing, movement, joystick, signs, and door targets.
3. Visit the studio. Try selecting and previewing a beat, recording a short main vocal, adding ad-libs if available, then playing it back. Record exactly where the flow gets confusing or fails.
4. Take the song to the Hip-Hop Café or other available show experience; test whether song audio plays and rewards appear. Stop testing anything requiring paid services or private credentials.
5. Visit Word Slaughter Warehouse, verify the room loads, and test the battle gating at 25 fans. If the battle feature is ready, try a friend-to-friend session on separate phones.
6. Refresh the page and check whether artist progress, songs, fans, cash, and XP persist.

**Submit each bug in Messenger:** screenshot or 10–30s screen recording + phone/browser + page/room + what you tapped + expected result + actual result + whether it happens every time. A Test Lead turns reproducible bugs into GitHub issues, with personal information removed.

## First build priorities

**P0 — Testable and understandable:** verify one reliable shareable URL; fix phone movement, avatar poses/facing, entry hints, oversized door targets, blocked action buttons, duplicate/running audio, and critical save or reload loss.

**P1 — First song in under five minutes:** obvious beat preview; main vocal then optional ad-libs; separate instrumental playback from recording; one-tap AI-assisted mix preset with manual controls later; clear save/preview. The music flow must work in demo/fallback mode without paid third-party entitlement.

**P2 — Reasons to return:** NPC manager with three clear starter quests, a friend collaboration mission, stage reactions and post-show rewards, a new-song reward bonus with reduced rewards for repeating the same set, and unlock teasers for other music districts.

These are proposals. Validate with testers before building deeper systems, expensive 3D assets, or paid integrations.

## Weekly team rhythm

- **Monday — 20-minute Messenger check-in:** choose no more than 3 priority issues, one owner and expected test per issue.
- **Midweek — asynchronous clips:** engineers post before/after demos to Messenger; testers reply with reproduction evidence, not just "looks good."
- **Weekend — 30-minute playtest:** send the current alpha URL, use the same checklist, and report the top three blockers. The founder accepts, defers, or rejects proposed changes.
- **After each session:** Test Lead posts a five-line recap: working build link, wins, blockers, decisions, and owners/next steps.

**Definition of done:** issue has an owner, reproducible before state, updated implementation on a branch, mobile retest, pull-request review, and founder's approval to include it in an alpha build.

## Team guardrails

- No access tokens, API keys, passwords, contracts, phone numbers, or private artist recordings in Messenger or the public repo. Use restricted project permissions and server-side environment variables.
- Give testers a deployed game link, not GitHub write access. Invite developers as collaborators only after agreeing on scope; use least-privilege roles and review pull requests.
- Keep `main` stable. No deleting/renaming existing game files or replacing approved 3D assets as part of unrelated changes. Test on the `dev` path first.
- Ask permission before using a tester's voice/video or published music. Only submit code, samples, models, logos, and beats that contributors own or are licensed to use. Agree in writing how contributions, credits, royalties, and commercial rights work before publishing them.
- Prefer free browser-friendly technology and an iPhone-first test path until the gameplay proves itself.

## Ready-to-paste Messenger welcome

> Welcome to the Music City Estates Founding Build Team. I'm building a virtual music city where artists can record songs, perform, battle, grow fans, and build a music career. I'm inviting a small group of friends, artists, producers, engineers, and testers to help us make it real. You don't need paid ChatGPT or coding experience to participate. I'll pin the current game link and our test guide when the next build is verified. Try the game, send short screen recordings of what works or breaks, and share one new idea that would make you want to play again. Our three ground rules: respect everyone's work, don't share private builds/materials outside the group, and turn good ideas into small testable steps. Let's build something worth playing.

## Decisions to record at each check-in

Working build URL: **to be verified**  
Technical Lead: **open**  
Test & Community Lead: **open**  
Next 3 priority issues: **select during the first meeting**  
Next scheduled group test: **agree in Messenger**  
Founder sign-off: **required before public release**
