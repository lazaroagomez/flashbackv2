// Theme store with localStorage persistence

import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage.js';

// Available themes from DaisyUI
export const availableThemes = [
  { id: 'light', name: 'Light', type: 'light' },
  { id: 'dark', name: 'Dark', type: 'dark' },
  { id: 'cupcake', name: 'Cupcake', type: 'light' },
  { id: 'corporate', name: 'Corporate', type: 'light' },
  { id: 'synthwave', name: 'Synthwave', type: 'dark' },
  { id: 'retro', name: 'Retro', type: 'light' },
  { id: 'cyberpunk', name: 'Cyberpunk', type: 'light' },
  { id: 'valentine', name: 'Valentine', type: 'light' },
  { id: 'halloween', name: 'Halloween', type: 'dark' },
  { id: 'garden', name: 'Garden', type: 'light' },
  { id: 'forest', name: 'Forest', type: 'dark' },
  { id: 'aqua', name: 'Aqua', type: 'dark' },
  { id: 'lofi', name: 'Lo-Fi', type: 'light' },
  { id: 'pastel', name: 'Pastel', type: 'light' },
  { id: 'fantasy', name: 'Fantasy', type: 'light' },
  { id: 'wireframe', name: 'Wireframe', type: 'light' },
  { id: 'black', name: 'Black', type: 'dark' },
  { id: 'luxury', name: 'Luxury', type: 'dark' },
  { id: 'dracula', name: 'Dracula', type: 'dark' },
  { id: 'cmyk', name: 'CMYK', type: 'light' },
  { id: 'autumn', name: 'Autumn', type: 'light' },
  { id: 'business', name: 'Business', type: 'dark' },
  { id: 'acid', name: 'Acid', type: 'light' },
  { id: 'lemonade', name: 'Lemonade', type: 'light' },
  { id: 'night', name: 'Night', type: 'dark' },
  { id: 'coffee', name: 'Coffee', type: 'dark' },
  { id: 'winter', name: 'Winter', type: 'light' },
  { id: 'dim', name: 'Dim', type: 'dark' },
  { id: 'nord', name: 'Nord', type: 'light' },
  { id: 'sunset', name: 'Sunset', type: 'dark' }
];

// Validator for theme - must be in available themes
function isValidTheme(value) {
  return value && availableThemes.some(t => t.id === value);
}

function getInitialTheme() {
  const stored = loadFromStorage(STORAGE_KEYS.THEME, 'dark');
  return isValidTheme(stored) ? stored : 'dark';
}

export const theme = $state({ current: getInitialTheme() });

export function setTheme(newTheme) {
  theme.current = newTheme;
  saveToStorage(STORAGE_KEYS.THEME, theme.current);
  applyTheme();
}

export function applyTheme() {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme.current);
  }
}

// Apply theme on load
if (typeof window !== 'undefined') {
  applyTheme();
}
