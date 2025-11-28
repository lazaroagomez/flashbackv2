/**
 * Pagination Composable
 * Reusable pagination state management for Svelte 5
 */

/**
 * Create pagination state and helpers
 * @param {Function} getItems - Function that returns the items array (for reactivity)
 * @param {number} perPage - Items per page (default: 50)
 * @returns {Object} - Pagination state and methods
 */
export function createPagination(getItems, perPage = 50) {
  let currentPage = $state(1);

  const totalPages = $derived(Math.ceil(getItems().length / perPage));

  const paginatedItems = $derived.by(() => {
    const items = getItems();
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  });

  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function nextPage() {
    goToPage(currentPage + 1);
  }

  function prevPage() {
    goToPage(currentPage - 1);
  }

  function firstPage() {
    goToPage(1);
  }

  function lastPage() {
    goToPage(totalPages);
  }

  function reset() {
    currentPage = 1;
  }

  return {
    get currentPage() { return currentPage; },
    set currentPage(val) { currentPage = val; },
    get totalPages() { return totalPages; },
    get paginatedItems() { return paginatedItems; },
    get perPage() { return perPage; },
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset
  };
}
