# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0](https://github.com/yusufaf/spicetify-enhanced-pins/compare/v1.2.0...v1.3.0) (2026-06-07)


### Features

* add config export/import, keyboard shortcuts, pin-to-top (v1.1.0) ([dd89b16](https://github.com/yusufaf/spicetify-enhanced-pins/commit/dd89b168cdcf100293f5d4838d43d8f544a98787))
* add profile menu entry for settings access (v1.1.1) ([ffafdf7](https://github.com/yusufaf/spicetify-enhanced-pins/commit/ffafdf761373554739886c8093d61043021e30b2))
* custom context menu, marketplace docs, and v1.0.0 release prep ([9949a50](https://github.com/yusufaf/spicetify-enhanced-pins/commit/9949a50d5541751cc1994f6054a24268958e9e10))
* customizable pin marker icons (presets + emoji) (v1.2.0) ([9d28113](https://github.com/yusufaf/spicetify-enhanced-pins/commit/9d281136d4ba96b70f44729ae09e14bd81a112f2))
* sidebar filter support, enhanced edit dialog with image upload ([8edeb6d](https://github.com/yusufaf/spicetify-enhanced-pins/commit/8edeb6da06fd0a1d11e2f31a80e2043a6aa8d847))

## [1.2.0] - 2026-06-06

### Added
- Customizable pin marker icon: choose from a bundled preset set (pushpin, star, heart, lightning, fire, gem, and goofy faces) or use any emoji
- Per-pin icon override via the "Change icon" context menu action (available for all pin types, not just owned playlists)
- Global default icon picker in the settings modal ("Pin Icon" section); pins without an override follow it
- Icon choices are included in JSON export/import; unknown/legacy values fall back to the pushpin default

## [1.1.1] - 2026-04-25

### Added
- "Enhanced Pins" entry in the Spotify profile menu so settings are reachable when the library sidebar is hidden or empty

## [1.1.0] - 2026-04-18

### Added
- Export pins & config to JSON from the settings modal (versioned schema, v1)
- Import pins & config from a JSON file with validation and confirmation
- Configurable keyboard shortcuts (toggle expand, open settings, focus first pin) with a per-binding recorder UI in settings; disabled by default
- "Move to top" / "Move to bottom" context menu actions (visible only in Custom sort mode)

### Changed
- Swapped settings gear icon SVG for a cleaner filled cog that renders consistently across browsers
- Removed `cursor: pointer` from draggable pin items so hover matches native Spotify sidebar behavior (grabbing cursor still appears during an active drag)

## [1.0.0] - 2025-03-07

### Added
- Unlimited enhanced pins for playlists, albums, podcasts, and audiobooks
- Drag and drop reordering of pinned items
- Custom context menu with full playback and management actions
- Smart ownership detection for edit/delete/visibility options
- Automatic library deduplication (hides pinned items from native list)
- Settings modal with configurable options
- Keyboard navigation support
- Theme-agnostic styling via Spicetify CSS variables
- Native sidebar integration with artwork and subtitles
- Active item highlighting synced with current playback/navigation

[1.2.0]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.2.0
[1.1.1]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.1.1
[1.1.0]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.1.0
[1.0.0]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.0.0
