// Navigation store using Svelte 5 runes
// Manages current view and view parameters
// Persists navigation state to localStorage

import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../utils/localStorage.js';

// Validator for navigation data - don't restore detail views
function validateNavigation(data) {
  if (!data || !data.currentView) return false;
  // Don't restore detail views with params (they may be stale)
  return !data.currentView.includes('-detail');
}

// Transform for detail views - go to parent list
function transformNavigation(data) {
  if (data?.currentView?.includes('-detail')) {
    return {
      currentView: data.currentView.replace('-detail', 's'),
      viewParams: {}
    };
  }
  return data;
}

// Initialize from localStorage
function getInitialState() {
  const defaultState = { currentView: 'dashboard', viewParams: {} };
  let data = loadFromStorage(STORAGE_KEYS.NAVIGATION, defaultState);

  // Handle detail view transformation
  if (data?.currentView?.includes('-detail')) {
    data = transformNavigation(data);
  }

  return data || defaultState;
}

const initialState = getInitialState();

export const navigation = $state({
  currentView: initialState.currentView,
  viewParams: initialState.viewParams
});

export function navigate(view, params = {}) {
  navigation.currentView = view;
  navigation.viewParams = params;

  // Save to localStorage
  saveToStorage(STORAGE_KEYS.NAVIGATION, {
    currentView: view,
    viewParams: params
  });
}

export function getCurrentView() {
  return navigation.currentView;
}

export function getViewParams() {
  return navigation.viewParams;
}
