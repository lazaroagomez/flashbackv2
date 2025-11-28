/**
 * Bulk Import Composable
 * Reusable bulk import logic with duplicate detection
 */

/**
 * Create bulk import state and handlers
 * @param {Object} config - Configuration object
 * @param {Function} config.checkSimilar - Function to check for similar items (returns Promise)
 * @param {Function} config.createItem - Function to create an item (returns Promise)
 * @param {Function} config.parseItem - Function to parse a line into item data
 * @param {string} config.entityName - Name of the entity (for messages)
 * @param {Function} config.onComplete - Callback when import completes (optional)
 * @returns {Object} - Bulk import state and methods
 */
export function createBulkImport(config) {
  const { checkSimilar, createItem, parseItem, entityName, onComplete } = config;

  let bulkText = $state('');
  let bulkParsed = $state([]);
  let saving = $state(false);
  let showDuplicateConfirm = $state(false);
  let similarItems = $state([]);
  let pendingItem = $state(null);
  let results = $state({ created: 0, skipped: 0, failed: 0 });

  // Internal queue state
  let queue = [];
  let queueIndex = 0;

  function parseBulkText() {
    const lines = bulkText.split('\n').filter(line => line.trim());
    bulkParsed = lines.map(parseItem);
  }

  async function startImport() {
    const validItems = bulkParsed.filter(item => item.valid);
    if (validItems.length === 0) {
      return { success: false, message: `No valid ${entityName}s to import` };
    }

    queue = validItems;
    queueIndex = 0;
    results = { created: 0, skipped: 0, failed: 0 };
    saving = true;

    await processQueue();
    return { success: true };
  }

  async function processQueue() {
    while (queueIndex < queue.length) {
      const item = queue[queueIndex];

      // Check for duplicates
      const similar = await checkSimilar(item);
      if (similar.length > 0) {
        similarItems = similar;
        pendingItem = item;
        showDuplicateConfirm = true;
        return; // Wait for user decision
      }

      // No duplicate, create it
      try {
        await createItem(item);
        results = { ...results, created: results.created + 1 };
      } catch (e) {
        results = { ...results, failed: results.failed + 1 };
      }
      queueIndex++;
    }

    finishImport();
  }

  async function continueImport(shouldCreate) {
    showDuplicateConfirm = false;

    if (shouldCreate && pendingItem) {
      try {
        await createItem(pendingItem);
        results = { ...results, created: results.created + 1 };
      } catch (e) {
        results = { ...results, failed: results.failed + 1 };
      }
    } else {
      results = { ...results, skipped: results.skipped + 1 };
    }

    pendingItem = null;
    queueIndex++;
    await processQueue();
  }

  function confirmDuplicate() {
    continueImport(true);
  }

  function skipDuplicate() {
    continueImport(false);
  }

  function finishImport() {
    saving = false;
    const { created, skipped, failed } = results;

    let message = '';
    if (created > 0 || skipped > 0) {
      message = `Created ${created} ${entityName}(s)`;
      if (skipped > 0) message += `, ${skipped} skipped`;
      if (failed > 0) message += `, ${failed} failed`;
    } else if (failed > 0) {
      message = `Failed to create any ${entityName}s`;
    }

    if (onComplete) {
      onComplete({ results, message, success: created > 0 || skipped > 0 });
    }
  }

  function reset() {
    bulkText = '';
    bulkParsed = [];
    saving = false;
    showDuplicateConfirm = false;
    similarItems = [];
    pendingItem = null;
    results = { created: 0, skipped: 0, failed: 0 };
    queue = [];
    queueIndex = 0;
  }

  return {
    // State
    get bulkText() { return bulkText; },
    set bulkText(val) { bulkText = val; },
    get bulkParsed() { return bulkParsed; },
    get saving() { return saving; },
    get showDuplicateConfirm() { return showDuplicateConfirm; },
    get similarItems() { return similarItems; },
    get pendingItem() { return pendingItem; },
    get results() { return results; },

    // Methods
    parseBulkText,
    startImport,
    confirmDuplicate,
    skipDuplicate,
    reset
  };
}
