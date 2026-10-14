# Screenshots — Enhanced Pins

Read by the `spicetify-screenshots` skill. Keep selectors and rects accurate; they are what
makes a capture run mechanical instead of exploratory.

Extension file: `enhanced-pins.js`
Storage keys: `enhanced-pins-data`, `enhanced-pins-config`

## Readiness predicate

```js
document.querySelectorAll('.ep-item').length >= 10
```

## Verification

```
node shoot.mjs verify ".ep-item" --min 10 --within ".ep-section"
```

## Fixtures

`screenshots/fixtures/pins-10.json`: 10 public pins (Spotify editorial playlists and
well-known albums). Records mirror what the "Enhanced Pin" context-menu action writes:
`{ uri, type, name, imageUrl, owner, pinnedAt }`, with metadata from the same lookups as
`fetchItemMetadata`. `enhanced-pins-config` is `null`, so the shot uses the default config.
Never seed from the developer's own pins.

## Capture session

```
node shoot.mjs snapshot --prefix "enhanced-pins-" backup.json
node shoot.mjs restore screenshots/fixtures/pins-10.json
node shoot.mjs viewport 1440 1000
node shoot.mjs reload                 # REQUIRED: pins are read once at boot
node shoot.mjs wait "document.querySelectorAll('.ep-item').length >= 10" 30
```

The library filter chips also filter pins (`FILTER_TYPE_MAP`). If a chip such as
**Playlists** is active, clear it (`click "[data-encore-id=chipClear]"`) so the album pins
show, and re-select it when done.

## Shot list

| Output | Surface | Rect | README caption |
|---|---|---|---|
| `preview.png` | section header + first 6 of 10 pins | `--rect 8,212,420,420 --scale 2` | Marketplace card and README hero |

## Framing notes

- At `viewport 1440 1000` the left panel spans x 8–428 and the pins section starts at y≈214.
  Rows are 64px.
- The native library list starts right below the last pin. Never let a rect run past the
  last `.ep-item`: those rows are the developer's own playlists.

## Restore

```
node shoot.mjs reset-viewport ; node shoot.mjs restore backup.json ; node shoot.mjs reload
```
