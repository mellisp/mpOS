# Audio Assets

UI sound effects for the desktop OS experience.

## Naming Convention

Files should be named `<name>.mp3` where `<name>` matches the argument passed to `bbAudio.playSound()`.

## Expected Files

| File | Purpose |
|------|---------|
| `click.mp3` | Button click / UI interaction |
| `error.mp3` | Error dialog sound |

## Notes

- Format: MP3 (broad browser support)
- Keep files small (< 50 KB) for fast loading
- Sounds are lazy-loaded on first play
- Default volume is very low (0.1) — users can adjust via taskbar volume control
