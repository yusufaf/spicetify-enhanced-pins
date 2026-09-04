// NAME: Enhanced Pins
// AUTHOR: yusufaf
// x-release-please-start-version
// VERSION: 1.2.0
// x-release-please-end-version
// DESCRIPTION: Bypass Spotify's 4-pin limit with unlimited enhanced pins

(function () {
'use strict';

//#region Type Definitions

/**
 * @typedef {Object} PinnedItem
 * @property {string} uri - Spotify URI (e.g. "spotify:playlist:37i9...")
 * @property {string} type - Entity type from Spicetify.URI.Type
 * @property {string} name - Display name (cached at pin-time)
 * @property {string|null} imageUrl - Artwork URL (cached at pin-time)
 * @property {string} owner - Owner/artist name for subtitle
 * @property {number} pinnedAt - Timestamp when pinned
 */

//#endregion

//#region Constants

/** LocalStorage key for pin data */
const EP_PINS_KEY = 'enhanced-pins-data';

/** Container element ID */
const EP_CONTAINER_ID = 'enhanced-pins-container';

/** Style element ID */
const EP_STYLE_ID = 'ep-main-styles';

/** Sidebar nav bar selector */
const SEL_NAV_BAR = '.Root__nav-bar';

/** URI types that can be pinned */
const PINNABLE_TYPES = new Set([
  'playlist',
  'playlist-v2',
  'album',
  'show',
  'collection'
]);

/** Map URI type to Spotify navigation path */
const TYPE_PATH_MAP = {
  'playlist': '/playlist/',
  'playlist-v2': '/playlist/',
  'album': '/album/',
  'show': '/show/',
  'collection': '/collection/'
};

/** Map URI type to human-readable label */
const TYPE_LABEL_MAP = {
  'playlist': 'Playlist',
  'playlist-v2': 'Playlist',
  'album': 'Album',
  'show': 'Podcast',
  'collection': 'Playlist'
};

/**
 * Maps sidebar filter chip labels (lowercase) to a predicate deciding whether
 * a pin belongs under that chip. Plain Set-of-types isn't enough because
 * pseudo-playlists (URI type `collection`) split across chips depending on
 * category: Local Files and Liked Songs are Playlists-only, but Your
 * Episodes shows under both Playlists and Podcasts in Spotify's own UI.
 * Real audiobooks and podcasts both use URI type `show` with no further
 * signal on the URI, so the Audiobooks and Podcasts chips are unavoidably
 * conflated here — a pre-existing limitation, not introduced by this map.
 */
const FILTER_TYPE_MAP = {
  'playlists': pin => pin.type === 'playlist' || pin.type === 'playlist-v2' || pin.type === 'collection',
  'albums': pin => pin.type === 'album',
  'podcasts': pin => pin.type === 'show' || getPseudoCategory(pin) === 'your-episodes',
  'podcasts & shows': pin => pin.type === 'show' || getPseudoCategory(pin) === 'your-episodes',
  'audiobooks': pin => pin.type === 'show',
};

/**
 * Spotify's auto-generated library entries. URI type `collection`, identified
 * by category (e.g. "spotify:collection:local-files") rather than a base62 id,
 * so they need their own name/label lookup instead of the normal metadata fetch.
 */
const PSEUDO_COLLECTIONS = {
  'tracks': { localeKey: 'sidebar.liked_songs', name: 'Liked Songs', label: 'Playlist', icon: 'heart' },
  'your-episodes': { localeKey: 'sidebar.your_episodes', name: 'Your Episodes', label: 'Podcast', icon: 'bookmark' },
  'local-files': { localeKey: 'local-files', name: 'Local Files', label: 'Local Files', icon: 'folder' },
};

/** Spotify's native pin icon SVG path */
const PIN_SVG_PATH = 'M8.822.797a2.72 2.72 0 0 1 3.847 0l2.534 2.533a2.72 2.72 0 0 1 0 3.848l-3.678 3.678-1.337 4.988-4.486-4.486L1.28 15.78a.75.75 0 0 1-1.06-1.06l4.422-4.422L.156 5.812l4.987-1.337z';

/** Spotify play icon (24x24 viewBox) */
const PLAY_SVG_PATH = 'm7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606';

/** Spotify pause icon (24x24 viewBox) */
const PAUSE_SVG_PATH = 'M5.7 3a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7zm10 0a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7z';

/** Spotify speaker/volume icon paths (16x16 viewBox, two paths) */
const SPEAKER_SVG_PATH_1 = 'M10.016 1.125A.75.75 0 0 0 8.99.85l-6.925 4a3.64 3.64 0 0 0 0 6.299l6.925 4a.75.75 0 0 0 1.125-.65v-13a.75.75 0 0 0-.1-.375zM11.5 5.56a2.75 2.75 0 0 1 0 4.88z';
const SPEAKER_SVG_PATH_2 = 'M16 8a5.75 5.75 0 0 1-4.5 5.614v-1.55a4.252 4.252 0 0 0 0-8.127v-1.55A5.75 5.75 0 0 1 16 8';

/** Bootstrap Icons bookmark-fill / folder-fill paths (16x16 viewBox), used as artwork placeholders for pseudo-playlist pins */
const BOOKMARK_SVG_PATH = 'M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5z';
const FOLDER_SVG_PATH = 'M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.638 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3M2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z';

/** Gear/settings icon SVG path (16x16 viewBox, Bootstrap Icons gear-fill) */
const GEAR_SVG_PATH = 'M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z';

/** GitHub mark icon SVG path (16x16 viewBox, Bootstrap Icons github, same source as GEAR_SVG_PATH) */
const GITHUB_SVG_PATH = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z';

/**
 * Selectable pin marker icons. Each entry's `body` is trusted inner-SVG markup
 * (authored here, never user input) rendered inside a 16x16 viewBox.
 * The first entry (`pushpin`) is the historical default and reuses PIN_SVG_PATH.
 * Goofy faces (emoji-*) are included; further personalization is via emoji input.
 * SVG paths sourced from Bootstrap Icons (MIT), same source as GEAR_SVG_PATH.
 * @type {{key: string, label: string, body: string}[]}
 */
const EP_ICON_PRESETS = [
  { key: 'pushpin', label: 'Pushpin', body: `<path d="${PIN_SVG_PATH}"/>` },
  { key: 'star', label: 'Star', body: '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>' },
  { key: 'heart', label: 'Heart', body: '<path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>' },
  { key: 'lightning', label: 'Lightning', body: '<path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>' },
  { key: 'fire', label: 'Fire', body: '<path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16m0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15"/>' },
  { key: 'gem', label: 'Gem', body: '<path d="M3.1.7a.5.5 0 0 1 .4-.2h9a.5.5 0 0 1 .4.2l2.976 3.974c.149.185.156.45.01.644L8.4 15.3a.5.5 0 0 1-.8 0L.114 5.318a.53.53 0 0 1 .01-.644zm11.386 3.785-1.806-2.41-.776 2.413zm-3.633.004.961-2.989H4.186l.963 2.995zM5.47 5.495 8 13.366l2.532-7.876zm-1.371-.999-.78-2.422-1.818 2.425zM1.499 5.5l5.113 6.817-2.192-6.82zm7.889 6.817 5.123-6.83-2.928.002z"/>' },
  { key: 'smile', label: 'Smiley', body: '<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M4.285 9.567a.5.5 0 0 1 .683.183A3.5 3.5 0 0 0 8 11.5a3.5 3.5 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5"/>' },
  { key: 'sunglasses', label: 'Cool', body: '<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M4.285 9.567a.5.5 0 0 1 .683.183A3.5 3.5 0 0 0 8 11.5a3.5 3.5 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683M2.31 5.243A1 1 0 0 1 3.28 4H6a1 1 0 0 1 1 1v.116A4.2 4.2 0 0 1 8 5c.35 0 .69.04 1 .116V5a1 1 0 0 1 1-1h2.72a1 1 0 0 1 .97 1.243l-.311 1.242A2 2 0 0 1 11.439 8H11a2 2 0 0 1-1.994-1.839A3 3 0 0 0 8 6c-.393 0-.74.064-1.006.161A2 2 0 0 1 5 8h-.438a2 2 0 0 1-1.94-1.515z"/>' },
];

/** Default icon used by pins without a per-pin override */
const EP_DEFAULT_ICON = { kind: 'preset', value: 'pushpin' };

/**
 * Returns the preset entry for a key, falling back to the pushpin default for
 * unknown keys (e.g. presets removed across versions, corrupt storage).
 * @param {string} key
 * @returns {{key: string, label: string, body: string}}
 */
function getPresetIcon(key) {
  return EP_ICON_PRESETS.find(p => p.key === key) || EP_ICON_PRESETS[0];
}

/**
 * Maps a PSEUDO_COLLECTIONS `icon` key to inner-SVG markup, for the pin's
 * artwork placeholder. Reuses the existing "heart" pin-icon preset rather
 * than duplicating its path.
 */
const PSEUDO_COLLECTION_ICON_BODY = {
  heart: getPresetIcon('heart').body,
  bookmark: `<path d="${BOOKMARK_SVG_PATH}"/>`,
  folder: `<path d="${FOLDER_SVG_PATH}"/>`,
};

/**
 * Normalizes a user-entered emoji string: trims and caps codepoint length so a
 * single glyph (incl. ZWJ sequences like the black cat) survives but long text
 * cannot be injected as an "icon".
 * @param {string} str
 * @returns {string}
 */
function normalizeEmoji(str) {
  return Array.from((str || '').trim()).slice(0, 8).join('');
}

/** LocalStorage key for EP config */
const EP_CONFIG_KEY = 'enhanced-pins-config';

/** Current export schema version */
const EP_EXPORT_SCHEMA_VERSION = 1;

/** Extension version, shown in the settings modal footer. Kept in sync with the VERSION banner by release-please. */
// x-release-please-start-version
const EP_VERSION = '1.2.0';
// x-release-please-end-version

/** GitHub repo slug, used to build the "report an issue" link in the settings modal footer */
const EP_GITHUB_REPO = 'yusufaf/spicetify-enhanced-pins';

/** Default keyboard shortcut bindings. Format: "Modifier+...+Code" using KeyboardEvent.code for layout independence */
const EP_DEFAULT_SHORTCUTS = {
  toggleExpand: 'Alt+KeyE',
  openSettings: 'Alt+KeyS',
  focusFirstPin: 'Alt+Digit1'
};

/** Human-readable labels for shortcut actions (used in settings UI) */
const EP_SHORTCUT_LABELS = {
  toggleExpand: 'Toggle show more / show less',
  openSettings: 'Open Enhanced Pins settings',
  focusFirstPin: 'Focus first pinned item'
};

/** Default configuration */
const EP_DEFAULT_CONFIG = {
  hideFromLibrary: true,
  confirmUnpin: false,
  sortMode: 'custom',
  maxVisiblePins: 0,
  shortcutsEnabled: false,
  shortcuts: { ...EP_DEFAULT_SHORTCUTS },
  defaultIcon: { ...EP_DEFAULT_ICON },
  titleVisible: true,
  titleText: 'Enhanced Pins',
  titleFontSize: 11,
  titleColor: '#b3b3b3'
};

/** View mode constants */
const VIEW_LIST = 'list';
const VIEW_COMPACT = 'compact';
const VIEW_GRID = 'grid';
const VIEW_COMPACT_GRID = 'compact-grid';

//#endregion

//#region State

/** @type {PinnedItem[]} Cached pin list */
let currentPins = [];

/** @type {HTMLStyleElement|null} Dynamic style element for hiding duplicates */
let hideStyleElement = null;

/** @type {string} Cached sidebar view mode */
let cachedViewMode = VIEW_LIST;

/** @type {boolean} Whether the user has expanded a truncated pin list */
let expandedView = false;

//#endregion

//#region Storage

/**
 * Loads pins from LocalStorage
 * @returns {PinnedItem[]}
 */
function loadPins() {
  try {
    const stored = Spicetify.LocalStorage.get(EP_PINS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves pins to LocalStorage and updates cache
 * @param {PinnedItem[]} pins
 */
function savePins(pins) {
  Spicetify.LocalStorage.set(EP_PINS_KEY, JSON.stringify(pins));
  currentPins = pins;
}

/**
 * Loads extension config from LocalStorage
 * @returns {Object}
 */
function loadConfig() {
  try {
    const stored = Spicetify.LocalStorage.get(EP_CONFIG_KEY);
    if (stored) return { ...EP_DEFAULT_CONFIG, ...JSON.parse(stored) };
    return { ...EP_DEFAULT_CONFIG };
  } catch {
    return { ...EP_DEFAULT_CONFIG };
  }
}

/**
 * Saves extension config to LocalStorage
 * @param {Object} config
 */
function saveConfig(config) {
  Spicetify.LocalStorage.set(EP_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Returns a sorted copy of pins based on the given sort mode.
 * Does not mutate the original array (preserves storage order for 'custom' drag-and-drop).
 * @param {PinnedItem[]} pins
 * @param {string} mode - 'custom' | 'alphabetical' | 'type' | 'recent'
 * @returns {PinnedItem[]}
 */
function sortPins(pins, mode) {
  if (mode === 'custom' || !mode) return pins;
  const sorted = [...pins];
  switch (mode) {
    case 'alphabetical':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'type': {
      const typeOrder = { playlist: 0, 'playlist-v2': 0, album: 1, show: 2, collection: 3 };
      sorted.sort((a, b) => {
        const diff = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
      break;
    }
    case 'recent':
      sorted.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
      break;
  }
  return sorted;
}

/**
 * Builds a JSON-serializable snapshot of pins + config.
 * @returns {Object}
 */
function exportConfig() {
  return {
    schemaVersion: EP_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    pins: loadPins(),
    config: loadConfig(),
    extensions: {}
  };
}

/**
 * Validates an imported payload. Returns { ok, error, data } where data is the
 * normalized payload (pins + merged config) on success.
 * @param {unknown} raw
 * @returns {{ok: true, data: {pins: PinnedItem[], config: Object}} | {ok: false, error: string}}
 */
function validateImport(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Not a JSON object' };
  if (raw.schemaVersion !== EP_EXPORT_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported schema version: ${raw.schemaVersion}` };
  }
  if (!Array.isArray(raw.pins)) return { ok: false, error: 'Missing pins array' };
  for (const p of raw.pins) {
    if (!p || typeof p.uri !== 'string' || typeof p.type !== 'string' || typeof p.name !== 'string') {
      return { ok: false, error: 'Invalid pin entry' };
    }
  }
  if (raw.config && typeof raw.config !== 'object') return { ok: false, error: 'Invalid config' };
  const mergedConfig = { ...EP_DEFAULT_CONFIG, ...(raw.config || {}) };
  if (raw.config?.shortcuts && typeof raw.config.shortcuts === 'object') {
    mergedConfig.shortcuts = { ...EP_DEFAULT_SHORTCUTS, ...raw.config.shortcuts };
  }
  return { ok: true, data: { pins: raw.pins, config: mergedConfig } };
}

/**
 * Applies a validated import payload to storage, replacing current pins/config.
 * @param {{pins: PinnedItem[], config: Object}} data
 */
function importConfig(data) {
  savePins(data.pins);
  saveConfig(data.config);
}

//#endregion

//#region Metadata

/**
 * Fetches metadata for a Spotify URI using multiple fallback strategies
 * @param {string} uri - Spotify URI
 * @returns {Promise<{name: string, imageUrl: string|null, owner: string}>}
 */
async function fetchItemMetadata(uri) {
  const uriObj = Spicetify.URI.fromString(uri);
  const id = uriObj.id || uriObj._base62Id;
  const type = uriObj.type;

  const fallback = { name: 'Unknown', imageUrl: null, owner: '' };

  // Playlists
  if (type === 'playlist' || type === 'playlist-v2') {
    try {
      if (Spicetify.Platform?.PlaylistAPI?.getMetadata) {
        const meta = await Spicetify.Platform.PlaylistAPI.getMetadata(uri);
        if (meta?.name) return {
          name: meta.name,
          imageUrl: meta.images?.[0]?.url || null,
          owner: meta.owner?.name || ''
        };
      }
    } catch (e) {
      console.warn('[Enhanced Pins] PlaylistAPI fallback', e);
    }

    try {
      const res = await Spicetify.CosmosAsync.get(`sp://core-playlist/v1/playlist/${uri}`);
      if (res?.playlist?.name) return {
        name: res.playlist.name,
        imageUrl: res.playlist.image?.[0]?.url || null,
        owner: res.playlist.ownerName || ''
      };
    } catch (e) {
      console.warn('[Enhanced Pins] CosmosAsync playlist fallback', e);
    }
  }

  // Albums
  if (type === 'album') {
    try {
      const res = await Spicetify.CosmosAsync.get(`wg://album/v1/album-app/album/${id}/desktop`);
      if (res?.name) return {
        name: res.name,
        imageUrl: res.cover?.uri || null,
        owner: res.artists?.[0]?.name || ''
      };
    } catch (e) {
      console.warn('[Enhanced Pins] CosmosAsync album fallback', e);
    }

    try {
      if (Spicetify.GraphQL?.Request && Spicetify.GraphQL?.Definitions?.getAlbum) {
        const res = await Spicetify.GraphQL.Request(
          Spicetify.GraphQL.Definitions.getAlbum,
          { uri, locale: Spicetify.Locale?.getLocale?.() || 'en', limit: 1, offset: 0 }
        );
        if (res?.data?.albumUnion?.name) return {
          name: res.data.albumUnion.name,
          imageUrl: res.data.albumUnion.coverArt?.sources?.[0]?.url || null,
          owner: res.data.albumUnion.artists?.items?.[0]?.profile?.name || ''
        };
      }
    } catch (e) {
      console.warn('[Enhanced Pins] GraphQL album fallback', e);
    }
  }

  // Shows (Podcasts)
  if (type === 'show') {
    try {
      const res = await Spicetify.CosmosAsync.get(`sp://core-show/v1/shows/${id}?responseFormat=protobufJson`);
      const name = res?.header?.showName || res?.name;
      if (name) return {
        name,
        imageUrl: res.header?.coverImage?.url || null,
        owner: res.header?.publisherName || ''
      };
    } catch (e) {
      console.warn('[Enhanced Pins] CosmosAsync show fallback', e);
    }
  }

  // Auto-generated library entries (Liked Songs, Your Episodes, Local Files) -
  // identified by category rather than a base62 id, so no API lookup applies.
  if (type === 'collection') {
    const entry = PSEUDO_COLLECTIONS[uriObj.category];
    if (entry) {
      const localized = Spicetify.Locale?.get?.(entry.localeKey);
      const name = (localized && localized !== entry.localeKey) ? localized : entry.name;
      return { name, imageUrl: null, owner: '' };
    }
  }

  return fallback;
}

/**
 * Refreshes metadata for any pins missing imageUrl or owner (e.g. pinned before these fields existed)
 */
async function refreshStaleMetadata() {
  const pins = loadPins();
  let updated = false;

  for (const pin of pins) {
    if (!pin.imageUrl || !pin.owner || pin.name === 'Unknown') {
      try {
        const metadata = await fetchItemMetadata(pin.uri);
        if (metadata.name !== 'Unknown') pin.name = metadata.name;
        if (metadata.imageUrl) pin.imageUrl = metadata.imageUrl;
        if (metadata.owner) pin.owner = metadata.owner;
        updated = true;
      } catch (e) {
        console.warn(`[Enhanced Pins] Failed to refresh metadata for ${pin.uri}`, e);
      }
    }
  }

  if (updated) {
    savePins(pins);
    renderPins();
  }
}

//#endregion

//#region Context Menu

/**
 * Checks if a URI is a pinnable entity type
 * @param {string} uriString
 * @returns {boolean}
 */
function isPinnable(uriString) {
  try {
    const uriObj = Spicetify.URI.fromString(uriString);
    return PINNABLE_TYPES.has(uriObj.type);
  } catch {
    return false;
  }
}

/**
 * Checks if a URI is already enhanced-pinned
 * @param {string} uri
 * @returns {boolean}
 */
function isAlreadyPinned(uri) {
  return currentPins.some(p => p.uri === uri);
}

/**
 * Unpins an item, optionally showing a confirmation dialog based on config.
 * Shared by both native and custom context menu unpin actions.
 * @param {string} uri
 */
function performUnpin(uri) {
  const pins = loadPins();
  const item = pins.find(p => p.uri === uri);
  if (!item) return;

  const doUnpin = () => {
    let current = loadPins();
    current = current.filter(p => p.uri !== uri);
    savePins(current);
    renderPins();
    Spicetify.showNotification(`Unpinned: ${item.name || 'item'}`);
  };

  const config = loadConfig();
  if (config.confirmUnpin) {
    const content = document.createElement('div');
    content.innerHTML = `
      <div style="padding:8px 0;">
        <p style="color:var(--spice-text);font-size:14px;margin:0 0 16px;">
          Are you sure you want to unpin <strong>${escapeHtml(item.name)}</strong>?
        </p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="ep-delete-cancel">Cancel</button>
          <button class="ep-edit-save">Unpin</button>
        </div>
      </div>`;
    content.querySelector('.ep-delete-cancel').addEventListener('click', () => Spicetify.PopupModal.hide());
    content.querySelector('.ep-edit-save').addEventListener('click', () => {
      doUnpin();
      Spicetify.PopupModal.hide();
    });
    Spicetify.PopupModal.display({ title: 'Confirm unpin', content, isLarge: false });
  } else {
    doUnpin();
  }
}

/**
 * Registers context menu items for pin/unpin
 */
function registerContextMenuItems() {
  const pinItem = new Spicetify.ContextMenu.Item(
    'Enhanced Pin',
    async (uris) => {
      const uri = uris[0];
      const pins = loadPins();

      if (pins.some(p => p.uri === uri)) {
        Spicetify.showNotification('Already pinned', true);
        return;
      }

      const uriObj = Spicetify.URI.fromString(uri);
      const metadata = await fetchItemMetadata(uri);

      pins.push({
        uri,
        type: uriObj.type,
        name: metadata.name,
        imageUrl: metadata.imageUrl,
        owner: metadata.owner,
        pinnedAt: Date.now()
      });

      savePins(pins);
      renderPins();
      Spicetify.showNotification(`Pinned: ${metadata.name}`);
    },
    (uris) => {
      if (uris.length !== 1) return false;
      if (!isPinnable(uris[0])) return false;
      return !isAlreadyPinned(uris[0]);
    },
    'plus2px'
  );

  const unpinItem = new Spicetify.ContextMenu.Item(
    'Enhanced Unpin',
    (uris) => { performUnpin(uris[0]); },
    (uris) => {
      if (uris.length !== 1) return false;
      if (!isPinnable(uris[0])) return false;
      return isAlreadyPinned(uris[0]);
    },
    'minus'
  );

  pinItem.register();
  unpinItem.register();
}

//#endregion

//#region Settings

/**
 * Registers an "Enhanced Pins" entry in the Spotify profile menu so settings
 * remain reachable even when the library sidebar (and its gear icon) is hidden.
 */
function registerMenuItem() {
  if (!Spicetify?.Menu?.Item) return;
  const item = new Spicetify.Menu.Item('Enhanced Pins', false, showSettingsModal);
  item.register();
}

/**
 * Shows the Enhanced Pins settings modal
 */
function showSettingsModal() {
  const config = loadConfig();

  const content = document.createElement('div');
  content.className = 'ep-settings-modal';
  content.innerHTML = `
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Library</h3>
      <div class="ep-toggle-options">
        <label class="ep-toggle-option">
          <input type="checkbox" name="hideFromLibrary" ${config.hideFromLibrary ? 'checked' : ''}>
          <span class="ep-toggle-switch"></span>
          <span class="ep-toggle-label">Hide pinned items from library list</span>
        </label>
      </div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Behavior</h3>
      <div class="ep-toggle-options">
        <label class="ep-toggle-option">
          <input type="checkbox" name="confirmUnpin" ${config.confirmUnpin ? 'checked' : ''}>
          <span class="ep-toggle-switch"></span>
          <span class="ep-toggle-label">Confirm before unpinning</span>
        </label>
      </div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Sorting</h3>
      <div class="ep-toggle-options">
        <label class="ep-toggle-option" style="cursor:default;">
          <span class="ep-toggle-label" style="margin-right:12px;">Sort by</span>
          <select name="sortMode" class="ep-settings-select">
            <option value="custom" ${config.sortMode === 'custom' ? 'selected' : ''}>Custom (manual)</option>
            <option value="alphabetical" ${config.sortMode === 'alphabetical' ? 'selected' : ''}>Alphabetical</option>
            <option value="type" ${config.sortMode === 'type' ? 'selected' : ''}>Type</option>
            <option value="recent" ${config.sortMode === 'recent' ? 'selected' : ''}>Recently pinned</option>
          </select>
        </label>
      </div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Display</h3>
      <div class="ep-toggle-options">
        <label class="ep-toggle-option" style="cursor:default;">
          <span class="ep-toggle-label" style="margin-right:12px;">Max visible pins</span>
          <input type="number" name="maxVisiblePins" class="ep-settings-number"
            value="${config.maxVisiblePins}" min="0" max="100" placeholder="0 = all">
        </label>
      </div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Title</h3>
      <div class="ep-toggle-options">
        <label class="ep-toggle-option">
          <input type="checkbox" name="titleVisible" ${config.titleVisible ? 'checked' : ''}>
          <span class="ep-toggle-switch"></span>
          <span class="ep-toggle-label">Show section title</span>
        </label>
        <label class="ep-toggle-option" style="cursor:default;">
          <span class="ep-toggle-label" style="margin-right:12px;">Title text</span>
          <input type="text" name="titleText" class="ep-settings-text" value="${escapeHtml(config.titleText)}" placeholder="Enhanced Pins" maxlength="60">
        </label>
        <label class="ep-toggle-option" style="cursor:default;">
          <span class="ep-toggle-label" style="margin-right:12px;">Font size</span>
          <input type="number" name="titleFontSize" class="ep-settings-number" value="${config.titleFontSize}" min="8" max="24">
        </label>
        <label class="ep-toggle-option" style="cursor:default;">
          <span class="ep-toggle-label" style="margin-right:12px;">Color</span>
          <input type="color" name="titleColor" class="ep-settings-color" value="${config.titleColor}">
        </label>
      </div>
      <div class="ep-toggle-options" style="flex-direction:row;gap:8px;margin-top:8px;">
        <button type="button" class="ep-settings-btn ep-btn-secondary" data-action="reset-title">Reset title settings</button>
      </div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Pin Icon</h3>
      <p class="ep-settings-hint">Default marker shown next to each pin. Override per-pin from a pin's right-click menu.</p>
      <div class="ep-default-icon-mount"></div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Keyboard Shortcuts</h3>
      <div class="ep-toggle-options">
        <label class="ep-toggle-option">
          <input type="checkbox" name="shortcutsEnabled" ${config.shortcutsEnabled ? 'checked' : ''}>
          <span class="ep-toggle-switch"></span>
          <span class="ep-toggle-label">Enable keyboard shortcuts</span>
        </label>
      </div>
      <div class="ep-shortcut-bindings" style="display:${config.shortcutsEnabled ? 'flex' : 'none'};flex-direction:column;gap:8px;margin-top:12px;">
        ${Object.keys(EP_DEFAULT_SHORTCUTS).map(action => `
          <div class="ep-shortcut-row" style="display:flex;align-items:center;gap:12px;">
            <span style="flex:1;">${EP_SHORTCUT_LABELS[action]}</span>
            <button type="button" class="ep-settings-btn ep-btn-secondary ep-shortcut-record" data-action-key="${action}">
              ${escapeHtml(config.shortcuts[action] || '(none)')}
            </button>
            <button type="button" class="ep-settings-btn ep-btn-secondary ep-shortcut-clear" data-action-key="${action}" title="Clear binding">×</button>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="ep-settings-section">
      <h3 class="ep-settings-title">Data</h3>
      <div class="ep-toggle-options" style="flex-direction:row;gap:8px;flex-wrap:wrap;">
        <button type="button" class="ep-settings-btn" data-action="export">Export pins &amp; config (JSON)</button>
        <button type="button" class="ep-settings-btn ep-btn-secondary" data-action="import">Import from JSON…</button>
        <input type="file" class="ep-import-file" accept="application/json,.json" style="display:none;">
      </div>
    </div>
    <div class="ep-settings-footer">
      <span class="ep-settings-version">v${EP_VERSION}</span>
      <a class="ep-settings-github-link" href="https://github.com/${EP_GITHUB_REPO}/issues/new" target="_blank" rel="noopener noreferrer" title="Report an issue on GitHub">
        <svg viewBox="0 0 16 16" class="ep-settings-icon"><path d="${GITHUB_SVG_PATH}"/></svg>
      </a>
    </div>
  `;

  const checkboxes = content.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.checked;
      saveConfig(newConfig);
      if (e.target.name === 'hideFromLibrary') {
        updateHideStyles();
      }
      if (e.target.name === 'shortcutsEnabled') {
        const panel = content.querySelector('.ep-shortcut-bindings');
        if (panel) panel.style.display = e.target.checked ? 'flex' : 'none';
      }
      if (e.target.name === 'titleVisible') {
        renderPins();
      }
    });
  });

  content.querySelectorAll('input[type="text"][name]').forEach(input => {
    input.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.value.slice(0, 60);
      saveConfig(newConfig);
      renderPins();
    });
  });

  content.querySelectorAll('input[type="color"]').forEach(input => {
    input.addEventListener('input', () => {
      document.documentElement.style.setProperty('--ep-title-color', input.value);
    });
    input.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.value;
      saveConfig(newConfig);
      applyTitleVars(newConfig);
    });
  });

  content.querySelector('[data-action="reset-title"]')?.addEventListener('click', () => {
    const newConfig = loadConfig();
    newConfig.titleVisible = EP_DEFAULT_CONFIG.titleVisible;
    newConfig.titleText = EP_DEFAULT_CONFIG.titleText;
    newConfig.titleFontSize = EP_DEFAULT_CONFIG.titleFontSize;
    newConfig.titleColor = EP_DEFAULT_CONFIG.titleColor;
    saveConfig(newConfig);
    content.querySelector('input[name="titleVisible"]').checked = newConfig.titleVisible;
    content.querySelector('input[name="titleText"]').value = newConfig.titleText;
    content.querySelector('input[name="titleFontSize"]').value = newConfig.titleFontSize;
    content.querySelector('input[name="titleColor"]').value = newConfig.titleColor;
    applyTitleVars(newConfig);
    renderPins();
  });

  content.querySelectorAll('.ep-shortcut-record').forEach(btn => {
    btn.addEventListener('click', () => {
      const originalText = btn.textContent;
      btn.textContent = 'Press keys…';
      btn.disabled = true;
      const onKey = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.key === 'Escape') {
          btn.textContent = originalText;
          btn.disabled = false;
          window.removeEventListener('keydown', onKey, true);
          return;
        }
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(ev.key)) return;
        if (!ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.shiftKey) return;
        const parts = [];
        if (ev.ctrlKey) parts.push('Ctrl');
        if (ev.altKey) parts.push('Alt');
        if (ev.shiftKey) parts.push('Shift');
        if (ev.metaKey) parts.push('Meta');
        parts.push(ev.code);
        const binding = parts.join('+');
        const newConfig = loadConfig();
        newConfig.shortcuts = { ...newConfig.shortcuts, [btn.dataset.actionKey]: binding };
        saveConfig(newConfig);
        btn.textContent = binding;
        btn.disabled = false;
        window.removeEventListener('keydown', onKey, true);
      };
      window.addEventListener('keydown', onKey, true);
    });
  });

  content.querySelectorAll('.ep-shortcut-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const newConfig = loadConfig();
      newConfig.shortcuts = { ...newConfig.shortcuts, [btn.dataset.actionKey]: '' };
      saveConfig(newConfig);
      const recordBtn = content.querySelector(`.ep-shortcut-record[data-action-key="${btn.dataset.actionKey}"]`);
      if (recordBtn) recordBtn.textContent = '(none)';
    });
  });

  const exportBtn = content.querySelector('[data-action="export"]');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const payload = exportConfig();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `enhanced-pins-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Spicetify.showNotification('Exported enhanced pins configuration');
    });
  }

  const importBtn = content.querySelector('[data-action="import"]');
  const importFile = content.querySelector('.ep-import-file');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const raw = JSON.parse(text);
        const result = validateImport(raw);
        if (!result.ok) {
          Spicetify.showNotification(`Import failed: ${result.error}`, true);
          return;
        }
        if (!window.confirm(`Import ${result.data.pins.length} pins? This replaces your current pins and settings.`)) {
          importFile.value = '';
          return;
        }
        importConfig(result.data);
        Spicetify.showNotification('Import complete. Reloading…');
        setTimeout(() => location.reload(), 500);
      } catch (err) {
        Spicetify.showNotification(`Import failed: ${err.message}`, true);
      } finally {
        importFile.value = '';
      }
    });
  }

  content.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = e.target.value;
      saveConfig(newConfig);
      renderPins();
    });
  });

  content.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const newConfig = loadConfig();
      newConfig[e.target.name] = Math.max(0, parseInt(e.target.value) || 0);
      saveConfig(newConfig);
      if (e.target.name === 'titleFontSize') {
        applyTitleVars(newConfig);
      } else {
        expandedView = false;
        renderPins();
      }
    });
  });

  const iconMount = content.querySelector('.ep-default-icon-mount');
  if (iconMount) {
    const defaultPicker = buildIconPicker(config.defaultIcon || EP_DEFAULT_ICON, {
      allowDefault: false,
      onChange: (icon) => {
        const newConfig = loadConfig();
        newConfig.defaultIcon = icon || { ...EP_DEFAULT_ICON };
        saveConfig(newConfig);
        renderPins();
      }
    });
    iconMount.appendChild(defaultPicker.el);
  }

  Spicetify.PopupModal.display({
    title: 'Enhanced Pins Settings',
    content: content,
    isLarge: true
  });
}

