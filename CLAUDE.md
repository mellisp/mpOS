# CLAUDE.md

## Project Overview

**Bits-and-bobs** is a collection of miscellaneous utilities, scripts, and small projects. This repository serves as a general-purpose workspace for standalone tools and experiments.

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
