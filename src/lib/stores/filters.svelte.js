// Filters store using Svelte 5 runes
// Manages search and filter state for USB drives list

export const filters = $state({
  search: '',
  platform_id: null,
  usb_type_id: null,
  model_id: null,
  technician_id: null,
  status: null
});

export function setFilter(key, value) {
  filters[key] = value;

  // Reset dependent filters when parent changes
  if (key === 'platform_id') {
    filters.usb_type_id = null;
    filters.model_id = null;
  }
  if (key === 'usb_type_id') {
    filters.model_id = null;
  }
}

export function resetFilters() {
  filters.search = '';
  filters.platform_id = null;
  filters.usb_type_id = null;
  filters.model_id = null;
  filters.technician_id = null;
  filters.status = null;
}

export function getFilters() {
  return Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v != null && v !== '')
  );
}
