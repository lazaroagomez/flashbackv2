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
  const result = {};
  if (filters.search) result.search = filters.search;
  if (filters.platform_id) result.platform_id = filters.platform_id;
  if (filters.usb_type_id) result.usb_type_id = filters.usb_type_id;
  if (filters.model_id) result.model_id = filters.model_id;
  if (filters.technician_id) result.technician_id = filters.technician_id;
  if (filters.status) result.status = filters.status;
  return result;
}
