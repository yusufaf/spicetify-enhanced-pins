// NAME: Enhanced Pins
// AUTHOR: yusufaf
// VERSION: 1.0.0
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
  'collection': 'Audiobook'
};

/** Map sidebar filter chip labels (lowercase) to allowed pin type sets */
const FILTER_TYPE_MAP = {
  'playlists': new Set(['playlist', 'playlist-v2']),
  'albums': new Set(['album']),
  'podcasts': new Set(['show']),
  'podcasts & shows': new Set(['show']),
  'audiobooks': new Set(['collection']),
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

/** Gear/settings icon SVG path (16x16 viewBox) */
const GEAR_SVG_PATH = 'M8.045 1.218a6.8 6.8 0 0 1 .91 0l.636.057.527.356.378.504.12.294.218.053.452-.16.576-.181.86.33.602.692.152.902-.222.554-.255.422.089.212.47.117.605.093.42.752v.924l-.42.752-.605.093-.47.117-.089.212.255.422.222.554-.152.902-.602.692-.86.33-.576-.181-.452-.16-.218.053-.12.294-.378.504-.527.356-.636.057a6.8 6.8 0 0 1-.91 0l-.636-.057-.527-.356-.378-.504-.12-.294-.218-.053-.452.16-.576.181-.86-.33-.602-.692-.152-.902.222-.554.255-.422-.089-.212-.47-.117-.605-.093L1 8.962v-.924l.42-.752.605-.093.47-.117.089-.212-.255-.422-.222-.554.152-.902.602-.692.86-.33.576.181.452.16.218-.053.12-.294.378-.504.527-.356zM8.5 6a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z';

/** LocalStorage key for EP config */
const EP_CONFIG_KEY = 'enhanced-pins-config';

/** Default configuration */
const EP_DEFAULT_CONFIG = {
  hideFromLibrary: true,
  confirmUnpin: false
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
    (uris) => {
      const uri = uris[0];
      let pins = loadPins();
      const item = pins.find(p => p.uri === uri);
      pins = pins.filter(p => p.uri !== uri);
      savePins(pins);
      renderPins();
      Spicetify.showNotification(`Unpinned: ${item?.name || 'item'}`);
    },
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
    });
  });

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
 * Navigates to a pinned item's page
 * @param {PinnedItem} pin
 */