//#endregion

//#region Sidebar DOM

/**
 * Escapes HTML entities to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Human-readable type label for a pin's subtitle/radio menu, e.g. "Playlist".
 * Pseudo-playlists (Liked Songs, Your Episodes, Local Files) override the
 * generic "collection" label with their own.
 * @param {PinnedItem} pin
 * @returns {string}
 */
function getTypeLabel(pin, pseudoEntry) {
  if (pin.type === 'collection') {
    const entry = pseudoEntry !== undefined ? pseudoEntry : getPseudoCollectionEntry(pin);
    if (entry) return entry.label;
  }
  return TYPE_LABEL_MAP[pin.type] || 'Playlist';
}

/**
 * Returns a collection-type pin's URI category (e.g. "local-files"), or null
 * for non-pseudo-playlist pins.
 * @param {PinnedItem} pin
 * @returns {string|null}
 */
function getPseudoCategory(pin) {
  if (pin.type !== 'collection') return null;
  try {
    return Spicetify.URI.fromString(pin.uri).category || null;
  } catch {
    return null;
  }
}

/**
 * Looks up a pin's PSEUDO_COLLECTIONS entry, if it is one.
 * @param {PinnedItem} pin
 * @returns {{localeKey: string, name: string, label: string, icon: string}|null}
 */
