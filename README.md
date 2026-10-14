# Enhanced Pins

<!-- site:skip-start -->
**Documentation:** https://spicetify.yusufaf.dev/enhanced-pins/
<!-- site:skip-end -->

Bypass Spotify's 4-pin limit with unlimited enhanced pins in the sidebar.

![Enhanced Pins section at the top of the Spotify sidebar, holding ten pinned playlists and albums](preview.png)

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

## Install

Requires [Spicetify](https://spicetify.app/docs/getting-started), installed and applied at least once.

### From Spicetify Marketplace

1. In Spotify, open [Marketplace](https://github.com/spicetify/marketplace) (the shopping-cart icon at the top left) and stay on the **Extensions** tab.
2. Type `Enhanced Pins` into **Search Extensions…**.
3. If no card shows up, click **Load more** below the results until it does. Marketplace only searches the extensions it has already loaded, 100 repositories at a time, so this one usually isn't there on the first try. Changing **Sort by** doesn't help, since it only reorders what's loaded.
4. Hover the **Enhanced Pins** card, click its download button, then click **Reload now**.

### Manually

1. Download [`enhanced-pins.js`](https://raw.githubusercontent.com/yusufaf/spicetify-enhanced-pins/main/enhanced-pins.js) (right-click → **Save link as…**) into your Spicetify `Extensions` folder:
   - Windows: `%APPDATA%\spicetify\Extensions`
   - macOS / Linux: `~/.config/spicetify/Extensions`
2. Enable it and apply:

   ```bash
   spicetify config extensions enhanced-pins.js
   spicetify apply
   ```

The **Enhanced Pins** section appears at the top of the left sidebar.

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