function navigateToPin(pin) {
  const uriObj = Spicetify.URI.fromString(pin.uri);
  const id = uriObj.id || uriObj._base62Id;
  const pathPrefix = TYPE_PATH_MAP[uriObj.type] || '/playlist/';
  Spicetify.Platform.History.push(pathPrefix + id);
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
 * enhanced pins of that type should be shown.
 * @returns {Set<string>|null} Set of allowed pin types, or null if no type filter active
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
      if (FILTER_TYPE_MAP[label]) return FILTER_TYPE_MAP[label];
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
    return FILTER_TYPE_MAP[typeChips[0]];
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
    <li class="ep-ctx-divider" role="separator"></li>
    <li><button data-action="radio" role="menuitem"><span class="ep-ctx-label">Go to Radio</span></button></li>
    <li class="ep-ctx-divider ep-ctx-owner" role="separator"></li>
    <li class="ep-ctx-owner"><button data-action="edit" role="menuitem"><span class="ep-ctx-label">Edit details</span></button></li>
    <li class="ep-ctx-owner"><button data-action="delete" role="menuitem"><span class="ep-ctx-label">Delete</span></button></li>
    <li class="ep-ctx-divider" role="separator"></li>
    <li><button data-action="download" role="menuitem"><span class="ep-ctx-label">Download</span></button></li>
    <li class="ep-ctx-divider ep-ctx-owner" role="separator"></li>
    <li class="ep-ctx-owner"><button data-action="visibility" role="menuitem"><span class="ep-ctx-label">Make private</span></button></li>
    <li class="ep-ctx-divider" role="separator"></li>
    <li><button data-action="native-pin" role="menuitem"><span class="ep-ctx-label">Pin playlist</span></button></li>
    <li><button data-action="unpin" role="menuitem"><span class="ep-ctx-label">Enhanced Unpin</span></button></li>
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
    const typeLabel = TYPE_LABEL_MAP[pin.type] || 'Playlist';
    radioLabel.textContent = `Go to ${typeLabel} Radio`;
  }

  // Hide owner-only items by default (shown after async ownership check)
  menu.querySelectorAll('.ep-ctx-owner').forEach(el => { el.style.display = 'none'; });

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

      case 'unpin': {
        let pins = loadPins();
        const item = pins.find(p => p.uri === pin.uri);
        pins = pins.filter(p => p.uri !== pin.uri);
        savePins(pins);
        renderPins();
        Spicetify.showNotification(`Unpinned: ${item?.name || 'item'}`);
        break;
      }

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

  const existing = document.getElementById(EP_CONTAINER_ID);
  if (existing) existing.remove();

  if (pins.length === 0) {
    updateHideStyles();
    return;
  }

  // Filter pins based on active sidebar entity type filter
  const activeFilter = getActiveTypeFilter();
  const filteredPins = activeFilter
    ? pins.filter(pin => activeFilter.has(pin.type))
    : pins;

  const viewMode = detectViewMode();

  const container = document.createElement('div');
  container.id = EP_CONTAINER_ID;
  container.className = `ep-view-${viewMode}`;
  container.dataset.viewMode = viewMode;
  container.dataset.filterKey = activeFilter ? [...activeFilter].sort().join(',') : '';

  const section = document.createElement('div');
  section.className = 'ep-section';
  section.setAttribute('role', 'list');
  section.setAttribute('aria-label', 'Enhanced Pins');

  // Section header
  const header = document.createElement('div');
  header.className = 'ep-section-header';
  header.innerHTML = `
    <span class="ep-section-label">Enhanced Pins</span>
    <button class="ep-settings-gear" title="Enhanced Pins Settings" type="button">
      <span class="ep-settings-icon">\u2699\uFE0F</span>
    </button>`;
  header.querySelector('.ep-settings-gear').addEventListener('click', (e) => {
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

  filteredPins.forEach(pin => {
    const typeLabel = TYPE_LABEL_MAP[pin.type] || 'Playlist';
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
          : '<div class="ep-item-img ep-item-img--placeholder"></div>'}
        <button class="ep-art-overlay" aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="${PLAY_SVG_PATH}"></path></svg>
        </button>
      </div>
      <div class="ep-item-text">
        <p class="ep-item-title">${escapeHtml(pin.name)}</p>
        <p class="ep-item-subtitle">
          <svg class="ep-item-pin-icon" viewBox="0 0 16 16" fill="currentColor"><path d="${PIN_SVG_PATH}"></path></svg>
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

    itemsWrapper.appendChild(item);
  });

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
      const currentFilterKey = currentFilter ? [...currentFilter].sort().join(',') : '';
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
      color: var(--spice-subtext, var(--text-subdued, #b3b3b3));
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .ep-settings-gear {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      opacity: 0;
      transition: opacity 0.2s;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1;
    }

    .ep-settings-icon {
      font-size: 14px;
    }

    .ep-section:hover .ep-settings-gear { opacity: 0.7; }
    .ep-settings-gear:hover { opacity: 1 !important; }

    /* Settings modal */
    .ep-settings-modal { padding: 8px 0; }
    .ep-settings-section { margin-bottom: 16px; }

    .ep-settings-title {
      color: var(--spice-text, #fff);
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 8px 0;
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

//#region Bootstrap

(async function () {
  while (
    !Spicetify?.Platform?.History ||
    !Spicetify?.ContextMenu ||
    !Spicetify?.LocalStorage ||
    !Spicetify?.URI ||
    !Spicetify?.CosmosAsync ||
    !document.querySelector(SEL_NAV_BAR)
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('[Enhanced Pins] Starting...');

  injectStyles();
  currentPins = loadPins();
  registerContextMenuItems();
  createContextMenu();
  setupContextMenuActions();
  setupContextMenuDismissal();
  renderPins();
  setupSidebarObserver();
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