function getPseudoCollectionEntry(pin) {
  const category = getPseudoCategory(pin);
  return category ? (PSEUDO_COLLECTIONS[category] || null) : null;
}

/**
 * Renders the artwork placeholder for a pin. Pseudo-playlists (no image URL)
 * get a distinguishing glyph instead of a blank tile.
 * @param {PinnedItem} pin
 * @param {{icon: string}|null} [pseudoEntry] - precomputed getPseudoCollectionEntry(pin), to avoid re-parsing the URI
 * @returns {string}
 */
function renderArtPlaceholderHTML(pin, pseudoEntry) {
  const entry = pseudoEntry !== undefined ? pseudoEntry : getPseudoCollectionEntry(pin);
  const body = entry && PSEUDO_COLLECTION_ICON_BODY[entry.icon];
  if (body) {
    return `<div class="ep-item-img ep-item-img--placeholder ep-item-img--pseudo">
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${body}</svg>
    </div>`;
  }
  return '<div class="ep-item-img ep-item-img--placeholder"></div>';
}

/**
 * Writes title font-size/color as CSS custom properties so live edits (e.g. dragging
 * the color picker) repaint instantly without rebuilding the pins list.
 * @param {Object} config
 */
function applyTitleVars(config) {
  const root = document.documentElement;
  root.style.setProperty('--ep-title-color', config.titleColor || EP_DEFAULT_CONFIG.titleColor);
  root.style.setProperty('--ep-title-font-size', `${config.titleFontSize || EP_DEFAULT_CONFIG.titleFontSize}px`);
}

/**
 * Resolves the effective icon descriptor for a pin: its own override, else the
 * global default, else the built-in pushpin.
 * @param {PinnedItem} pin
 * @param {Object} config
 * @returns {{kind: string, value: string}}
 */
function resolvePinIcon(pin, config) {
  const icon = pin?.icon || config?.defaultIcon || EP_DEFAULT_ICON;
  if (icon && (icon.kind === 'preset' || icon.kind === 'emoji') && icon.value) return icon;
  return EP_DEFAULT_ICON;
}

/**
 * Renders an icon descriptor as the subtitle marker HTML. Presets use trusted
 * inline SVG; emoji values are escaped.
 * @param {{kind: string, value: string}} icon
 * @returns {string}
 */
function renderPinIconHTML(icon) {
  if (icon.kind === 'emoji') {
    return `<span class="ep-item-pin-icon ep-item-pin-emoji" aria-hidden="true">${escapeHtml(icon.value)}</span>`;
  }
  const preset = getPresetIcon(icon.value);
  return `<svg class="ep-item-pin-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${preset.body}</svg>`;
}

/**
 * Builds a reusable icon picker UI: a grid of preset buttons, an optional
 * "Default" tile, and an emoji input. Selection state lives in the returned
 * `getValue`/`setValue` accessors so callers decide when to commit.
 * @param {{kind: string, value: string}|null} current - current icon, or null for "default"
 * @param {{allowDefault?: boolean, onChange?: (icon: {kind:string,value:string}|null) => void}} [opts]
 * @returns {{el: HTMLElement, getValue: () => ({kind:string,value:string}|null)}}
 */
