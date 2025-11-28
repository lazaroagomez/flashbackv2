/**
 * Multi-Select Composable
 * Reusable selection state management for tables/lists
 */

/**
 * Create multi-select state and helpers
 * @param {Function} getPageItemIds - Function that returns array of IDs for current page
 * @returns {Object} - Selection state and methods
 */
export function createMultiSelect(getPageItemIds) {
  let selected = $state([]);

  const allPageSelected = $derived.by(() => {
    const pageIds = getPageItemIds();
    return pageIds.length > 0 && pageIds.every(id => selected.includes(id));
  });

  const somePageSelected = $derived.by(() => {
    const pageIds = getPageItemIds();
    return pageIds.some(id => selected.includes(id)) && !allPageSelected;
  });

  function toggleSelect(id) {
    if (selected.includes(id)) {
      selected = selected.filter(s => s !== id);
    } else {
      selected = [...selected, id];
    }
  }

  function toggleSelectAll() {
    const pageIds = getPageItemIds();
    if (allPageSelected) {
      selected = selected.filter(id => !pageIds.includes(id));
    } else {
      selected = [...new Set([...selected, ...pageIds])];
    }
  }

  function isSelected(id) {
    return selected.includes(id);
  }

  function clearSelection() {
    selected = [];
  }

  function selectOnly(ids) {
    selected = [...ids];
  }

  /**
   * Handle row click with Ctrl/Cmd key support
   * @param {number} id - Item ID
   * @param {MouseEvent} event - Click event
   * @param {Function} defaultAction - Action to perform if not Ctrl/Cmd click
   */
  function handleRowClick(id, event, defaultAction) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleSelect(id);
    } else {
      defaultAction();
    }
  }

  return {
    get selected() { return selected; },
    set selected(val) { selected = val; },
    get count() { return selected.length; },
    get allPageSelected() { return allPageSelected; },
    get somePageSelected() { return somePageSelected; },
    toggleSelect,
    toggleSelectAll,
    isSelected,
    clearSelection,
    selectOnly,
    handleRowClick
  };
}
