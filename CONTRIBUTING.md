# Contributing

Contributions are welcome! This is a single-file Spicetify extension, so getting started is easy.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Copy `enhanced-pins.js` to your Spicetify Extensions folder:
   - **Windows:** `%APPDATA%\spicetify\Extensions\`
   - **macOS/Linux:** `~/.config/spicetify/Extensions/`
4. Run `spicetify apply` to load changes

## Development

No build step required - edit the JavaScript file directly.

**Testing changes:**
```bash
spicetify apply
```
Spotify will restart with your changes.

**Debug output:**
- Open DevTools: `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (macOS)
- Look for `Enhanced Pins:` prefixed console messages

## Code Style

- Use JSDoc comments for functions
- Keep code organized in `#region` blocks
- Use descriptive variable names
- Test with both light and dark Spicetify themes

## Pull Requests

1. Open an issue first to discuss proposed changes
2. Fork and create a feature branch
3. Make your changes
4. Update CHANGELOG.md
5. Submit PR with clear description of changes

## Questions?

Open an issue for any questions or suggestions.
