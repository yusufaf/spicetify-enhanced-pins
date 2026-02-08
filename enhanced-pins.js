// NAME: Enhanced Pins
// AUTHOR: yusufaf
// VERSION: 1.0.0
// DESCRIPTION: Bypass Spotify's 4-pin limit with unlimited enhanced pins

//#region Type Definitions

/**
 * @typedef {Object} PinnedItem
 * @property {string} uri - Spotify URI (e.g. "spotify:playlist:37i9...")
 * @property {string} type - Entity type from Spicetify.URI.Type
 * @property {string} name - Display name (cached at pin-time)
 * @property {number} pinnedAt - Timestamp when pinned
 */

//#endregion

//#region Constants

/** LocalStorage key for pin data */
const EP_PINS_KEY = 'enhanced-pins-data';

/** Container element ID */
const EP_CONTAINER_ID = 'enhanced-pins-container';

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

//#endregion

//#region State

/** @type {PinnedItem[]} Cached pin list */
let currentPins = [];

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

//#endregion

//#region Metadata

/**
 * Fetches the display name for a Spotify URI via CosmosAsync
 * @param {string} uri - Spotify URI
 * @returns {Promise<string>} Display name
 */
async function fetchItemName(uri) {
  const uriObj = Spicetify.URI.fromString(uri);
  const id = uriObj.id || uriObj._base62Id;
  const type = uriObj.type;

  try {
    let endpoint;
    if (type === 'playlist' || type === 'playlist-v2') {
      endpoint = `https://api.spotify.com/v1/playlists/${id}?fields=name`;
    } else if (type === 'album') {
      endpoint = `https://api.spotify.com/v1/albums/${id}`;
    } else if (type === 'show') {
      endpoint = `https://api.spotify.com/v1/shows/${id}`;
    }

    if (endpoint) {
      const res = await Spicetify.CosmosAsync.get(endpoint);
      return res?.name || 'Unknown';
    }
  } catch (e) {
    console.warn('[Enhanced Pins] Metadata fetch failed', e);
  }

  return 'Unknown';
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
      const name = await fetchItemName(uri);

      pins.push({
        uri,
        type: uriObj.type,
        name,
        pinnedAt: Date.now()
      });

      savePins(pins);
      renderPins();
      Spicetify.showNotification(`Pinned: ${name}`);
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
 * Finds where to inject the enhanced pins section in the sidebar
 * @returns {{ parent: HTMLElement, reference: Node|null }|null}
 */
function findInjectionPoint() {
  // Strategy 1: After the library filter chips (entry points)
  const entryPoints = document.querySelector('[class*="yourLibraryX-entryPoints"]');
  if (entryPoints?.parentElement) {
    return { parent: entryPoints.parentElement, reference: entryPoints.nextSibling };
  }

  // Strategy 2: Top of library section
  const library = document.querySelector('[class*="yourLibraryX-library"]');
  if (library) {
    return { parent: library, reference: library.firstChild };
  }

  // Strategy 3: Fallback to nav bar
  const navBar = document.querySelector(SEL_NAV_BAR);
  if (navBar) {
    return { parent: navBar, reference: null };
  }

  return null;
}

/**
 * Renders the enhanced pins section in the sidebar
 */
function renderPins() {
  const pins = loadPins();
  currentPins = pins;

  // Remove existing section
  const existing = document.getElementById(EP_CONTAINER_ID);
  if (existing) existing.remove();

  // Don't render if no pins
  if (pins.length === 0) return;

  const container = document.createElement('div');
  container.id = EP_CONTAINER_ID;
  container.className = 'ep-section';

  // Header
  const header = document.createElement('div');
  header.className = 'ep-header';
  header.innerHTML = `
    <svg class="ep-header-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0l2.5 5.3L16 6.2l-4 3.9 1 5.9L8 13.1 2.9 16l1-5.9-4-3.9 5.5-.9z"/>
    </svg>
    <span class="ep-title">Enhanced Pins</span>
  `;
  container.appendChild(header);

  // Pin list
  const list = document.createElement('ul');
  list.className = 'ep-list';

  pins.forEach((pin) => {
    const li = document.createElement('li');
    li.className = 'ep-item';
    li.setAttribute('data-uri', pin.uri);
    li.tabIndex = 0;

    li.innerHTML = `
      <svg class="ep-pin-icon" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0l2.5 5.3L16 6.2l-4 3.9 1 5.9L8 13.1 2.9 16l1-5.9-4-3.9 5.5-.9z"/>
      </svg>
      <span class="ep-item-name">${escapeHtml(pin.name)}</span>
    `;

    li.addEventListener('click', () => navigateToPin(pin));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToPin(pin);
      }
    });

    list.appendChild(li);
  });

  container.appendChild(list);

  // Inject into sidebar
  const injection = findInjectionPoint();
  if (injection) {
    injection.parent.insertBefore(container, injection.reference);
  }
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

  const observer = new MutationObserver(() => {
    if (!document.getElementById(EP_CONTAINER_ID) && currentPins.length > 0) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderPins(), 200);
    }
  });

  observer.observe(navBar, { childList: true, subtree: true });
}

//#endregion

//#region Styles

/**
 * Injects CSS styles into the document head
 */
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .ep-section {
      padding: 8px 8px 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }

    .ep-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      margin-bottom: 2px;
    }

    .ep-header-icon {
      color: var(--spice-button, #1db954);
      opacity: 0.8;
    }

    .ep-title {
      color: var(--spice-subtext, #b3b3b3);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .ep-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .ep-item {
      display: flex;
      align-items: center;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s ease;
      gap: 10px;
    }

    .ep-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .ep-item:active {
      background: rgba(255, 255, 255, 0.15);
    }

    .ep-pin-icon {
      color: var(--spice-button, #1db954);
      flex-shrink: 0;
      opacity: 0.7;
    }

    .ep-item-name {
      color: var(--spice-text, #fff);
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ep-item:hover .ep-item-name {
      color: var(--spice-text, #fff);
    }
  `;
  document.head.appendChild(style);
}

//#endregion

//#region Bootstrap

(async function enhancedPins() {
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
  renderPins();
  setupSidebarObserver();

  console.log('[Enhanced Pins] Initialized');
})();

//#endregion
