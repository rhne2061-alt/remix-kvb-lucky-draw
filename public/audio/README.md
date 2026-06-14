Expected audio files for Task 3:

- `draw-start.mp3`
- `draw-spin-loop.mp3`
- `draw-win.mp3`

Suggested source pages from the implementation plan:

- `https://pixabay.com/sound-effects/musical-football-football-soccer-game-music-08-second-490554/`
- `https://pixabay.com/sound-effects/musical-football-football-soccer-game-music-15-second-490555/`
- `https://pixabay.com/sound-effects/people-crowd-cheering-in-stadium-435357/`

Current gap:

- The runtime environment is blocked by Pixabay anti-bot verification, so the `.mp3`
  assets could not be downloaded reliably in this session.
- `src/utils/audio.ts` already points to `/audio/*.mp3` and fails silently when the
  files are missing, so the draw flow still works without breaking the UI.