function buildIconPicker(current, opts = {}) {
  const { allowDefault = false, onChange } = opts;
  let selected = current ? { ...current } : null;

  const el = document.createElement('div');
  el.className = 'ep-icon-picker';

  const grid = document.createElement('div');
  grid.className = 'ep-icon-grid';

  /** @type {HTMLButtonElement[]} */
  const tiles = [];
  const refreshSelected = () => {
    tiles.forEach(t => {
      const isSel =
        (t.dataset.kind === 'default' && selected === null) ||
        (t.dataset.kind === 'preset' && selected?.kind === 'preset' && selected.value === t.dataset.value) ||
        (t.dataset.kind === 'emoji' && selected?.kind === 'emoji');
      t.classList.toggle('ep-icon-selected', isSel);
    });
  };
  const choose = (value) => {
    selected = value;
    refreshSelected();
    onChange?.(selected);
  };

  if (allowDefault) {
    const def = document.createElement('button');
    def.type = 'button';
    def.className = 'ep-icon-option';
    def.dataset.kind = 'default';
    def.title = 'Use global default';
    def.innerHTML = '<span class="ep-icon-default-label">Default</span>';
    def.addEventListener('click', () => choose(null));
    grid.appendChild(def);
    tiles.push(def);
  }

  EP_ICON_PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ep-icon-option';
    btn.dataset.kind = 'preset';
    btn.dataset.value = preset.key;
    btn.title = preset.label;
    btn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${preset.body}</svg>`;
    btn.addEventListener('click', () => choose({ kind: 'preset', value: preset.key }));
    grid.appendChild(btn);
    tiles.push(btn);
  });

  el.appendChild(grid);

  const emojiRow = document.createElement('div');
  emojiRow.className = 'ep-icon-emoji-row';
  emojiRow.innerHTML = `
    <span class="ep-icon-emoji-label">Or use an emoji</span>
    <input type="text" class="ep-icon-emoji-input" maxlength="16" placeholder="😀">`;
  const emojiInput = emojiRow.querySelector('.ep-icon-emoji-input');
  if (selected?.kind === 'emoji') emojiInput.value = selected.value;
  const emojiTile = document.createElement('button');
  emojiTile.type = 'button';
  emojiTile.dataset.kind = 'emoji';
  emojiTile.style.display = 'none';
  tiles.push(emojiTile); // tracked only for selected-state highlighting
  emojiInput.addEventListener('input', () => {
    const val = normalizeEmoji(emojiInput.value);
    if (val) choose({ kind: 'emoji', value: val });
  });
  el.appendChild(emojiRow);

  refreshSelected();

  return { el, getValue: () => selected };
}

/**
 * Opens a modal to set a per-pin icon override. Saving with "Default" selected
 * removes the override so the pin follows the global default.
 * @param {PinnedItem} pin
 */
function showIconPickerModal(pin) {
  const picker = buildIconPicker(pin.icon || null, { allowDefault: true });

  const content = document.createElement('div');
  content.className = 'ep-icon-modal';
  content.appendChild(picker.el);

  const actions = document.createElement('div');
  actions.className = 'ep-icon-actions';
  actions.innerHTML = `
    <button type="button" class="ep-delete-cancel">Cancel</button>
    <button type="button" class="ep-edit-save">Save</button>`;
  actions.querySelector('.ep-delete-cancel').addEventListener('click', () => Spicetify.PopupModal.hide());
  actions.querySelector('.ep-edit-save').addEventListener('click', () => {
    const value = picker.getValue();
    const pins = loadPins();
    const target = pins.find(p => p.uri === pin.uri);
    if (target) {
      if (value) target.icon = value;
      else delete target.icon;
      savePins(pins);
      renderPins();
    }
    Spicetify.PopupModal.hide();
  });
  content.appendChild(actions);

  Spicetify.PopupModal.display({ title: `Icon for ${pin.name}`, content, isLarge: false });
}

/**
 * Resolves the in-app route for a URI. Prefers Spicetify's own URI-to-path
 * resolver (handles id-less URIs like "spotify:collection:local-files"),
 * falling back to the id-based path map for older Spicetify versions.
 * @param {string} uri
 * @returns {string}
 */
function pinPath(uri) {
  const uriObj = Spicetify.URI.fromString(uri);
  const path = uriObj.toURLPath?.(true);
  if (path) return path;
  const id = uriObj.id || uriObj._base62Id;
  return (TYPE_PATH_MAP[uriObj.type] || '/playlist/') + id;
}

/**
 * Navigates to a pinned item's page
 * @param {PinnedItem} pin
 */
function navigateToPin(pin) {
  Spicetify.Platform.History.push(pinPath(pin.uri));
}

/**
 * Starts playback of a pinned item (used on double-click)
 * @param {PinnedItem} pin
 */
function playPin(pin) {
  try {
    if (Spicetify.Platform?.PlayerAPI?.play) {
      Spicetify.Platform.PlayerAPI.play({ uri: pin.uri }, {});
    } else if (Spicetify.Player?.playUri) {
      Spicetify.Player.playUri(pin.uri);
    } else {
      navigateToPin(pin);
    }
  } catch (e) {
    console.warn('[Enhanced Pins] Playback fallback to navigation', e);
    navigateToPin(pin);
  }
}

/**
 * Checks if a URI is the current playback context
 * @param {string} uri
 * @returns {boolean}
 */
function isCurrentlyPlaying(uri) {
  return Spicetify.Player?.data?.context?.uri === uri;
}

/**
 * @returns {boolean} True if player is paused
 */
function isPlayerPaused() {
  return Spicetify.Player?.data?.isPaused ?? true;
}

/**
 * Toggles play/pause for a pin. If it's the current context, toggle pause.
 * Otherwise start playing this context.
 * @param {PinnedItem} pin
 */
function togglePlayback(pin) {
  if (isCurrentlyPlaying(pin.uri)) {
    if (isPlayerPaused()) {
      Spicetify.Player.play();
    } else {
      Spicetify.Player.pause();
    }
  } else {
    playPin(pin);
  }
}

/**
 * Updates playing state classes and icons on all enhanced pin items
 */
function updatePlayingStates() {
  const items = document.querySelectorAll('.ep-item');
  items.forEach(item => {
    const uri = item.getAttribute('data-uri');
    const playing = isCurrentlyPlaying(uri);
    const paused = isPlayerPaused();

    item.classList.toggle('ep-playing', playing && !paused);
    item.classList.toggle('ep-paused', playing && paused);

    const overlayPath = item.querySelector('.ep-art-overlay path');
    if (overlayPath) {
      if (playing && !paused) {
        overlayPath.setAttribute('d', PAUSE_SVG_PATH);
      } else {
        overlayPath.setAttribute('d', PLAY_SVG_PATH);
      }
    }

    const title = item.querySelector('.ep-item-title');
    if (title) {
      title.classList.toggle('ep-title-active', playing);
    }
  });
}

/**
 * Finds where to inject the enhanced pins section in the sidebar.
 * Targets inside the library rootlist, between the filter area and the virtualized grid.
 * @returns {{ parent: HTMLElement, reference: Node|null }|null}
 */
function findInjectionPoint() {
  const rootlist = document.querySelector('.main-yourLibraryX-libraryRootlist');
  if (rootlist) {
    // Strategy 1: After the filter bar inside libraryRootlist
    const filter = rootlist.querySelector('.main-yourLibraryX-libraryFilter');
    if (filter && filter.parentElement) {
      return { parent: filter.parentElement, reference: filter.nextElementSibling };
    }

    // Strategy 2: Before the treegrid/grid element
    const gridEl = rootlist.querySelector('[role="treegrid"], [role="grid"]');
    if (gridEl) {
      let wrapper = gridEl;
      while (wrapper.parentElement && wrapper.parentElement !== rootlist) {
        wrapper = wrapper.parentElement;
      }
      return { parent: wrapper.parentElement, reference: wrapper };
    }
  }

  // Strategy 3: Fallback to nav bar
  const navBar = document.querySelector(SEL_NAV_BAR);
  if (navBar) {
    return { parent: navBar, reference: null };
  }

  return null;
}

/**
 * Detects the current sidebar library view mode.
 * Primary: reads the combobox aria-label (e.g. "Custom order, Default grid view").
 * Fallback: compares positions of native library items.
 * @returns {string} VIEW_LIST, VIEW_COMPACT, VIEW_GRID, or VIEW_COMPACT_GRID
 */
function detectViewMode() {
  // Strategy 1: Parse the view mode from the sort/view combobox aria-label
  const combobox = document.querySelector('.main-yourLibraryX-libraryFilter [role="combobox"]');
  if (combobox) {
    const label = (combobox.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('compact') && label.includes('grid')) {
      cachedViewMode = VIEW_COMPACT_GRID;
      return cachedViewMode;
    }
    if (label.includes('grid')) {
      cachedViewMode = VIEW_GRID;
      return cachedViewMode;
    }
    if (label.includes('compact')) {
      cachedViewMode = VIEW_COMPACT;
      return cachedViewMode;
    }
    if (label.includes('list')) {
      cachedViewMode = VIEW_LIST;
      return cachedViewMode;
    }
  }

  // Strategy 2: Position-based fallback using native library items
  const rootlist = document.querySelector('.main-yourLibraryX-libraryRootlist');
  if (!rootlist) return cachedViewMode;

  const allItems = rootlist.querySelectorAll('li[role="row"]');
  const items = [...allItems].filter(el => !el.closest('#' + EP_CONTAINER_ID));
  if (items.length < 2) return cachedViewMode;

  const r0 = items[0].getBoundingClientRect();
  const r1 = items[1].getBoundingClientRect();
  if (r0.height === 0 || r1.height === 0) return cachedViewMode;

  // Grid: items on the same row
  if (Math.abs(r0.top - r1.top) < 10) {
    let cols = 1;
    for (let i = 1; i < Math.min(items.length, 6); i++) {
      if (Math.abs(items[i].getBoundingClientRect().top - r0.top) < 10) cols++;
      else break;
    }
    cachedViewMode = cols >= 3 ? VIEW_COMPACT_GRID : VIEW_GRID;
    return cachedViewMode;
  }

  // Compact list: native items have no artwork images
  if (!items[0].querySelector('img')) {
    cachedViewMode = VIEW_COMPACT;
    return cachedViewMode;
  }

  cachedViewMode = VIEW_LIST;
  return cachedViewMode;
}

/**
 * Detects the active entity type filter from sidebar filter chips.
 * When the user selects a filter like "Audiobooks" or "Playlists", only
 * enhanced pins matching that chip should be shown.
 * @returns {{key: string, matches: (pin: PinnedItem) => boolean}|null} the active chip's
 *   label (as a stable cache key) and its match predicate, or null if no type filter active
 */
function getActiveTypeFilter() {
  // Filter chips are Encore LegacyChip components inside the sidebar nav bar,
  // within a listbox[aria-label="Filter options"].
  // When a type filter is active, Spotify re-renders the chip bar:
  //   - All non-matching type chips are removed
  //   - Only the active type chip + sub-filter chips (e.g. "Unplayed") remain
  //   - An X/clear button appears
  // Detection: if exactly 1 type-matching chip is present (normally 4+), it's the active filter.
  const navBar = document.querySelector(SEL_NAV_BAR);
  if (!navBar) return null;

  const chips = navBar.querySelectorAll('[data-encore-id="chip"]');
  if (chips.length === 0) return null;

  // Strategy 1: Check for explicitly active chips via aria-checked
  for (const chip of chips) {
    if (chip.getAttribute('aria-checked') === 'true') {
      const label = (chip.getAttribute('aria-label') || '').toLowerCase();
      if (FILTER_TYPE_MAP[label]) return { key: label, matches: FILTER_TYPE_MAP[label] };
    }
  }

  // Strategy 2: Count type-matching chips. When unfiltered, multiple type chips
  // are visible (Playlists, Podcasts, Audiobooks, Albums, etc.). When a type
  // filter is active, only that single type chip remains.
  const typeChips = [];
  for (const chip of chips) {
    const label = (chip.getAttribute('aria-label') || '').toLowerCase();
    if (FILTER_TYPE_MAP[label]) typeChips.push(label);
  }

  if (typeChips.length === 1) {
    return { key: typeChips[0], matches: FILTER_TYPE_MAP[typeChips[0]] };
  }

  return null;
}

/** @type {string|null} URI of the pin targeted by the context menu */
let ctxMenuTargetUri = null;

/**
 * Converts a Spotify URI to an open.spotify.com URL
 * @param {string} uri
 * @returns {string}
 */
function uriToUrl(uri) {
  try {
    const uriObj = Spicetify.URI.fromString(uri);
    const url = uriObj.toURL?.();
    if (url) return url;
    const type = uriObj.type === 'playlist-v2' ? 'playlist' : uriObj.type;
    const id = uriObj.id || uriObj._base62Id;
    return `https://open.spotify.com/${type}/${id}`;
  } catch {
    return uri;
  }
}

/**
 * Creates the reusable custom context menu element on document.body
 */
function createContextMenu() {
  if (document.getElementById('ep-context-menu')) return;

  const menu = document.createElement('div');
  menu.id = 'ep-context-menu';
  menu.className = 'ep-context-menu';
  menu.style.display = 'none';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `<ul>
    <li><button data-action="play" role="menuitem"><span class="ep-ctx-label">Play</span></button></li>
    <li><button data-action="shuffle" role="menuitem"><span class="ep-ctx-label">Shuffle Play</span></button></li>
    <li><button data-action="queue" role="menuitem"><span class="ep-ctx-label">Add to Queue</span></button></li>
    <li><button data-action="jam" role="menuitem"><span class="ep-ctx-label">Start a Jam</span></button></li>
    <li class="ep-ctx-divider ep-ctx-real-entity" role="separator"></li>
    <li class="ep-ctx-real-entity"><button data-action="radio" role="menuitem"><span class="ep-ctx-label">Go to Radio</span></button></li>
    <li class="ep-ctx-divider ep-ctx-owner" role="separator"></li>
    <li class="ep-ctx-owner"><button data-action="edit" role="menuitem"><span class="ep-ctx-label">Edit details</span></button></li>
    <li class="ep-ctx-owner"><button data-action="delete" role="menuitem"><span class="ep-ctx-label">Delete</span></button></li>
    <li class="ep-ctx-divider ep-ctx-real-entity" role="separator"></li>
    <li class="ep-ctx-real-entity"><button data-action="download" role="menuitem"><span class="ep-ctx-label">Download</span></button></li>
    <li class="ep-ctx-divider ep-ctx-owner" role="separator"></li>
    <li class="ep-ctx-owner"><button data-action="visibility" role="menuitem"><span class="ep-ctx-label">Make private</span></button></li>
    <li class="ep-ctx-divider ep-ctx-real-entity" role="separator"></li>
    <li class="ep-ctx-real-entity"><button data-action="native-pin" role="menuitem"><span class="ep-ctx-label">Pin playlist</span></button></li>
    <li><button data-action="pin-to-top" role="menuitem"><span class="ep-ctx-label">Move to top</span></button></li>
    <li><button data-action="pin-to-bottom" role="menuitem"><span class="ep-ctx-label">Move to bottom</span></button></li>
    <li><button data-action="unpin" role="menuitem"><span class="ep-ctx-label">Enhanced Unpin</span></button></li>
    <li><button data-action="change-icon" role="menuitem"><span class="ep-ctx-label">Change icon</span></button></li>
    <li class="ep-ctx-divider" role="separator"></li>
    <li><button data-action="copy-link" role="menuitem"><span class="ep-ctx-label">Copy Link</span></button></li>
    <li><button data-action="copy-uri" role="menuitem"><span class="ep-ctx-label">Copy Spotify URI</span></button></li>
  </ul>`;
  document.body.appendChild(menu);
}

