# CLAUDE.md

## Project Overview

**mpOS** — a desktop OS-themed portfolio site by Matthew Pritchard, live at **www.matthewpritchard.com**. Styled after Windows 2000/XP with draggable windows, a taskbar, start menu, and system tray. Built with vanilla HTML, CSS, and JS (no frameworks, no build step).

## Site Architecture

### Key Files
| File | Purpose |
|------|---------|
| `index.html` | Main page — all window shells, desktop icons, start menu, taskbar |
| `css/theme.css` | Shared XP-style theme (windows, buttons, scrollbars, CSS variables) |
| `css/page.css` | Page-specific styles (explorer, apps, folder browser) |
| `js/main.js` | All application logic (window openers, explorer, apps, terminal) |
| `js/taskbar.js` | Taskbar, start menu toggle, window minimize/restore, drag |
| `js/audio.js` | Sound effects (click, startup) |
| `js/fish-data.js` | Fish of the Day dataset (auto-generated) |
| `js/aquarium-data.js` | Aquarium locations dataset |
| `404.html` | Custom 404 error page |
| `error-pages/500.html` | Custom 500 error page |
| `target-game.html` | On Target game (loaded in iframe) |
| `chicken-fingers.html` | Chicken Fingers game (separate page, touchscreen only) |

### Window System
Every app window is a static `<div class="window draggable">` in `index.html`, initially hidden (`display:none`). `openWindow(id)` shows it with a restore animation. The taskbar tracks open windows for minimize/restore. No dynamic window creation — all shells exist in the DOM from page load.

### Applications
| App | Window ID | Category | Notes |
|-----|-----------|----------|-------|
| My Computer | `mycomputer` | System | Shows browser/system info via `populateSysInfo()` |
| WikiBrowser | `browser` | Internet | Wikipedia iframe browser with URL bar |
| Fish of the Day | `fishofday` | Games | Daily fish from Wikipedia API |
| Fish Finder | `fishfinder` | Games | Nearest/furthest aquarium via Geolocation |
| On Target | `ontarget` | Games | iframe to `target-game.html` |
| Virtual Aquarium | `aquarium` | Media | YouTube IFrame Player API (live fish cam) |
| Chicken Fingers | `chickenError` | Games | Touchscreen-only; desktop shows error dialog |
| Notepad | `notepad` | Utilities | localStorage persistence (`mpOS-notepad`) |
| Calculator | `calculator` | Utilities | Basic arithmetic |
| Calendar | `calendar` | Utilities | Monthly calendar viewer |
| Time Zone | `timezone` | Utilities | 8 world clocks, analog/digital toggle, 1s interval |
| Weather | `weather` | Utilities | Open-Meteo API + Geolocation, 3-day forecast |
| Run | `run` | System | Terminal emulator with command map |

### Viewport & Layout
- `--vh` CSS custom property set via inline `<script>` in `<head>` to `window.innerHeight` (fixes mobile browser chrome).
- `.desktop` background is `var(--desktop)` (blue). `.desktop-area` inherits from it.
- Taskbar has extra bottom padding (6px) to prevent clipping on macOS Chrome rounded corners.

## Repository Structure

This is a multi-purpose repository. Files and directories are organized by topic or function at the top level. When adding new content, group related files into their own directory with a descriptive name.

## Development Guidelines

### General Conventions

- Keep each utility or script self-contained where possible
- Include usage comments or a README within subdirectories for non-trivial projects
- Prefer clarity over cleverness in all code
- Use descriptive file and directory names that convey purpose

### Git Workflow

- Use feature branches for new additions
- Write clear, descriptive commit messages summarizing the "why" not just the "what"
- Keep commits focused and atomic (one logical change per commit)
- Never include session URLs (e.g. `https://claude.ai/code/session_...`) in commit messages

### Adding New Content

When adding a new utility or project:

1. Create a dedicated directory if it involves multiple files
2. Include any necessary dependency or build instructions in the directory
3. Ensure scripts are executable and include a shebang line where appropriate
4. Add a brief description of what the tool does at the top of the main file

### Code Quality

- No secrets, credentials, or API keys should be committed
- Scripts should handle errors gracefully and provide useful error messages
- Use consistent formatting within each file (follow the conventions of the language being used)

### Icon Design Style (mpOS)

All inline SVG icons must follow these principles. The style is original — inspired by early 2000s desktop aesthetics but not copying any specific OS.

**Light & Shading:**
- Primary light source: upper-left corner. Every icon shares this direction.
- Fills use `<linearGradient>` (upper-left → lower-right) or `<radialGradient>` (center-offset to upper-left at ~35%) — never flat single-color fills.
- A semi-transparent white highlight shape in the upper-left area of the main form adds specular reflection.

