# CLAUDE.md

## Project

**mpOS** — Windows 2000/XP-themed portfolio site. Vanilla HTML/CSS/JS, no frameworks, no build step. Live at **www.matthewpritchard.com**. Push directly to `main`.

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | All window shells, desktop icons, start menu, taskbar, CSP meta tag |
| `css/theme.css` | XP theme (windows, buttons, scrollbars, CSS variables) |
| `css/page.css` | Per-app styles, positioning, mobile responsive |
| `js/main.js` | All app logic, explorer, terminal — inside one IIFE |
| `js/taskbar.js` | Taskbar, start menu, window drag (mouse + touch) |
| `js/fish-data.js` | Fish of the Day dataset (auto-generated) |
| `js/world-map-data.js` | Visitor Map SVG country paths + country name lookup |
| `worker.js` | Cloudflare Worker for visitor counting (deploy separately) |
| `target-game.html` | On Target (iframe game) |
| `brick-breaker.html` | Brick Breaker (iframe game) |
| `chicken-fingers.html` | Chicken Fingers (standalone, touchscreen only) |

## Apps

| App | Window ID | Category |
|-----|-----------|----------|
| My Computer | `mycomputer` | System |
| WikiBrowser | `browser` | Internet |
| Fish of the Day | `fishofday` | Programs |
| Fish Finder | `fishfinder` | Programs |
| On Target | `ontarget` | Programs |
| Brick Breaker | `brickbreaker` | Programs |
| Virtual Aquarium | `aquarium` | Programs |
| Chicken Fingers | `chickenError` | Programs |
| Notepad | `notepad` | Utilities |
| Calculator | `calculator` | Utilities |
| Calendar | `calendar` | Utilities |
| Time Zone | `timezone` | Utilities |
| Weather | `weather` | Utilities |
| Visitor Map | `visitormap` | Utilities |
| Run | `run` | System |

## Adding a New App (Checklist)

1. **`index.html`** — Window `<div class="window draggable" id="..." style="display:none;">` + start menu `<button type="button">` with 20x20 SVG icon
2. **`css/page.css`** — `#id` positioning + app styles; mobile override in `@media (max-width: 767px)`
3. **`js/main.js`** — 7 touch points:
   - `open*()` / `close*()` (close cleans up intervals/iframes)
   - `FOLDER_ITEMS.<category>` entry — `action` is a **string key**, not code
   - `ACTION_MAP` entry mapping action key → function
   - `getItemIcon()` with `ei-` prefixed gradient IDs
   - `COMMANDS` entry for terminal
   - `window.*` exports at bottom of IIFE
   - `buildLauncher()` entry (Programs/Utilities/System array) for mobile

## Icon Design Style

Early-2000s inspired, not copying any specific OS. Upper-left light source on all icons.

- **Fills:** `<linearGradient>` (UL→LR) or `<radialGradient>` — never flat. White highlight overlay in upper-left.
- **Outlines:** Colored (darker shade of fill) — never black. Softly rounded corners (`rx`/`ry` >= 1).
- **Sizes:** Desktop 48x48, start menu 20x20, system tray 16x16.
- **Gradient IDs** must be globally unique. Prefixes: start menu `xx-`, explorer `ei-xx-`, desktop `xx-full`.
- **No `<text>` elements** — use vector paths only.

**Palette:** Blues `#c8e0f8`/`#4a8abe`/`#1a4a6e` | Yellows `#fff3c4`/`#ffc107`/`#c49000` | Greens `#80c8a0`/`#4a9`/`#1a5c42` | Reds `#ef5350`/`#d32f2f`/`#c62828` | Silvers `#e0dcd4`/`#b0aca4`/`#8a8680`

## Hard Rules

**JS:** `const`/`let` only (no `var` at top level). No arrow functions. All code in IIFE, export via `window.*`.

**Security:** Never `innerHTML` with data-driven content — use `createElement` + `textContent`. Never `eval()`/`new Function()`. Use `showLoadingMessage()` and `showErrorPanel()` helpers.

**CSS vars (never hardcode):** `--silver`, `--white`, `--shadow`, `--dk-shadow`, `--highlight`, `--desktop`, `--error` (`#c62828`), `--text-muted` (`#57606a`), `--mono`, `--font`, `--link`

**Git:** Never include session URLs in commit messages.

## Known Gotchas

- **`.desktop` background** must be `var(--desktop)`. `.desktop-area` inherits from it.
- **Taskbar bottom clipping** (macOS Chrome rounded corners): fixed with 6px bottom **padding** — never `margin-bottom`.
- **`--vh`** CSS prop set from `window.innerHeight` in inline `<head>` script (mobile browser chrome fix).
- **Timer pattern:** Start intervals in `open*()`, clear in `close*()`.

## iOS ITP & Cross-Origin Images

iOS WebKit ITP blocks **entire resource loads** (not just cookies) when a server sends `SameSite=None` cookies from a third-party context. All client-side workarounds (`<img>`, `crossorigin="anonymous"`, `fetch({credentials:"omit"})`, blob URLs) fail.

**Wikimedia** sends `WMF-Uniq` with `SameSite=None` — breaks Fish of the Day images on iOS.

**Fix:** Route through **wsrv.nl** image proxy (`https://wsrv.nl/?url=<encoded-url>`). Fetches server-side, serves from its own domain, no tracking cookies. Works for all URL patterns.

**Debugging "works on desktop, fails on iOS":** `curl -v` the resource URL → check `set-cookie` headers → if `SameSite=None` present, must proxy or self-host.
