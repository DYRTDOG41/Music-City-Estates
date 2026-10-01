# Music City Estates: Godot board starter

This is a separate playable prototype made from the supplied `MCE_Board.glb`. It targets **Godot 3.6.x, GLES2** and uses simple geometry for the player marker. It does not modify the website in the repository or require an API key.

## Open on your Mac

1. Download the `dev` branch as a ZIP from GitHub and unzip it.
2. Open **Godot 3.6.3**. Choose **Import** and select `godot-mce-board/project.godot`.
3. Open the project and press **Play** (F6 from `Main.tscn`, or F5 for the project).
4. Click **Roll Dice** to move around the 32 spaces. The card at the top left shows your cash, producer prompts, and next career step.

The browser version of Music City Estates remains at the repository root. The board's GLB is instanced in `Main.tscn`; game rules are in `scripts/board_game.gd`.

## Current prototype rules

- Start with $1,000, collect $200 each time you pass the first space.
- Land on each district's producer space to collect its short prompt.
- Once all four prompts are collected, land on any studio to spend $500 and record.
- Then land on Manager ($200), Radio ($100), and Final Venue, in that order.
- This first pass is single player and offline. The marker is a placeholder; car pieces, property ownership, online rooms, voice chat, and AI music generation are later work.

The GLB spaces are numbered clockwise from 1 to 32. This starter keeps all behavior in its own folder so it can later be merged with your current Mac project. Your Mac's current scene is not in this repository yet.