/**
 * Shows the custom context menu at cursor position for a given pin.
 * Async to check playlist ownership and visibility state for dynamic items.
 * @param {MouseEvent} e
 * @param {PinnedItem} pin
 */
async function showContextMenu(e, pin) {
  const menu = document.getElementById('ep-context-menu');
  if (!menu) return;

  ctxMenuTargetUri = pin.uri;

  // Update Play/Pause label
  const playLabel = menu.querySelector('[data-action="play"] .ep-ctx-label');
  if (playLabel) {
    playLabel.textContent = (isCurrentlyPlaying(pin.uri) && !isPlayerPaused()) ? 'Pause' : 'Play';
  }

  // Update radio label based on type
  const radioLabel = menu.querySelector('[data-action="radio"] .ep-ctx-label');
  if (radioLabel) {
    radioLabel.textContent = `Go to ${getTypeLabel(pin)} Radio`;
  }

  // Show "Move to top/bottom" only in custom sort mode
  const ctxConfig = loadConfig();
  const isCustomSort = ctxConfig.sortMode === 'custom';
  menu.querySelectorAll('[data-action="pin-to-top"], [data-action="pin-to-bottom"]').forEach(btn => {
    const li = btn.closest('li');
    if (li) li.style.display = isCustomSort ? '' : 'none';
  });

  // Hide owner-only items by default (shown after async ownership check)
  menu.querySelectorAll('.ep-ctx-owner').forEach(el => { el.style.display = 'none'; });

  // Pseudo-playlists (Liked Songs, Your Episodes, Local Files) have no radio
  // station, no offline download, and can't be native-pinned or (for Local
  // Files specifically) linked to a public page.
  const isPseudoCollection = pin.type === 'collection';
  menu.querySelectorAll('.ep-ctx-real-entity').forEach(el => { el.style.display = isPseudoCollection ? 'none' : ''; });
  const copyLinkLi = menu.querySelector('[data-action="copy-link"]')?.closest('li');
  if (copyLinkLi) {
    const uriObj = Spicetify.URI.fromString(pin.uri);
    copyLinkLi.style.display = (isPseudoCollection && uriObj.category === 'local-files') ? 'none' : '';
  }

  // Show and measure for viewport clamping
  menu.style.display = 'block';
  const rect = menu.getBoundingClientRect();
  let x = e.clientX;
  let y = e.clientY;
  if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
  if (x < 0) x = 4;
  if (y < 0) y = 4;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const firstBtn = menu.querySelector('[data-action]');
  if (firstBtn) firstBtn.focus();

  // Async: check ownership for playlist-specific actions
  const isPlaylist = pin.type === 'playlist' || pin.type === 'playlist-v2';
  if (isPlaylist) {
    try {
      const meta = await Spicetify.Platform.PlaylistAPI.getMetadata(pin.uri);
      const username = Spicetify.Platform.username;
      const isOwner = meta?.owner?.uri === `spotify:user:${username}`;

      // Only update if this menu is still open for the same pin
      if (ctxMenuTargetUri === pin.uri && isOwner) {
        menu.querySelectorAll('.ep-ctx-owner').forEach(el => { el.style.display = ''; });

        // Update visibility label
        const visLabel = menu.querySelector('[data-action="visibility"] .ep-ctx-label');
        if (visLabel) {
          visLabel.textContent = meta?.isPublished ? 'Make private' : 'Make public';
        }

        // Re-measure and re-clamp after showing more items
        const newRect = menu.getBoundingClientRect();
        if (parseInt(menu.style.top) + newRect.height > window.innerHeight) {
          menu.style.top = Math.max(4, window.innerHeight - newRect.height - 4) + 'px';
        }
      }
    } catch {}
  }
}

/**
 * Hides the custom context menu and clears target state
 */
function hideContextMenu() {
  const menu = document.getElementById('ep-context-menu');
  if (menu) menu.style.display = 'none';
  ctxMenuTargetUri = null;
}

/**
 * Sets up delegated click handler on the context menu for all actions
 */
function setupContextMenuActions() {
  const menu = document.getElementById('ep-context-menu');
  if (!menu) return;

  menu.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !ctxMenuTargetUri) return;

    const action = btn.dataset.action;
    const pin = currentPins.find(p => p.uri === ctxMenuTargetUri);
    if (!pin && action !== 'settings') return;

    switch (action) {
      case 'play':
        togglePlayback(pin);
        break;

      case 'shuffle':
        try {
          Spicetify.Player.setShuffle(true);
          playPin(pin);
        } catch (err) {
          Spicetify.showNotification('Failed to start shuffle', true);
        }
        break;

      case 'queue':
        try {
          Spicetify.Platform.PlayerAPI.addToQueue([{ uri: pin.uri }]);
          Spicetify.showNotification(`Added to queue: ${pin.name}`);
        } catch (err) {
          console.warn('[Enhanced Pins] Add to queue failed', err);
          Spicetify.showNotification('Failed to add to queue', true);
        }
        break;

      case 'jam':
        try {
          if (Spicetify.Platform.SocialConnectAPI?.createSession) {
            await Spicetify.Platform.SocialConnectAPI.createSession();
            Spicetify.showNotification('Jam session started');
          } else {
            Spicetify.showNotification('Jam is not available', true);
          }
        } catch {
          Spicetify.showNotification('Failed to start Jam', true);
        }
        break;

      case 'radio': {
        const uriObj = Spicetify.URI.fromString(pin.uri);
        const id = uriObj.id || uriObj._base62Id;
        const type = uriObj.type === 'playlist-v2' ? 'playlist' : uriObj.type;
        Spicetify.Platform.History.push(`/station/${type}/${id}`);
        break;
      }

      case 'download':
        try {
          if (Spicetify.Platform.OfflineAPI?.addDownload) {
            await Spicetify.Platform.OfflineAPI.addDownload(pin.uri);
            Spicetify.showNotification(`Downloading: ${pin.name}`);
          } else {
            Spicetify.showNotification('Download is not available', true);
          }
        } catch {
          Spicetify.showNotification('Failed to start download', true);
        }
        break;

      case 'edit': {
        hideContextMenu();
        try {
          const meta = await Spicetify.Platform.PlaylistAPI.getMetadata(pin.uri);
          const uriObj2 = Spicetify.URI.fromString(pin.uri);
          const playlistId = uriObj2.id || uriObj2._base62Id;
          const currentImage = meta?.images?.[0]?.url || pin.imageUrl || '';
          let newImageBase64 = null;

          const content = document.createElement('div');
          content.className = 'ep-edit-modal';
          content.innerHTML = `
            <div style="display:flex;gap:16px;padding:8px 0;">
              <div class="ep-edit-image-section">
                <div class="ep-edit-image-wrapper" title="Click to change image">
                  ${currentImage
                    ? `<img class="ep-edit-img-preview" src="${escapeHtml(currentImage)}" alt="">`
                    : '<div class="ep-edit-img-preview ep-edit-img-placeholder"></div>'}
                  <div class="ep-edit-img-overlay">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M17.318 1.975a3.329 3.329 0 1 1 4.707 4.707L8.451 20.256c-.49.49-1.1.867-1.767 1.109l-4.45 1.527a.75.75 0 0 1-.94-.94l1.519-4.431c.247-.676.63-1.292 1.126-1.794zm3.646 1.061a1.829 1.829 0 0 0-2.586 0L4.804 16.61a3.5 3.5 0 0 0-.764 1.216l-.95 2.769 2.789-.955a3.5 3.5 0 0 0 1.2-.752z"></path></svg>
                    <span>Choose photo</span>
                  </div>
                </div>
                <input type="file" class="ep-edit-file-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;">
              </div>
              <div style="flex:1;display:flex;flex-direction:column;gap:12px;min-width:0;">
                <input type="text" class="ep-edit-input" value="${escapeHtml(meta?.name || pin.name)}" placeholder="Add a name">
                <textarea class="ep-edit-input ep-edit-textarea" rows="4" placeholder="Add an optional description">${escapeHtml(meta?.description || '')}</textarea>
                <button class="ep-edit-save">Save</button>
              </div>
            </div>
            <p class="ep-edit-disclaimer">By proceeding, you agree to give Spotify access to the image you choose to upload. Please make sure you have the right to upload the image.</p>`;

          // Image picker
          const imgWrapper = content.querySelector('.ep-edit-image-wrapper');
          const fileInput = content.querySelector('.ep-edit-file-input');
          imgWrapper.addEventListener('click', () => fileInput.click());

          fileInput.addEventListener('change', (evt) => {
            const file = evt.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 512;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                newImageBase64 = dataUrl.split(',')[1];
                let preview = content.querySelector('.ep-edit-img-preview');
                if (preview.tagName !== 'IMG') {
                  const newImg = document.createElement('img');
                  newImg.className = 'ep-edit-img-preview';
                  newImg.alt = '';
                  preview.replaceWith(newImg);
                  preview = newImg;
                }
                preview.src = dataUrl;
              };
              img.src = re.target.result;
            };
            reader.readAsDataURL(file);
          });

          content.querySelector('.ep-edit-save').addEventListener('click', async () => {
            const name = content.querySelector('input[type="text"]').value.trim();
            const desc = content.querySelector('textarea').value;
            if (!name) { Spicetify.showNotification('Name cannot be empty', true); return; }
            try {
              await Spicetify.Platform.PlaylistAPI.updateDetails(pin.uri, { name, description: desc });

              if (newImageBase64) {
                let imageUploaded = false;
                try {
                  const token = Spicetify.Platform?.Session?.accessToken;
                  if (token) {
                    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
                      method: 'PUT',
                      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'image/jpeg' },
                      body: newImageBase64
                    });
                    imageUploaded = res.ok || res.status === 202;
                  }
                } catch (imgErr) {
                  console.warn('[Enhanced Pins] Image upload failed', imgErr);
                }
                if (!imageUploaded) {
                  Spicetify.showNotification('Name saved but image upload failed', true);
                }
              }

              const allPins = loadPins();
              const p = allPins.find(pp => pp.uri === pin.uri);
              if (p) {
                p.name = name;
                if (newImageBase64) {
                  try {
                    const newMeta = await Spicetify.Platform.PlaylistAPI.getMetadata(pin.uri);
                    if (newMeta?.images?.[0]?.url) p.imageUrl = newMeta.images[0].url;
                  } catch {}
                }
                savePins(allPins);
                renderPins();
              }
              Spicetify.PopupModal.hide();
              Spicetify.showNotification('Playlist updated');
            } catch {
              Spicetify.showNotification('Failed to update playlist', true);
            }
          });

          Spicetify.PopupModal.display({ title: 'Edit details', content, isLarge: false });
        } catch {
          Spicetify.showNotification('Failed to load playlist details', true);
        }
        return; // Already hid context menu above
      }

      case 'delete': {
        hideContextMenu();
        const content = document.createElement('div');
        content.innerHTML = `
          <div style="padding:8px 0;">
            <p style="color:var(--spice-text);font-size:14px;margin:0 0 16px;">
              Are you sure you want to delete <strong>${escapeHtml(pin.name)}</strong>? This cannot be undone.
            </p>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button class="ep-delete-cancel">Cancel</button>
              <button class="ep-delete-confirm">Delete</button>
            </div>
          </div>`;

        content.querySelector('.ep-delete-cancel').addEventListener('click', () => Spicetify.PopupModal.hide());
        content.querySelector('.ep-delete-confirm').addEventListener('click', async () => {
          try {
            await Spicetify.Platform.RootlistAPI.remove([{ uri: pin.uri }]);
            let pins = loadPins();
            pins = pins.filter(p => p.uri !== pin.uri);
            savePins(pins);
            renderPins();
            Spicetify.PopupModal.hide();
            Spicetify.showNotification(`Deleted: ${pin.name}`);
          } catch {
            Spicetify.showNotification('Failed to delete playlist', true);
          }
        });

        Spicetify.PopupModal.display({ title: 'Delete playlist', content, isLarge: false });
        return;
      }

      case 'visibility': {
        const label = btn.querySelector('.ep-ctx-label')?.textContent;
        const makingPrivate = label === 'Make private';
        try {
          await Spicetify.Platform.PlaylistPermissionsAPI.setBasePermission(
            pin.uri,
            makingPrivate ? 'BLOCKED' : 'VIEWER'
          );
          Spicetify.showNotification(makingPrivate ? 'Playlist is now private' : 'Playlist is now public');
        } catch {
          Spicetify.showNotification('Failed to change visibility', true);
        }
        break;
      }

      case 'native-pin':
        try {
          await Spicetify.Platform.LibraryAPI.pin(pin.uri);
          Spicetify.showNotification('Pinned to sidebar');
        } catch {
          Spicetify.showNotification('Failed to pin', true);
        }
        break;

      case 'copy-link':
        navigator.clipboard.writeText(uriToUrl(pin.uri)).then(() => {
          Spicetify.showNotification('Link copied to clipboard');
        }).catch(() => {
          Spicetify.showNotification('Failed to copy link', true);
        });
        break;

      case 'copy-uri':
        navigator.clipboard.writeText(pin.uri).then(() => {
          Spicetify.showNotification('URI copied to clipboard');
        }).catch(() => {
          Spicetify.showNotification('Failed to copy URI', true);
        });
        break;

      case 'unpin':
        performUnpin(pin.uri);
        break;

      case 'change-icon':
        hideContextMenu();
        showIconPickerModal(pin);
        return;

      case 'pin-to-top':
        movePinToEdge(pin.uri, 'top');
        break;

      case 'pin-to-bottom':
        movePinToEdge(pin.uri, 'bottom');
        break;

      case 'settings':
        showSettingsModal();
        break;
    }

    hideContextMenu();
  });
}

