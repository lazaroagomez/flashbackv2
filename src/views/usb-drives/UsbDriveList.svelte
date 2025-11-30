<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import BulkEditModal from '../../lib/components/BulkEditModal.svelte';
  import MultiSearchInput from '../../lib/components/MultiSearchInput.svelte';
  import FloatingActionBar from '../../lib/components/FloatingActionBar.svelte';
  import KeyboardShortcutsModal from '../../lib/components/KeyboardShortcutsModal.svelte';
  import { UsbFilterBar, UsbDriveTable } from './components/index.js';

  let { navigate } = $props();

  // Data state
  let usbDrives = $state([]);
  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let technicians = $state([]);
  let loading = $state(true);

  // Selection state
  let selected = $state(new Set());
  let showBulkEdit = $state(false);

  // Scanner/search state
  let searchChips = $state([]);
  let scanMode = $state('select');
  let scanFeedback = $state(null);
  let scanFeedbackTimeout = null;
  let multiSearchInputRef = $state(null);

  // Cleanup timeout on component unmount to prevent memory leaks
  $effect(() => {
    return () => {
      if (scanFeedbackTimeout) {
        clearTimeout(scanFeedbackTimeout);
        scanFeedbackTimeout = null;
      }
    };
  });

  // UI state
  let showKeyboardShortcuts = $state(false);

  // Pagination
  const ITEMS_PER_PAGE = 50;
  let currentPage = $state(1);

  // Filters
  let filterPlatform = $state(null);
  let filterType = $state(null);
  let filterModel = $state(null);
  let filterTechnician = $state(null);
  let filterStatus = $state(null);
  let showLostRetired = $state(false);

  async function loadReferenceData() {
    try {
      [platforms, usbTypes, models, technicians] = await Promise.all([
        api.getPlatforms(false),
        api.getUsbTypes(null, false),
        api.getModels(false),
        api.getTechnicians(false)
      ]);
    } catch (e) {
      showError('Failed to load reference data');
    }
  }

  async function loadUsbDrives() {
    loading = true;
    try {
      const filters = {};
      if (filterPlatform) filters.platform_id = filterPlatform;
      if (filterType) filters.usb_type_id = filterType;
      if (filterModel) filters.model_id = filterModel;
      if (filterTechnician) filters.technician_id = filterTechnician;
      if (filterStatus) filters.status = filterStatus;

      usbDrives = await api.getUsbDrives(filters);
      currentPage = 1;
    } catch (e) {
      showError('Failed to load USB drives');
    } finally {
      loading = false;
    }
  }

  // Client-side filtering
  const filteredByStatus = $derived.by(() => {
    if (showLostRetired) return usbDrives;
    return usbDrives.filter(d => d.status !== 'lost' && d.status !== 'retired');
  });

  const filteredDrives = $derived.by(() => {
    if (searchChips.length === 0) return filteredByStatus;
    return filteredByStatus.filter(drive => {
      return searchChips.some(chip =>
        drive.usb_id?.toUpperCase().includes(chip) ||
        drive.technician_name?.toUpperCase().includes(chip) ||
        drive.custom_text?.toUpperCase().includes(chip) ||
        drive.hardware_serial?.toUpperCase().includes(chip)
      );
    });
  });

  const chipStatuses = $derived.by(() => {
    return searchChips.map(chip => ({
      term: chip,
      found: usbDrives.some(drive =>
        drive.usb_id?.toUpperCase() === chip ||
        drive.hardware_serial?.toUpperCase() === chip
      )
    }));
  });

  const hasActiveFilters = $derived(
    filterPlatform || filterType || filterModel || filterTechnician || filterStatus || searchChips.length > 0
  );

  const selectedArray = $derived(Array.from(selected));

  // Scan feedback helper
  function showScanFeedback(status, message) {
    if (scanFeedbackTimeout) clearTimeout(scanFeedbackTimeout);
    scanFeedback = { status, message };
    scanFeedbackTimeout = setTimeout(() => {
      scanFeedback = null;
    }, 1500);
  }

  // Scanner handlers
  function handleAddChip(term) {
    if (searchChips.includes(term)) {
      showScanFeedback('duplicate', `Already added: ${term}`);
      return;
    }

    searchChips = [...searchChips, term];
    currentPage = 1;

    const drive = usbDrives.find(d =>
      d.usb_id?.toUpperCase() === term ||
      d.hardware_serial?.toUpperCase() === term
    );

    if (drive) {
      showScanFeedback('success', `Found: ${drive.usb_id}`);
      if (scanMode === 'select') {
        selected = new Set([...selected, drive.id]);
      }
    } else {
      showScanFeedback('notfound', `Not found: ${term}`);
    }
  }

  function handleRemoveChip(term) {
    searchChips = searchChips.filter(c => c !== term);
    if (searchChips.length === 0) currentPage = 1;
  }

  function handleClearChips() {
    searchChips = [];
    currentPage = 1;
  }

  function handleModeToggle() {
    scanMode = scanMode === 'select' ? 'find' : 'select';
  }

  // Filter handlers
  function handleFilterChange() {
    loadUsbDrives();
  }

  function handleClearFilters() {
    searchChips = [];
    loadUsbDrives();
  }

  // Selection handlers
  function clearSelection() {
    selected = new Set();
  }

  // Bulk action handlers
  async function handlePrint() {
    if (selected.size === 0) return;
    try {
      const result = await api.printStickerBulk(selectedArray);
      showSuccess(`Generated ${result.count} sticker(s)`);
    } catch (e) {
      showError(e.message || 'Failed to print stickers');
    }
  }

  async function handleMarkUpdated() {
    if (selected.size === 0) return;
    try {
      await api.markAsUpdated(selectedArray, session.username);
      showSuccess(`Marked ${selected.size} drive(s) as updated`);
      clearSelection();
      loadUsbDrives();
    } catch (e) {
      showError(e.message || 'Failed to mark as updated');
    }
  }

  function handleBulkEditComplete() {
    clearSelection();
    loadUsbDrives();
  }

  function handleRowClick(usb) {
    navigate('usb-drive-detail', { id: usb.id });
  }

  // Keyboard shortcuts
  function handleKeydown(event) {
    const isInput = event.target.tagName === 'INPUT' &&
                    !event.target.classList.contains('scanner-input');

    if ((event.key === '/' || (event.ctrlKey && event.key === 'k')) && !isInput) {
      event.preventDefault();
      multiSearchInputRef?.focus();
    }

    if (event.key === '?' && !isInput) {
      event.preventDefault();
      showKeyboardShortcuts = true;
    }

    if (event.key === 'Escape') {
      if (showKeyboardShortcuts) {
        showKeyboardShortcuts = false;
      } else if (showBulkEdit) {
        showBulkEdit = false;
      } else if (selected.size > 0) {
        clearSelection();
      } else if (searchChips.length > 0) {
        handleClearChips();
      }
    }

    if (event.ctrlKey && event.key === 'a' && !isInput) {
      event.preventDefault();
      const newSelected = new Set(selected);
      filteredDrives.forEach(d => newSelected.add(d.id));
      selected = newSelected;
    }

    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      clearSelection();
    }

    if (event.ctrlKey && event.key === 'e' && selected.size > 0) {
      event.preventDefault();
      showBulkEdit = true;
    }

    if (event.ctrlKey && event.key === 'p' && selected.size > 0) {
      event.preventDefault();
      handlePrint();
    }
  }

  $effect(() => {
    loadReferenceData();
    loadUsbDrives();

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  $effect(() => {
    if (!loading && multiSearchInputRef) {
      setTimeout(() => multiSearchInputRef?.focus(), 100);
    }
  });
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">USB Drives</h1>
    <div class="flex items-center gap-2">
      <button
        class="btn btn-ghost btn-sm"
        onclick={() => showKeyboardShortcuts = true}
        title="Keyboard Shortcuts (?)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
      <button class="btn btn-primary" onclick={() => navigate('usb-drive-create')}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create USB Drive
      </button>
    </div>
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <!-- Scanner Input -->
      <div class="mb-4">
        <MultiSearchInput
          bind:this={multiSearchInputRef}
          bind:chips={searchChips}
          {chipStatuses}
          mode={scanMode}
          {scanFeedback}
          placeholder="Scan USB ID or Serial... (Enter to add)"
          onAdd={handleAddChip}
          onRemove={handleRemoveChip}
          onClear={handleClearChips}
          onModeToggle={handleModeToggle}
        />
      </div>

      <!-- Filters -->
      <UsbFilterBar
        bind:filterPlatform
        bind:filterType
        bind:filterModel
        bind:filterTechnician
        bind:filterStatus
        bind:showLostRetired
        {platforms}
        {usbTypes}
        {models}
        {technicians}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <!-- Table -->
      <UsbDriveTable
        drives={filteredDrives}
        {loading}
        {hasActiveFilters}
        bind:selected
        itemsPerPage={ITEMS_PER_PAGE}
        bind:currentPage
        onRowClick={handleRowClick}
      />
    </div>
  </div>
</div>

<!-- Floating Action Bar -->
<FloatingActionBar
  selectedCount={selected.size}
  onEdit={() => showBulkEdit = true}
  onPrint={handlePrint}
  onMarkUpdated={handleMarkUpdated}
  onClear={clearSelection}
/>

<!-- Modals -->
<BulkEditModal
  bind:open={showBulkEdit}
  selectedIds={selectedArray}
  onupdate={handleBulkEditComplete}
/>

<KeyboardShortcutsModal bind:open={showKeyboardShortcuts} />
