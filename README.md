# Enhanced Pins

Bypass Spotify's 4-pin limit with unlimited enhanced pins in the sidebar.

![Preview](image.png)

## Features

- **Unlimited Pins**: Pin as many playlists, albums, podcasts, and audiobooks as you want
- **Drag & Drop Reordering**: Rearrange your enhanced pins by dragging
- **Full Context Menu**: Right-click any enhanced pin for Play, Shuffle, Add to Queue, Start a Jam, Go to Radio, Edit, Delete, Download, and more
- **Smart Ownership Detection**: Edit/Delete/Visibility options only appear for playlists you own
- **Library Deduplication**: Automatically hides pinned items from the native library list to reduce clutter
- **Keyboard Accessible**: Navigate pins with arrow keys, activate with Enter/Space
- **Native Integration**: Matches Spotify's sidebar look and feel, including artwork, subtitles, and active-item highlighting
- **Theme-Agnostic**: Adapts to any Spicetify theme via CSS variables
- **Lightweight**: Single file, no dependencies, no build step

## How It Works

Enhanced Pins stores pin data in `localStorage` and renders a custom section at the top of the left sidebar. Items are pinned via the right-click context menu on any playlist, album, podcast, or audiobook in Spotify. The extension uses Spicetify Platform APIs (`PlayerAPI`, `PlaylistAPI`, `RootlistAPI`, `LibraryAPI`, etc.) to provide full playback and management controls.

## Installation

### Prerequisites

[Spicetify](https://spicetify.app/) must be installed and working.

### Steps

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yusufaf/spicetify-enhanced-pins.git
   ```

2. Copy the extension file to your Spicetify extensions folder:

   **Windows:**
   ```bash
   copy spicetify-enhanced-pins\enhanced-pins.js "%APPDATA%\spicetify\Extensions\enhanced-pins.js"
   ```

   **macOS/Linux:**
   ```bash
   cp spicetify-enhanced-pins/enhanced-pins.js ~/.config/spicetify/Extensions/enhanced-pins.js
   ```

3. Enable the extension:
   ```bash
   spicetify config extensions enhanced-pins.js
   spicetify apply
   ```

4. Reload Spotify - enhanced pins section appears at the top of the left sidebar.

## Usage

1. **Pin an item**: Right-click any playlist, album, podcast, or audiobook in Spotify's library and select "Enhanced Pin"
2. **Navigate**: Click a pin to open it, double-click to start playback
3. **Reorder**: Drag and drop pins to rearrange
4. **Context menu**: Right-click an enhanced pin for full playback/management options
5. **Unpin**: Right-click an enhanced pin and select "Enhanced Unpin"

### Context Menu Actions

| Action | Description |
|--------|-------------|
| Play / Pause | Toggle playback |
| Shuffle Play | Start shuffled playback |
| Add to Queue | Queue all tracks |
| Start a Jam | Start a Spotify Jam session |
| Go to Radio | Open radio based on the item |
| Edit details | Edit playlist name/description (owned playlists) |
| Delete | Delete playlist (owned playlists) |
| Download | Toggle offline download |
| Make private/public | Toggle playlist visibility (owned playlists) |
| Pin playlist | Add to Spotify's native pins |
| Enhanced Unpin | Remove from enhanced pins |
| Copy Link | Copy shareable URL |
| Copy Spotify URI | Copy internal URI |

## Settings

Click the gear icon in the Enhanced Pins section header to open settings.

- **Hide from library**: When enabled, pinned items are hidden from the native library list to avoid duplicates (default: on)
- **Confirm unpin**: Show a confirmation dialog before unpinning (default: off)

## Troubleshooting

**Extension not appearing:**
- Verify `enhanced-pins.js` is in your Spicetify Extensions directory
- Check `spicetify config` shows `enhanced-pins.js` in extensions
- Run `spicetify apply` again

**Console errors:**
- Open DevTools: `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (macOS)
- Look for `Enhanced Pins:` prefixed console messages

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for [Spicetify](https://spicetify.app/)