/**
 * Sets up dismissal handlers: click-outside, Escape, scroll, and keyboard nav
 */
function setupContextMenuDismissal() {
  document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('ep-context-menu');
    if (menu && menu.style.display !== 'none' && !menu.contains(e.target)) {
      hideContextMenu();
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    const menu = document.getElementById('ep-context-menu');
    if (!menu || menu.style.display === 'none') return;
    if (e.key === 'Escape') hideContextMenu();
  }, true);

  window.addEventListener('scroll', () => {
    const menu = document.getElementById('ep-context-menu');
    if (menu && menu.style.display !== 'none') hideContextMenu();
  }, { capture: true });

  // Keyboard navigation within menu
  const menu = document.getElementById('ep-context-menu');
  if (menu) {
    menu.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const buttons = [...menu.querySelectorAll('[data-action]')];
      const idx = buttons.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        buttons[idx < buttons.length - 1 ? idx + 1 : 0].focus();
      } else {
        buttons[idx > 0 ? idx - 1 : buttons.length - 1].focus();
      }
    });
  }
}

/**
 * Renders the enhanced pins section in the sidebar using vanilla DOM.
 * Each item gets click (navigate), dblclick (play), and contextmenu (custom menu) handlers.
 */
function renderPins() {
  const pins = loadPins();
  currentPins = pins;
  const config = loadConfig();
  applyTitleVars(config);

  const existing = document.getElementById(EP_CONTAINER_ID);
  if (existing) existing.remove();

  if (pins.length === 0) {
    updateHideStyles();
    return;
  }

  // Filter pins based on active sidebar entity type filter
  const activeFilter = getActiveTypeFilter();
  const filteredPins = activeFilter
    ? pins.filter(pin => activeFilter.matches(pin))
    : pins;

  // Sort and truncate
  const sortedPins = sortPins(filteredPins, config.sortMode);
  const maxVisible = config.maxVisiblePins;
  let displayPins = sortedPins;
  let hasMore = false;
  if (maxVisible > 0 && !expandedView && sortedPins.length > maxVisible) {
    displayPins = sortedPins.slice(0, maxVisible);
    hasMore = true;
  }

  const viewMode = detectViewMode();

  const container = document.createElement('div');
  container.id = EP_CONTAINER_ID;
  container.className = `ep-view-${viewMode}`;
  container.dataset.viewMode = viewMode;
  container.dataset.filterKey = activeFilter ? activeFilter.key : '';

  const section = document.createElement('div');
  section.className = 'ep-section';
  section.setAttribute('role', 'list');
  section.setAttribute('aria-label', 'Enhanced Pins');

  // Section header
  const header = document.createElement('div');
  header.className = 'ep-section-header';
  header.innerHTML = `
    <span class="ep-section-label"${config.titleVisible ? '' : ' style="display:none;"'}>${escapeHtml(config.titleText || 'Enhanced Pins')} (${pins.length})</span>
    <button class="ep-settings-gear" title="Enhanced Pins Settings" type="button" draggable="false">
      <svg class="ep-settings-icon" viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd" aria-hidden="true">
        <path d="${GEAR_SVG_PATH}"></path>
      </svg>
    </button>`;
  const gearBtn = header.querySelector('.ep-settings-gear');
  // Defensive event handling: newer Spotify versions attach drag/pointer handlers
  // on the libraryRootlist ancestors that can swallow click events on injected
  // buttons. Stop propagation at the earliest phase so the click reaches us.
  const swallow = (e) => { e.stopPropagation(); };
  gearBtn.addEventListener('pointerdown', swallow);
  gearBtn.addEventListener('mousedown', swallow);
  gearBtn.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
  gearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSettingsModal();
  });
  section.appendChild(header);

  // If no pins match the active filter, show header only (settings gear remains accessible)
  if (filteredPins.length === 0) {
    container.appendChild(section);
    const injection = findInjectionPoint();
    if (!injection) return;
    injection.parent.insertBefore(container, injection.reference);
    updateHideStyles();
    return;
  }

  // Items wrapper for layout control
  const itemsWrapper = document.createElement('div');
  itemsWrapper.className = 'ep-items';

  // Pin items
  const clickTimers = {};

  displayPins.forEach(pin => {
    const pseudoEntry = getPseudoCollectionEntry(pin);
    const typeLabel = getTypeLabel(pin, pseudoEntry);
    const subtitle = pin.owner ? `${typeLabel} \u2022 ${pin.owner}` : typeLabel;

    const item = document.createElement('div');
    item.className = 'ep-item';
    item.setAttribute('data-uri', pin.uri);
    item.setAttribute('role', 'listitem');
    item.setAttribute('title', pin.name);
    item.tabIndex = 0;

    item.innerHTML = `
      <div class="ep-item-art">
        ${pin.imageUrl
          ? `<img class="ep-item-img" src="${escapeHtml(pin.imageUrl)}" alt="" draggable="false" loading="lazy">`
          : renderArtPlaceholderHTML(pin, pseudoEntry)}
        <button class="ep-art-overlay" aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="${PLAY_SVG_PATH}"></path></svg>
        </button>
      </div>
      <div class="ep-item-text">
        <p class="ep-item-title">${escapeHtml(pin.name)}</p>
        <p class="ep-item-subtitle">
          ${renderPinIconHTML(resolvePinIcon(pin, config))}
          <span class="ep-subtitle-full">${escapeHtml(subtitle)}</span>
          <span class="ep-subtitle-short">${escapeHtml(pin.owner || typeLabel)}</span>
        </p>
      </div>
      <div class="ep-playing-indicator">
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="${SPEAKER_SVG_PATH_1}"></path>
          <path d="${SPEAKER_SVG_PATH_2}"></path>
        </svg>
      </div>`;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.ep-art-overlay')) return;
      if (clickTimers[pin.uri]) return;
      clickTimers[pin.uri] = setTimeout(() => {
        delete clickTimers[pin.uri];
        navigateToPin(pin);
      }, 300);
    });

    item.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (clickTimers[pin.uri]) {
        clearTimeout(clickTimers[pin.uri]);
        delete clickTimers[pin.uri];
      }
      playPin(pin);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateToPin(pin); }
    });

    item.querySelector('.ep-art-overlay').addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlayback(pin);
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e, pin);
    });

    // Drag source for reordering (only in custom sort mode)
    if (config.sortMode === 'custom') {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
    }

    // Drop target for pin reorder (element-level; external drops handled at document level)
    if (config.sortMode === 'custom') {
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragleave', handleDragLeave);
    }

    itemsWrapper.appendChild(item);
  });

  // "N more" / "Show less" toggle for max visible pins
  if (hasMore) {
    const moreLink = document.createElement('button');
    moreLink.className = 'ep-show-more';
    moreLink.textContent = `${sortedPins.length - maxVisible} more`;
    moreLink.addEventListener('click', () => { expandedView = true; renderPins(); });
    itemsWrapper.appendChild(moreLink);
  } else if (maxVisible > 0 && expandedView && sortedPins.length > maxVisible) {
    const lessLink = document.createElement('button');
    lessLink.className = 'ep-show-more';
    lessLink.textContent = 'Show less';
    lessLink.addEventListener('click', () => { expandedView = false; renderPins(); });
    itemsWrapper.appendChild(lessLink);
  }

  section.appendChild(itemsWrapper);
  container.appendChild(section);

  const injection = findInjectionPoint();
  if (!injection) return;
  injection.parent.insertBefore(container, injection.reference);

  updateHideStyles();
  updatePlayingStates();
}

/**
 * Updates a dynamic <style> element that hides enhanced-pinned items from the native library list.
 * Uses CSS :has() to target rows containing elements with IDs matching our pinned URIs.
 */
function updateHideStyles() {
  if (!hideStyleElement) {
    hideStyleElement = document.createElement('style');
    hideStyleElement.id = 'ep-hide-duplicates';
    document.head.appendChild(hideStyleElement);
  }

  const config = loadConfig();
  if (currentPins.length === 0 || !config.hideFromLibrary) {
    hideStyleElement.textContent = '';
    return;
  }

  const rules = currentPins.map(pin => {
    const escapedUri = CSS.escape(`listrow-title-${pin.uri}`);
    return `.main-yourLibraryX-listItem:has(#${escapedUri})`;
  });

  hideStyleElement.textContent = `${rules.join(',\n')} { display: none !important; }`;
}

//#endregion

//#region Drag and Drop

/** @type {{uri: string}|null} Active drag session state (non-null = internal pin reorder) */
let dragState = null;

/** CSS classes used for drag indicators */
const DRAG_INDICATOR_CLASSES = ['ep-drag-over-top', 'ep-drag-over-bottom', 'ep-drag-over-left', 'ep-drag-over-right', 'ep-drop-target'];

function clearDragIndicators() {
  document.querySelectorAll('.' + DRAG_INDICATOR_CLASSES.join(', .'))
    .forEach(el => DRAG_INDICATOR_CLASSES.forEach(c => el.classList.remove(c)));
}

/**
 * Checks if the target pin is a playlist that can accept track drops
 * @param {string} uri
 * @returns {boolean}
 */
function isPlaylistPin(uri) {
  const pin = currentPins.find(p => p.uri === uri);
  return pin && (pin.type === 'playlist' || pin.type === 'playlist-v2');
}

/**
 * Extracts Spotify URIs from drag event dataTransfer.
 * Tries multiple formats since Spotify may use different data types.
 * @param {DragEvent} e
 * @returns {string[]}
 */
function extractDroppedUris(e) {
  const uris = [];

  // Try all available data types
  for (const type of e.dataTransfer.types) {
    const data = e.dataTransfer.getData(type);
    if (!data) continue;

    // Check for spotify URIs in the data
    const uriMatches = data.match(/spotify:(track|episode|album|playlist):[a-zA-Z0-9]+/g);
    if (uriMatches) {
      for (const uri of uriMatches) {
        if (!uris.includes(uri)) uris.push(uri);
      }
    }

    // Check for open.spotify.com URLs
    const urlMatches = data.match(/open\.spotify\.com\/(track|episode|album|playlist)\/([a-zA-Z0-9]+)/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        const m = url.match(/open\.spotify\.com\/(track|episode|album|playlist)\/([a-zA-Z0-9]+)/);
        if (m) {
          const uri = `spotify:${m[1]}:${m[2]}`;
          if (!uris.includes(uri)) uris.push(uri);
        }
      }
    }
  }

  return uris;
}

// --- Internal pin reorder (element-level HTML5 DnD) ---

function handleDragStart(e) {
  const item = e.currentTarget;
  dragState = { uri: item.dataset.uri };
  item.classList.add('ep-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', item.dataset.uri);
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('ep-dragging');
  clearDragIndicators();
  dragState = null;
}

function handleDragOver(e) {
  const item = e.currentTarget;
  if (!dragState || item.dataset.uri === dragState.uri) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  clearDragIndicators();

  const rect = item.getBoundingClientRect();
  const container = document.getElementById(EP_CONTAINER_ID);
  const isGrid = container && (container.classList.contains('ep-view-grid') || container.classList.contains('ep-view-compact-grid'));

  if (isGrid) {
    item.classList.add(e.clientX < rect.left + rect.width / 2 ? 'ep-drag-over-left' : 'ep-drag-over-right');
  } else {
    item.classList.add(e.clientY < rect.top + rect.height / 2 ? 'ep-drag-over-top' : 'ep-drag-over-bottom');
  }
}

