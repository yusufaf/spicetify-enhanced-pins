// NAME: Enhanced Pins
// AUTHOR: yusufaf
// DESCRIPTION: Unlimited pins in their own sidebar section, with sorting, icons, and backup
//
// Enhanced Pins moved to https://github.com/yusufaf/spicetify-extensions/tree/main/extensions/enhanced-pins
// This file only loads it from there, so installs from this repository keep updating.
// Install it from the new location to stop depending on this redirect.

(function () {
  if (window.__enhancedPinsActive) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/yusufaf/spicetify-extensions@main/extensions/enhanced-pins/enhanced-pins.js';
  script.onerror = () => console.error('[Enhanced Pins] Could not load the extension from https://cdn.jsdelivr.net/gh/yusufaf/spicetify-extensions@main/extensions/enhanced-pins/enhanced-pins.js');
  document.head.appendChild(script);
})();
