# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.1]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.1.1
[1.1.0]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.1.0
[1.0.0]: https://github.com/yusufaf/spicetify-enhanced-pins/releases/tag/v1.0.0