function handleDrop(e) {
  e.preventDefault();
  const targetItem = e.currentTarget;
  clearDragIndicators();

  if (!dragState) return;

  const sourceUri = dragState.uri;
  const targetUri = targetItem.dataset.uri;
  if (sourceUri === targetUri) return;

  const rect = targetItem.getBoundingClientRect();
  const container = document.getElementById(EP_CONTAINER_ID);
  const isGrid = container && (container.classList.contains('ep-view-grid') || container.classList.contains('ep-view-compact-grid'));
  const insertBefore = isGrid
    ? e.clientX < rect.left + rect.width / 2
    : e.clientY < rect.top + rect.height / 2;

  const pins = loadPins();
  const sourceIdx = pins.findIndex(p => p.uri === sourceUri);
  if (sourceIdx === -1) return;

  const [moved] = pins.splice(sourceIdx, 1);
  let targetIdx = pins.findIndex(p => p.uri === targetUri);
  if (targetIdx === -1) return;

  if (!insertBefore) targetIdx++;
  pins.splice(targetIdx, 0, moved);
  savePins(pins);
  renderPins();
}

/**
 * Moves a pin to the top or bottom of the custom order.
 * No-op if current sort mode is not 'custom'.
 * @param {string} uri
 * @param {'top'|'bottom'} edge
 */
function movePinToEdge(uri, edge) {
  const config = loadConfig();
  if (config.sortMode !== 'custom') {
    Spicetify.showNotification('Move only works in Custom sort mode', true);
    return;
  }
  const pins = loadPins();
  const idx = pins.findIndex(p => p.uri === uri);
  if (idx === -1) return;
  const [moved] = pins.splice(idx, 1);
  if (edge === 'top') pins.unshift(moved); else pins.push(moved);
  savePins(pins);
  renderPins();
}

function handleDragLeave(e) {
  DRAG_INDICATOR_CLASSES.forEach(c => e.currentTarget.classList.remove(c));
}

// --- External drop support (document-level capture + body attribute monitoring) ---

/**
 * Finds the ep-item playlist element under the mouse coordinates, if any.
 * @param {number} x
 * @param {number} y
 * @returns {HTMLElement|null}
 */
function getPlaylistItemAtPoint(x, y) {
  const container = document.getElementById(EP_CONTAINER_ID);
  if (!container) return null;
  for (const item of container.querySelectorAll('.ep-item')) {
    if (!isPlaylistPin(item.dataset.uri)) continue;
    const rect = item.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return item;
    }
  }
  return null;
}

/**
 * Adds tracks to a playlist via Spicetify Platform API
 * @param {PinnedItem} pin
 * @param {string[]} trackUris
 */
async function addTracksToPlaylist(pin, trackUris) {
  console.debug('[Enhanced Pins] Adding to playlist:', pin.uri, 'tracks:', trackUris);

  // Extract playlist ID from URI (spotify:playlist:XXXXX → XXXXX)
  const playlistId = pin.uri.split(':').pop();

  // Try multiple API approaches
  const attempts = [
    {
      name: 'PlaylistAPI.add',
      enabled: !!Spicetify.Platform?.PlaylistAPI?.add,
      fn: () => Spicetify.Platform.PlaylistAPI.add(pin.uri, trackUris, { after: 'end' }),
    },
    {
      name: 'CosmosAsync Web API',
      enabled: !!Spicetify.CosmosAsync,
      fn: () => Spicetify.CosmosAsync.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: trackUris }
      ),
    },
    {
      name: 'CosmosAsync sp protocol',
      enabled: !!Spicetify.CosmosAsync,
      fn: () => Spicetify.CosmosAsync.post(
        `sp://core-playlist/v1/playlist/${pin.uri}/tracks`,
        { uris: trackUris }
      ),
    },
  ];

  for (const attempt of attempts) {
    if (!attempt.enabled) continue;
    try {
      console.debug(`[Enhanced Pins] Trying ${attempt.name}...`);
      await attempt.fn();
      console.debug(`[Enhanced Pins] ${attempt.name} succeeded`);
      return;
    } catch (err) {
      console.warn(`[Enhanced Pins] ${attempt.name} failed:`, err);
    }
  }

  Spicetify.showNotification('Failed to add to playlist', true);
}

/** Whether document-level external drop listeners have been registered */
let externalDropListenersRegistered = false;

/**
 * Registers document-level capture-phase listeners for external track drops.
 * Spotify's React drag system doesn't emit standard drag events on custom elements,
 * so we intercept at the document level and hit-test against our elements by coordinates.
 */
function setupExternalDropListeners() {
  if (externalDropListenersRegistered) return;
  externalDropListenersRegistered = true;

  // Intercept dragover at document level (capture phase) to enable drops on our elements
  document.addEventListener('dragover', (e) => {
    // Skip if this is an internal pin reorder (handled by element-level listeners)
    if (dragState) return;

    const item = getPlaylistItemAtPoint(e.clientX, e.clientY);
    if (item) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      clearDragIndicators();
      item.classList.add('ep-drop-target');
    } else {
      // Clear our indicators if mouse left our items
      clearDragIndicators();
    }
  }, true);

  // Intercept drop at document level (capture phase) to handle external track drops
  document.addEventListener('drop', (e) => {
    if (dragState) return;

    const item = getPlaylistItemAtPoint(e.clientX, e.clientY);
    if (!item) return;

    e.preventDefault();
    e.stopPropagation();
    clearDragIndicators();

    // Log raw dataTransfer for debugging
    const debugInfo = {};
    for (const type of e.dataTransfer.types) {
      debugInfo[type] = e.dataTransfer.getData(type);
    }
    console.debug('[Enhanced Pins] Drop dataTransfer:', debugInfo);

    const allUris = extractDroppedUris(e);
    // Only track and episode URIs can be added to playlists
    const trackUris = allUris.filter(u => u.startsWith('spotify:track:') || u.startsWith('spotify:episode:'));
    console.debug('[Enhanced Pins] Extracted URIs:', allUris, '→ addable:', trackUris);

    if (trackUris.length === 0) {
      if (allUris.length > 0) {
        Spicetify.showNotification('Can only add tracks to playlists', true);
      }
      return;
    }

    const pin = currentPins.find(p => p.uri === item.dataset.uri);
    if (pin) addTracksToPlaylist(pin, trackUris);
  }, true);

  // Monitor body data-dragging-uri-type attribute for visual feedback
  const bodyObserver = new MutationObserver(() => {
    const container = document.getElementById(EP_CONTAINER_ID);
    if (!container) return;
    const isDragging = document.body.hasAttribute('data-dragging-uri-type');
    container.querySelectorAll('.ep-item').forEach(item => {
      if (isDragging && isPlaylistPin(item.dataset.uri)) {
        item.classList.add('ep-accepting-drops');
      } else {
        item.classList.remove('ep-accepting-drops');
      }
    });
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['data-dragging-uri-type'] });
}

//#endregion

//#region Observer

/**
 * Watches sidebar DOM for re-renders and re-injects pins if removed
 */
function setupSidebarObserver() {
  const navBar = document.querySelector(SEL_NAV_BAR);
  if (!navBar) return;

  let debounceTimer = null;

  const checkAndRender = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const epContainer = document.getElementById(EP_CONTAINER_ID);
      const epMissing = !epContainer && currentPins.length > 0;
      const newMode = detectViewMode();
      const modeChanged = epContainer && epContainer.dataset.viewMode !== newMode;

      // Check if sidebar filter changed
      const currentFilter = getActiveTypeFilter();
      const currentFilterKey = currentFilter ? currentFilter.key : '';
      const prevFilterKey = epContainer?.dataset.filterKey ?? '';
      const filterChanged = currentFilterKey !== prevFilterKey;

      if (epMissing || modeChanged || filterChanged) {
        renderPins();
      }
    }, 200);
  };

  // Watch sidebar for structural changes (child additions/removals)
  // and attribute changes on key elements (aria-label on the view combobox,
  // aria-colcount on the treegrid) to detect view mode switches
  const observer = new MutationObserver(checkAndRender);
  observer.observe(navBar, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label', 'aria-colcount', 'aria-checked', 'aria-pressed', 'aria-selected']
  });
}

//#endregion

//#region Styles

/**
 * Injects CSS styles into the document head
 */