**Outlines:**
- Use colored outlines (a darker, more saturated shade of the object's fill color) — never stark black.
- Stroke width: 1–1.5px at 48×48; 0.6–1.2px at 20×20.
- Corners are softly rounded (`rx`/`ry` ≥ 1).

**Color Palette (warm, saturated but not neon):**
- Blues: `#c8e0f8` → `#4a8abe` → `#1a4a6e` (highlight / mid / outline)
- Yellows/Golds: `#fff3c4` → `#ffc107` → `#c49000`
- Greens: `#80c8a0` → `#4a9` → `#1a5c42`
- Reds: `#ef5350` → `#d32f2f` → `#c62828`
- Silvers: `#e0dcd4` → `#b0aca4` → `#8a8680`

**Size Guidelines:**
- Desktop icons: 48×48 viewBox — room for gradients with 2–3 stops, highlight overlay, moderate detail.
- Start menu icons: 20×20 viewBox — simpler gradients (2 stops), fewer elements, bolder strokes.
- System tray icons: 16×16 — silhouette-level simplicity, minimal or no gradient.

**Gradient IDs:** Every gradient ID must be globally unique within the page. Use a 2–3 letter prefix per icon (e.g., `mc-` for My Computer, `af-` for Applications Folder).

**Never use `<text>` elements in SVGs** — always use vector `<path>`, `<rect>`, `<circle>`, or `<line>` elements for consistent cross-browser rendering.

### Explorer / Folder Browser (mpOS)

The site uses a single unified **Explorer window** (`#explorer`) for all folder browsing — modeled after Windows 2000 Explorer.

**Architecture:**
- One window with a **sidebar tree** (left pane) and a **content area** (right pane).
- The sidebar lists: mpOS (root/all), Programs, Documents, Utilities.
- Clicking a sidebar item calls `navigateExplorer(folder)` which updates the title, address bar, sidebar active state, and content.
- Content can be toggled between **icon view** (grid of 80px tiles) and **list view** (rows with icon, name, description, tag).

**Folder data** is defined in `js/main.js` as `FOLDER_ITEMS` — an object mapping folder keys (`programs`, `documents`, `utilities`) to arrays of item objects with `name`, `desc`, `tag`, `action`, and optionally `href`.

**Entry points:**
- Desktop "Applications" icon → `openExplorer()` → shows "all" (every item across all folders).
- Start menu Programs/Documents/Utilities → `openExplorerTo(folder)` → opens explorer navigated to that specific folder.
- Terminal commands: `explorer`, `programs`, `documents`, `utilities`.

**Icon rendering:** `getItemIcon(name)` returns inline SVG markup for each app, using `ei-` prefixed gradient IDs to avoid conflicts with start menu icon gradients.

**Adding a new app:** Add an entry to the appropriate `FOLDER_ITEMS` array, add its icon SVG to `getItemIcon()`, and it will automatically appear in the explorer.

### Adding a New Utility/App (Checklist)

When adding a new window to mpOS, touch these 5 integration points:

1. **`index.html`** — Add the window `<div class="window draggable" id="..." style="display:none;">` shell with titlebar, close/minimize buttons, and body. Also add a start menu `<a class="start-menu-item">` entry with a 20×20 SVG icon in the appropriate submenu.
2. **`css/page.css`** — Add `#windowid { width: ...; left: ...; top: ...; }` positioning plus any app-specific styles.
3. **`js/main.js`** — Add:
   - `open*()` / `close*()` functions (close should clean up intervals/iframes)
   - `FOLDER_ITEMS.<category>` entry (`name`, `desc`, `tag`, `action`)
   - `getItemIcon()` entry with `ei-` prefixed gradient IDs
   - `COMMANDS` entry for terminal access
   - `window.*` exports at the bottom of the IIFE

**Gradient ID conventions:** Each icon context uses a unique prefix to avoid SVG gradient collisions:
- Start menu icons: 2-letter prefix (e.g., `tz-face`, `cl-bar`)
- Explorer icons: `ei-` prefix (e.g., `ei-tz`, `ei-cl`)
- Desktop icons: full prefix (e.g., `mc-body`, `af-tab`)

**Timer/interval pattern:** Apps with live-updating data (Time Zone, Aquarium) start their interval in `open*()` and clear it in `close*()` to avoid wasted cycles when the window is hidden. The grid/DOM is built once on first open and reused on subsequent opens.

### CSS Variables (from theme.css)

Key variables used across components:
- `--silver`, `--white`, `--shadow`, `--dk-shadow` — XP-style 3D border system
- `--highlight`, `--highlight-text` — selection/hover colors
- `--desktop` — blue desktop background
- `--error` — `#c62828` dark red (used for error icons, second hands)
- `--link` — link color
- `--font` — system font stack
