// Navigation store using Svelte 5 runes
// Manages current view and view parameters
// Persists navigation state to localStorage

const NAV_KEY = 'flashback_navigation';

// Initialize from localStorage
function getInitialState() {
  try {
    const stored = localStorage.getItem(NAV_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Don't restore detail views with params (they may be stale)
      if (data.currentView && !data.currentView.includes('-detail')) {
        return data;
      }
      // For detail views, go to the parent list view
      if (data.currentView?.includes('-detail')) {
        const parentView = data.currentView.replace('-detail', 's');
        return { currentView: parentView, viewParams: {} };
      }
    }
  } catch (e) {
    console.error('Failed to restore navigation:', e);
  }
  return { currentView: 'dashboard', viewParams: {} };
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
  try {
    localStorage.setItem(NAV_KEY, JSON.stringify({
      currentView: view,
      viewParams: params
    }));
  } catch (e) {
    console.error('Failed to save navigation:', e);
  }
}

export function getCurrentView() {
  return navigation.currentView;
}

export function getViewParams() {
  return navigation.viewParams;
}