function injectStyles() {
  if (document.getElementById(EP_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = EP_STYLE_ID;
  style.textContent = `
    .ep-section {
      padding: 0;
    }

    .ep-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
      gap: 8px;
      min-height: 56px;
      box-sizing: border-box;
    }

    .ep-item:hover {
      background: hsla(0, 0%, 100%, 0.07);
    }

    .ep-item-art {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .ep-item-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .ep-item-img--placeholder {
      background: hsla(0, 0%, 100%, 0.1);
    }

    .ep-item-img--pseudo {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ep-item-img--pseudo svg {
      width: 40%;
      height: 40%;
      color: var(--spice-subtext, #b3b3b3);
    }

    .ep-item-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }

    .ep-item-title {
      margin: 0;
      color: var(--spice-text, var(--text-base, #fff));
      font-size: 0.875rem;
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5;
    }

    .ep-item-subtitle {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--spice-subtext, var(--text-subdued, #b3b3b3));
      font-size: 0.8125rem;
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5;
    }

    .ep-item-pin-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      color: var(--text-bright-accent, #107434);
    }

    .ep-item-pin-emoji {
      width: auto;
      min-width: 12px;
      height: 12px;
      font-size: 11px;
      line-height: 12px;
      text-align: center;
    }

    /* Icon picker (settings default + per-pin modal) */
    .ep-icon-picker {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ep-icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
      gap: 8px;
    }

    .ep-icon-option {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      border: 1px solid var(--spice-button-disabled, #404040);
      border-radius: 8px;
      background: var(--spice-card, rgba(255, 255, 255, 0.05));
      color: var(--spice-text, #fff);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, transform 0.1s;
    }

    .ep-icon-option:hover {
      background: var(--spice-highlight-elevated, rgba(255, 255, 255, 0.1));
      transform: scale(1.05);
    }

    .ep-icon-option svg {
      width: 18px;
      height: 18px;
    }

    .ep-icon-option.ep-icon-selected {
      border-color: var(--spice-button-active, var(--text-bright-accent, #1ed760));
      background: var(--spice-highlight-elevated, rgba(30, 215, 96, 0.15));
    }

    .ep-icon-default-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--spice-subtext, #b3b3b3);
    }

    .ep-icon-emoji-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ep-icon-emoji-label {
      font-size: 0.8125rem;
      color: var(--spice-subtext, #b3b3b3);
    }

    .ep-icon-emoji-input {
      width: 64px;
      padding: 6px 8px;
      font-size: 1rem;
      text-align: center;
      border: 1px solid var(--spice-button-disabled, #404040);
      border-radius: 6px;
      background: var(--spice-card, rgba(0, 0, 0, 0.3));
      color: var(--spice-text, #fff);
    }

    .ep-icon-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    /* Play/pause overlay on album art */
    .ep-art-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      padding: 0;
      border-radius: 4px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      color: var(--spice-text, var(--text-base, #fff));
    }

    .ep-art-overlay svg {
      width: 20px;
      height: 20px;
    }

    .ep-item:hover .ep-art-overlay,
    .ep-item.ep-playing .ep-art-overlay {
      opacity: 1;
    }

    /* Speaker/playing indicator on the right */
    .ep-playing-indicator {
      display: none;
      align-items: center;
      margin-left: auto;
      padding-left: 8px;
      flex-shrink: 0;
      color: var(--text-bright-accent, #107434);
    }

    .ep-playing-indicator svg {
      width: 16px;
      height: 16px;
    }

    .ep-item.ep-playing .ep-playing-indicator {
      display: flex;
    }

    /* Active title turns green when playing */
    .ep-title-active {
      color: var(--text-bright-accent, #107434) !important;
    }

    /* Section header */
    .ep-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px 4px;
    }

    .ep-section-label {
      color: var(--ep-title-color, var(--spice-subtext, var(--text-subdued, #b3b3b3)));
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    /* !important required: Spotify has a global font-normalization rule
       (a broad :not(...) selector) that sets font-size !important on
       virtually every element. */
    .ep-section-header .ep-section-label {
      font-size: var(--ep-title-font-size, 11px) !important;
    }

    .ep-settings-gear {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      opacity: 0;
      transition: opacity 0.2s;
      border-radius: 4px;
      color: var(--spice-subtext, var(--text-subdued, #b3b3b3));
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ep-settings-icon {
      width: 14px;
      height: 14px;
      display: block;
    }

    .ep-settings-gear:hover .ep-settings-icon {
      color: var(--spice-text, #fff);
    }

    .ep-section:hover .ep-settings-gear { opacity: 0.7; }
    .ep-settings-gear:hover { opacity: 1 !important; }

    /* Settings modal */
    .ep-settings-modal { padding: 8px 0; }
    .ep-settings-section { margin-bottom: 16px; }

    /* Spicetify's isLarge PopupModal stretches its dialog to fill the whole
       viewport regardless of content length; scope the cap to just our modal
       (:has) so other isLarge modals in Spotify/other extensions are untouched. */
    .main-embedWidgetGenerator-container:has(.ep-settings-modal) {
      height: auto !important;
      max-height: min(80vh, 720px) !important;
    }
    .main-trackCreditsModal-mainSection:has(.ep-settings-modal) {
      overflow-y: auto !important;
    }

    .ep-settings-footer {
      position: sticky;
      bottom: 0;
      margin-top: 16px;
      padding: 10px 0 2px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid hsla(0, 0%, 100%, 0.1);
      background: var(--background-elevated-base, var(--spice-card, #282828));
    }

    .ep-settings-version {
      color: var(--spice-subtext, #b3b3b3);
      font-size: 0.75rem;
    }

    .ep-settings-github-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--spice-subtext, #b3b3b3);
    }

    .ep-settings-github-link:hover {
      color: var(--spice-text, #fff);
    }

    .ep-settings-github-link .ep-settings-icon {
      width: 16px;
      height: 16px;
    }

    .ep-settings-title {
      color: var(--spice-text, #fff);
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .ep-settings-hint {
      color: var(--spice-subtext, #b3b3b3);
      font-size: 0.8125rem;
      margin: 0 0 10px 0;
    }

    .ep-toggle-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ep-toggle-option {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px 0;
    }

    .ep-toggle-option input[type="checkbox"] { display: none; }

    .ep-toggle-switch {
      width: 44px;
      height: 22px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 11px;
      position: relative;
      margin-right: 12px;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .ep-toggle-switch::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .ep-toggle-option input:checked + .ep-toggle-switch {
      background: var(--spice-button, #1db954);
    }

    .ep-toggle-option input:checked + .ep-toggle-switch::after {
      left: 25px;
      background: #000;
    }

    .ep-toggle-label {
      color: var(--spice-text, #fff);
      font-size: 14px;
    }

    /* Custom context menu — uses Spicetify theme variables for native look */
    .ep-context-menu {
      position: fixed;
      z-index: 10001;
      min-width: 196px;
      max-width: 350px;
      background: var(--background-elevated-base, var(--spice-card, #282828));
      border-radius: 4px;
      box-shadow: 0 16px 24px rgba(0,0,0,.3), 0 6px 8px rgba(0,0,0,.2);
      padding: 4px;
      color: var(--spice-text, var(--text-base, #fff));
      font-size: 14px;
    }

    .ep-context-menu ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .ep-context-menu [data-action] {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 10px 8px 10px 12px;
      border: none;
      background: transparent;
      color: var(--spice-text, var(--text-base, #fff));
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      border-radius: 2px;
      text-align: left;
      white-space: nowrap;
    }

    .ep-context-menu [data-action]:hover,
    .ep-context-menu [data-action]:focus {
      background: var(--background-elevated-highlight, var(--spice-selected-row, hsla(0,0%,100%,.1)));
      color: var(--spice-text, var(--text-base, #fff));
      outline: none;
    }

    .ep-ctx-divider {
      height: 1px;
      background: var(--decorative-subdued, hsla(0,0%,100%,.1));
      margin: 4px 0;
    }

    /* Edit details modal */
    .ep-edit-image-section {
      flex-shrink: 0;
    }

    .ep-edit-image-wrapper {
      width: 180px;
      height: 180px;
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      background: hsla(0, 0%, 100%, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .ep-edit-img-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .ep-edit-img-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ep-edit-img-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.6);
      opacity: 0;
      transition: opacity 0.2s;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
    }

    .ep-edit-image-wrapper:hover .ep-edit-img-overlay {
      opacity: 1;
    }

    .ep-edit-input {
      width: 100%;
      padding: 8px 12px;
      background: hsla(0, 0%, 100%, 0.1);
      border: 1px solid transparent;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .ep-edit-textarea {
      resize: vertical;
      flex: 1;
    }

    .ep-edit-input:focus {
      outline: none;
      border-color: var(--spice-button, #1db954);
      background: hsla(0, 0%, 100%, 0.15);
    }

    .ep-edit-save {
      align-self: flex-end;
      padding: 8px 32px;
      background: var(--spice-button, #1db954);
      border: none;
      border-radius: 20px;
      color: #000;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }

    .ep-edit-save:hover { transform: scale(1.04); }

    .ep-edit-disclaimer {
      margin: 12px 0 0;
      color: var(--spice-subtext, var(--text-subdued, #b3b3b3));
      font-size: 11px;
      line-height: 1.4;
    }

    /* Delete confirmation */
    .ep-delete-cancel {
      padding: 8px 24px;
      background: transparent;
      border: 1px solid #555;
      border-radius: 20px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .ep-delete-cancel:hover { border-color: #fff; }

    .ep-delete-confirm {
      padding: 8px 24px;
      background: #e91429;
      border: none;
      border-radius: 20px;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }

    .ep-delete-confirm:hover { opacity: 0.9; }

    /* Items wrapper - default list layout */
    .ep-items {
      display: flex;
      flex-direction: column;
    }

    /* Short subtitle hidden by default (shown in grid view) */
    .ep-subtitle-short { display: none; }

    /* Drag and drop */
    .ep-item.ep-dragging { cursor: grabbing; }
    .ep-dragging { opacity: 0.4; }
    .ep-drag-over-top { box-shadow: 0 -2px 0 0 var(--spice-button, #1db954); }
    .ep-drag-over-bottom { box-shadow: 0 2px 0 0 var(--spice-button, #1db954); }
    .ep-drag-over-left { box-shadow: -2px 0 0 0 var(--spice-button, #1db954); }
    .ep-drag-over-right { box-shadow: 2px 0 0 0 var(--spice-button, #1db954); }

    /* External drop: subtle hint that playlists accept drops during any Spotify drag */
    .ep-accepting-drops {
      outline: 1px dashed rgba(255, 255, 255, 0.2);
      outline-offset: -1px;
      border-radius: 6px;
    }

    /* External drop: active highlight when hovering over a playlist target */
    .ep-drop-target {
      background: hsla(141, 73%, 42%, 0.15) !important;
      box-shadow: inset 0 0 0 2px var(--spice-button, #1db954);
      border-radius: 6px;
    }

    /* Show more / show less link */
    .ep-show-more {
      background: transparent;
      border: none;
      color: var(--spice-subtext, var(--text-subdued, #b3b3b3));
      font-size: 12px;
      padding: 6px 8px;
      cursor: pointer;
      text-align: left;
      width: 100%;
    }
    .ep-show-more:hover {
      color: var(--spice-text, #fff);
      text-decoration: underline;
    }

    /* Settings select dropdown */
    .ep-settings-select {
      background: hsla(0, 0%, 100%, 0.1);
      border: 1px solid transparent;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      padding: 6px 8px;
      cursor: pointer;
    }
    .ep-settings-select:focus {
      outline: none;
      border-color: var(--spice-button, #1db954);
    }
    .ep-settings-select option {
      background: #282828;
      color: #fff;
    }

    /* Settings number input */
    .ep-settings-number {
      background: hsla(0, 0%, 100%, 0.1);
      border: 1px solid transparent;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      padding: 6px 8px;
      width: 80px;
      text-align: center;
    }
    .ep-settings-number:focus {
      outline: none;
      border-color: var(--spice-button, #1db954);
    }

    /* Settings text input */
    .ep-settings-text {
      background: hsla(0, 0%, 100%, 0.1);
      border: 1px solid transparent;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      padding: 6px 8px;
      width: 140px;
    }
    .ep-settings-text:focus {
      outline: none;
      border-color: var(--spice-button, #1db954);
    }

    /* Settings color swatch */
    .ep-settings-color {
      width: 36px;
      height: 28px;
      padding: 2px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
    }

    /* Settings buttons (export/import/shortcut record) */
    .ep-settings-btn {
      background: var(--spice-button, #1db954);
      color: var(--spice-main, #000);
      border: none;
      border-radius: 500px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
    }
    .ep-settings-btn:hover:not(:disabled) { filter: brightness(1.08); }
    .ep-settings-btn:disabled { opacity: 0.6; cursor: default; }
    .ep-settings-btn.ep-btn-secondary {
      background: transparent;
      color: var(--spice-text, #fff);
      border: 1px solid hsla(0, 0%, 100%, 0.3);
    }
    .ep-settings-btn.ep-btn-secondary:hover:not(:disabled) {
      background: hsla(0, 0%, 100%, 0.08);
      filter: none;
    }
    .ep-shortcut-clear {
      padding: 4px 10px;
      font-size: 14px;
      line-height: 1;
    }

    /* ============ Compact List View ============ */
    .ep-view-compact .ep-item {
      min-height: 32px;
      padding: 4px 8px;
      gap: 4px;
    }

    .ep-view-compact .ep-item-art {
      display: none;
    }

    .ep-view-compact .ep-item-text {
      flex-direction: row;
      align-items: center;
      gap: 4px;
    }

    .ep-view-compact .ep-item-subtitle {
      order: -1;
      gap: 0;
    }

    .ep-view-compact .ep-item-subtitle .ep-subtitle-full,
    .ep-view-compact .ep-item-subtitle .ep-subtitle-short {
      display: none;
    }

    .ep-view-compact .ep-playing-indicator,
    .ep-view-compact .ep-item.ep-playing .ep-playing-indicator {
      display: none;
    }

    /* ============ Default Grid (2 columns) ============ */
    .ep-view-grid .ep-items {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 0 4px;
    }

    .ep-view-grid .ep-item {
      flex-direction: column;
      align-items: stretch;
      padding: 12px;
      min-height: auto;
      border-radius: 8px;
      gap: 8px;
      background: hsla(0, 0%, 100%, 0.04);
    }

    .ep-view-grid .ep-item:hover {
      background: hsla(0, 0%, 100%, 0.1);
    }

    .ep-view-grid .ep-item-art {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      border-radius: 6px;
    }

    .ep-view-grid .ep-art-overlay {
      border-radius: 6px;
    }

    .ep-view-grid .ep-item-text {
      gap: 2px;
    }

    .ep-view-grid .ep-subtitle-full { display: none; }
    .ep-view-grid .ep-subtitle-short { display: inline; }

    .ep-view-grid .ep-playing-indicator,
    .ep-view-grid .ep-item.ep-playing .ep-playing-indicator {
      display: none;
    }

    .ep-view-grid .ep-show-more,
    .ep-view-compact-grid .ep-show-more {
      grid-column: 1 / -1;
      text-align: center;
    }

    /* ============ Compact Grid (3 columns) ============ */
    .ep-view-compact-grid .ep-items {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4px;
      padding: 0 4px;
    }

    .ep-view-compact-grid .ep-item {
      flex-direction: column;
      align-items: stretch;
      padding: 0;
      min-height: auto;
      border-radius: 6px;
      gap: 0;
      overflow: hidden;
    }

    .ep-view-compact-grid .ep-item:hover {
      background: transparent;
    }

    .ep-view-compact-grid .ep-item-art {
      width: 100%;
      height: auto;
      aspect-ratio: 1;
      border-radius: 6px;
    }

    .ep-view-compact-grid .ep-art-overlay {
      border-radius: 6px;
    }

    .ep-view-compact-grid .ep-item-text {
      display: none;
    }

    .ep-view-compact-grid .ep-playing-indicator,
    .ep-view-compact-grid .ep-item.ep-playing .ep-playing-indicator {
      display: none;
    }
  `;
  document.head.appendChild(style);
}

//#endregion

//#region Shortcuts

/**
 * Builds the binding string for a KeyboardEvent (e.g. "Ctrl+Alt+KeyE").
 * Uses event.code for layout-independent bindings.
 * Returns empty string for pure-modifier presses.
 * @param {KeyboardEvent} e
 * @returns {string}
 */
function eventToBinding(e) {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return '';
  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  parts.push(e.code);
  return parts.join('+');
}

/**
 * Executes a shortcut action by name.
 * @param {string} action
 */
function runShortcutAction(action) {
  switch (action) {
    case 'toggleExpand':
      expandedView = !expandedView;
      renderPins();
      break;
    case 'openSettings':
      showSettingsModal();
      break;
    case 'focusFirstPin': {
      const first = document.querySelector(`#${EP_CONTAINER_ID} .ep-item`);
      if (first) first.focus();
      break;
    }
  }
}

/**
 * Installs the global keydown listener that dispatches configured shortcuts.
 * Skips events originating inside editable fields.
 */
function setupShortcuts() {
  window.addEventListener('keydown', (e) => {
    const config = loadConfig();
    if (!config.shortcutsEnabled) return;
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const binding = eventToBinding(e);
    if (!binding) return;
    for (const [action, bound] of Object.entries(config.shortcuts || {})) {
      if (bound && bound === binding) {
        e.preventDefault();
        e.stopPropagation();
        runShortcutAction(action);
        return;
      }
    }
  }, true);
}

//#endregion

//#region Bootstrap

(async function () {
  while (
    !Spicetify?.Platform?.History ||
    !Spicetify?.ContextMenu ||
    !Spicetify?.LocalStorage ||
    !Spicetify?.URI ||
    !Spicetify?.CosmosAsync ||
    !Spicetify?.Menu?.Item ||
    !document.querySelector(SEL_NAV_BAR)
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('[Enhanced Pins] Starting...');

  injectStyles();
  currentPins = loadPins();
  registerMenuItem();
  registerContextMenuItems();
  createContextMenu();
  setupContextMenuActions();
  setupContextMenuDismissal();
  renderPins();
  setupSidebarObserver();
  setupExternalDropListeners();
  setupShortcuts();
  refreshStaleMetadata();
  updatePlayingStates();

  // Delayed re-check: combobox may not exist on first render
  setTimeout(() => {
    const epContainer = document.getElementById(EP_CONTAINER_ID);
    const currentMode = detectViewMode();
    if (epContainer && epContainer.dataset.viewMode !== currentMode) {
      renderPins();
    }
  }, 800);

  Spicetify.Player.addEventListener('songchange', updatePlayingStates);
  Spicetify.Player.addEventListener('onplaypause', updatePlayingStates);

  console.log('[Enhanced Pins] Initialized');
})();

//#endregion

})();
