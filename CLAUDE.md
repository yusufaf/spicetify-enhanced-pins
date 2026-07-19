# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Spicetify (Spotify desktop client) extension: `enhanced-pins.js` (~3100 lines). No build step, no bundler, no dependencies at runtime. The entire extension is one IIFE that runs inside Spotify's `xpui` renderer process. Everything else in the repo is packaging (`manifest.json` for Spicetify Marketplace) or release tooling.

## Commands

```bash
pnpm test        # node --check enhanced-pins.js — syntax gate, the only automated test
spicetify apply  # reload Spotify with current extension file
```

- Package manager is **pnpm** (pinned via `packageManager` in package.json).
- Husky hooks: `pre-commit` runs `pnpm test`; `commit-msg` runs commitlint (Conventional Commits — required, release-please derives versions from it).
- No linter, no unit test framework. Verification is `node --check` plus live testing in the running client.

## Live testing

Automated tests can't cover this — behavior only exists inside Spotify. Use the `spicetify-live-test` skill (CDP attach to the running desktop client) for reload / eval / console / screenshot. `tests.live.md` holds the smoke test and scenarios T1–T5; run the smoke test after every edit.

Dev setup is a symlink from `%APPDATA%\spicetify\Extensions\enhanced-pins.js` to the repo file, so edits are picked up by a reload without re-copying.

Debug output is prefixed `[Enhanced Pins]`. Startup logs `Starting...` then `Initialized`.

## Architecture

The file is organized into `//#region` blocks; keep new code inside the matching region and keep the regions in this order:

| Region | Responsibility |
|---|---|
| Type Definitions | JSDoc `@typedef` for `PinnedItem` |
| Constants | Storage keys, DOM selectors, SVG path strings, type maps, view-mode enums, default config/shortcuts |
| State | Module-level mutable state (`currentPins`, etc.) |
| Storage | `loadPins`/`savePins`/`loadConfig`/`saveConfig`, plus export/import with `EP_EXPORT_SCHEMA_VERSION` validation |
| Metadata | Fetching + refreshing cached name/artwork/owner via Spicetify APIs |
| Context Menu | Registers "Enhanced Pin"/"Enhanced Unpin" into Spotify's native right-click menus |
| Settings | The settings modal, icon picker, config UI |
| Sidebar DOM | Injection point discovery, view-mode detection, `renderPins()`, the custom right-click menu for pins |
| Drag and Drop | Internal reorder (HTML5 DnD on pin elements) **and** external drops (document-level capture listeners + body attribute monitoring, since Spotify's own drag layer swallows events) |
| Observer | MutationObserver that re-injects the section when Spotify re-renders the sidebar |
| Styles | One large injected `<style>` block, theme-agnostic via CSS custom properties |
| Shortcuts | Keybinding parsing (`eventToBinding`) and dispatch |
| Bootstrap | Polls until required `Spicetify.*` APIs and `.Root__nav-bar` exist, then wires everything up in order |

Key invariants:

- **Persistence is localStorage only.** Two keys: `enhanced-pins-data` (array of `PinnedItem`) and `enhanced-pins-config`. Item metadata is *cached at pin time* and refreshed lazily — pins must render correctly from stale cache alone.
- **Everything is re-entrant.** Spotify tears down and rebuilds the sidebar constantly; `renderPins()` and the observer must tolerate being called repeatedly and must not leak listeners or duplicate the container (`enhanced-pins-container`).
- **Spotify DOM is unstable across versions.** Selectors and injection points are best-effort with fallbacks (see `findInjectionPoint`, `detectViewMode`, `getPlaylistItemAtPoint`). Prefer feature-detection and defensive optional chaining over assuming structure.
- **Platform APIs are accessed defensively** (`Spicetify?.Platform?.X`) because availability varies by client version. Bootstrap gates on the specific APIs used.
- CSS must not hardcode colors — use Spicetify theme variables so it works under any theme.

## Versioning

Version lives in three places kept in sync by release-please: `package.json`, and the `// VERSION:` banner comment in `enhanced-pins.js` (wrapped in `x-release-please-start-version` markers). Do not bump versions manually; land Conventional Commits and let the release workflow do it.

## Style

- JSDoc comments on functions.
- Descriptive names; existing code uses `EP_`-prefixed constants and `ep-` prefixed CSS classes / DOM ids — follow that to avoid collisions with Spotify's own styles.
- Update `CHANGELOG.md` only via release-please, not by hand.
