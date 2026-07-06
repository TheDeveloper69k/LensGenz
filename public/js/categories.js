window.LG = window.LG || {};

// Single source of truth for the site's category taxonomy — used by the submit
// form's dropdown, Explore's filter chips, and the homepage category browser.
// Each category also drives a light "theme" (accent colors) applied via
// [data-cat-theme] CSS overrides in style.css.
LG.CATEGORIES = [
  { key: 'Gaming', icon: '🎮', accent: '#6f5bd0', accentDark: '#5943b3', tint: '#eee9fb' },
  { key: 'Cooking', icon: '🍳', accent: '#d97a3f', accentDark: '#b8622f', tint: '#fbeee2' },
  { key: 'Travel', icon: '✈️', accent: '#2f8f8a', accentDark: '#25716d', tint: '#e2f2f0' },
  { key: 'Lifestyle', icon: '🌿', accent: '#c1685a', accentDark: '#a34e42', tint: '#f8ece8' },
  { key: 'Photography', icon: '📷', accent: '#3f6fa8', accentDark: '#31578a', tint: '#e6eef7' },
  { key: 'Poetry', icon: '🖋️', accent: '#a8508f', accentDark: '#873f73', tint: '#f6e8f2' },
  { key: 'Culture', icon: '🎭', accent: '#b08a3e', accentDark: '#93712f', tint: '#f6efdf' },
  { key: 'Wellness', icon: '🧘', accent: '#4c7a4f', accentDark: '#3c623f', tint: '#e7f1e6' },
  { key: 'Technology', icon: '💻', accent: '#3d6ad8', accentDark: '#2f54ab', tint: '#e5ecfb' },
  { key: 'Music', icon: '🎵', accent: '#c2445e', accentDark: '#a1364c', tint: '#f8e6ea' },
  { key: 'Sports', icon: '🏆', accent: '#3f9142', accentDark: '#317334', tint: '#e5f2e5' },
  { key: 'Fashion', icon: '👗', accent: '#c1477f', accentDark: '#9f3968', tint: '#f8e6ee' },
];

LG.getCategory = function getCategory(key) {
  return LG.CATEGORIES.find((c) => c.key.toLowerCase() === String(key || '').toLowerCase());
};

// Applies a category's accent colors to the page via CSS custom properties.
// Pass null/empty to reset to the site's default theme.
LG.applyCategoryTheme = function applyCategoryTheme(key) {
  const cat = LG.getCategory(key);
  document.documentElement.setAttribute('data-cat-theme', cat ? cat.key.toLowerCase() : '');
};
