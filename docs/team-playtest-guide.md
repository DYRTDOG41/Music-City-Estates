# Music City Estates — Team & Playtest Guide

**Working draft | 28 September 2026**  
**Founder / creative director:** William Watkins  
**Team conversation:** Facebook Messenger (group link added by the founder)  
**Source of truth for code and confirmed bugs:** GitHub  
**Development rule:** Work on `dev` or a dedicated feature branch. Do not push directly to `main`. Keep the existing city, booth, warehouse artwork, collider and Marble World IDs intact unless specifically approved.

## Our goal
Build a welcoming, playable browser-based music-career city with working studio recording, exploration, live performances, artist growth, and community battles. Our first priority is a smooth phone experience that friends can complete and describe, **not** adding every idea at once.

## Who does what

| Role | Initial owner | Responsibility |
| --- | --- | --- |
| Creative director / product owner | William Watkins | Approve the game vision, priorities, music partnerships and changes to the core loop |
| Technical lead | Open | Maintain architecture, review proposed changes, track build and test status |
| Gameplay / 3D engineer | Open | Rooms, avatars, entrances, mobile controls, animation and performance |
| Music / audio engineer | Open | Beats, recording booth flow, audio routing, vocal effects, mix quality |
| QA and community coordinator | Open | Invite testers, maintain playtest roster and consolidate Messenger reports |
| Artist advisers and playtesters | Open | Test on real phones, propose missions, give artist-focused feedback |

One person may hold multiple roles initially. Invite engineering collaborators to GitHub with only the permissions they need. Agree in writing on ownership, licenses, credit, and any compensation before accepting contributed code, music or 3D assets.

## Communication rules

- **Messenger:** introductions, short ideas, screenshots, screen recordings, and session announcements.
- **GitHub issues:** one issue per reproducible bug or approved feature; add a clear title, owner, priority, steps, and device/browser. Do not put private contacts, unreleased music, personal information, or credentials in public issues (the repository is public).
- **GitHub branches and PRs:** proposed code changes. Link every PR to an issue where possible. A second person checks changes before merging.
- **Weekly recap:** William or the coordinator posts exactly three sections: **Shipped**, **Blocked**, **Next test**. Ideas that are not selected go to the backlog; no one is expected to reply all day.

## First-week test: One complete artist journey

**Before inviting a group:** confirm a working preview URL, identify its commit/branch, run a smoke test on one iPhone and one other device, and verify that any private music/API endpoints do not expose credentials.

Give each tester the **same route**:
1. Open the game on your own phone. Tell us where you first get confused.
2. Create or select an artist/avatar; move through the city and enter BeGenius Studio.
3. Choose or preview a beat, record or create a song, and return to the city without overlapping music.
4. Enter Hip-Hop Café, perform a song, and confirm whether cash/fans/XP increase.
5. Explore Word Slaughter Warehouse; verify its stage, interaction prompts, and the 25-fan battle lock.
6. If playing in pairs, test Live Freestyle hosting/joining, synchronized beat, and voting.

**Record:** device model, operating system, browser, game build/URL, exact screen, expected behavior, actual behavior, screenshot/short screen recording (with consent), and whether you can repeat the problem.

### Top acceptance checks

- Mobile avatar faces forward, walks naturally without T-posing or getting stuck, and is usable with touch controls.
- All large door targets and essential buttons remain accessible; radio/audio bars do not cover game actions.
- Studio beat preview is audible; background soundtrack stops while recording, previewing or performing as intended.
- First-song → café performance → rewards works without a dead end.
- A returning tester's existing save still loads.

For each check, mark **PASS**, **FAIL**, or **NOT TESTED**. Record failures before the next round of feature work.

## Issue template (copy to GitHub)

**Title:** [BUG] Area — what is wrong  
**Priority:** Blocker / High / Medium / Idea  
**Device + browser:**  
**Preview URL + commit:**  
**Steps:** 1 / 2 / 3  
**Expected:**  
**Actual:**  
**Screenshot/video:**  
**Owner and status:** Unassigned / Working / Ready for retest / Verified

## First suggested sprint

**Sprint objective:** Get five independent testers through the same gameplay loop on mobile.

1. Confirm a shareable working preview build.
2. Resolve blockers in avatar animation/orientation, door interactions, and overlapping radio/audio controls.
3. Verify the studio-to-café progression and save compatibility.
4. Gather five tester reports and convert reproducible problems into GitHub issues.
5. Run a short group review: select **at most three** changes for the following sprint.

### Ideas backlog (not sprint commitments)

- Quick pre-made avatars plus optional deeper customization.
- One-tap guided song creation with standard lead vocal, ad-libs, and AI-assisted mix.
- In-world producer/manager NPC as a contextual task guide.
- Rewarded performances that play a whole song with audience reactions and a clear results screen.
- Rotating community showcase and artist challenges for founding testers.

## Group message template

**Welcome to Music City Estates — Founding Build & Test Crew!**

We're building a music career game where artists can record songs, explore a 3D city, perform, battle, promote their music and build fans. This Messenger group is our workshop: test builds, screen recordings, bug reports and ideas. You don't need paid ChatGPT or engineering experience to participate. If you code, design, produce or build 3D assets, introduce yourself and say what you'd like to help with.

**Our first challenge:** Play one complete artist journey on your phone and tell us what gets confusing or breaks. Include your phone type and a screenshot or screen recording when useful. We'll pick the top three fixes together each week.

We'll share a **verified** game preview link here once the test build is ready. Thanks for helping create Music City Estates from the ground up.

— William
