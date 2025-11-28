<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import TechnicianWarning from '../../lib/components/TechnicianWarning.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import BulkEditModal from '../../lib/components/BulkEditModal.svelte';
  import Pagination from '../../lib/components/Pagination.svelte';
  import MultiSearchInput from '../../lib/components/MultiSearchInput.svelte';
  import FloatingActionBar from '../../lib/components/FloatingActionBar.svelte';
  import KeyboardShortcutsModal from '../../lib/components/KeyboardShortcutsModal.svelte';

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
  let scanMode = $state('select'); // 'select' = auto-select on scan, 'find' = just filter
  let scanFeedback = $state(null);
  let scanFeedbackTimeout = null;
  let multiSearchInputRef = $state(null);

  // UI state
  let showKeyboardShortcuts = $state(false);
  let filtersExpanded = $state(true);

  // Pagination
  const ITEMS_PER_PAGE = 50;
  let currentPage = $state(1);

  // Filters
  let filterPlatform = $state(null);
  let filterType = $state(null);
  let filterModel = $state(null);
  let filterTechnician = $state(null);
  let filterStatus = $state(null);
  let showLostRetired = $state(false); // Hidden by default per requirements

  let selectedTypeRequiresModel = $state(false);

  // Status options - active statuses shown by default
  const activeStatusOptions = [
    { id: 'assigned', name: 'Assigned' },
    { id: 'pending_update', name: 'Pending Update' }
  ];

  const allStatusOptions = [
    { id: 'assigned', name: 'Assigned' },
    { id: 'pending_update', name: 'Pending Update' },
    { id: 'lost', name: 'Lost' },
    { id: 'retired', name: 'Retired' }
  ];

  const statusOptions = $derived(showLostRetired ? allStatusOptions : activeStatusOptions);

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

  // Client-side filtering for search chips
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
        drive.custom_text?.toUpperCase().includes(chip)
      );
    });
  });

  // Track which chips found matches
  const chipStatuses = $derived.by(() => {
    return searchChips.map(chip => ({
      term: chip,
      found: usbDrives.some(drive =>
        drive.usb_id?.toUpperCase() === chip
      )
    }));
  });

  // Pagination
  const totalPages = $derived(Math.ceil(filteredDrives.length / ITEMS_PER_PAGE));
  const paginatedDrives = $derived.by(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDrives.slice(start, start + ITEMS_PER_PAGE);
  });

  const filteredTypes = $derived.by(() => {
    if (!filterPlatform) return usbTypes;
    return usbTypes.filter(t => t.platform_id === filterPlatform);
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

  // Scanner input handlers
  function handleAddChip(term) {
    if (searchChips.includes(term)) {
      showScanFeedback('duplicate', `Already added: ${term}`);
      return;
    }

    searchChips = [...searchChips, term];
    currentPage = 1;

    // Check if found
    const drive = usbDrives.find(d => d.usb_id?.toUpperCase() === term);
    if (drive) {
      showScanFeedback('success', `Found: ${term}`);
      // Auto-select if in select mode
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
  function handlePlatformChange(val) {
    filterPlatform = val;
    filterType = null;
    filterModel = null;
    loadUsbDrives();
  }

  function handleTypeChange(val) {
    filterType = val;
    filterModel = null;
    const type = usbTypes.find(t => t.id === val);
    selectedTypeRequiresModel = type?.requires_model || false;
    loadUsbDrives();
  }

  function handleModelChange(val) {
    filterModel = val;
    loadUsbDrives();
  }

  function handleTechnicianChange(val) {
    filterTechnician = val;
    loadUsbDrives();
  }

  function handleStatusChange(val) {
    filterStatus = val;
    loadUsbDrives();
  }

  function clearFilters() {
    searchChips = [];
    filterPlatform = null;
    filterType = null;
    filterModel = null;
    filterTechnician = null;
    filterStatus = null;
    selectedTypeRequiresModel = false;
    loadUsbDrives();
  }

  // Selection handlers
  function toggleSelect(id) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    selected = newSelected;
  }

  function toggleSelectAll() {
    const pageIds = paginatedDrives.map(u => u.id);
    const allPageSelected = pageIds.every(id => selected.has(id));
    const newSelected = new Set(selected);

    if (allPageSelected) {
      pageIds.forEach(id => newSelected.delete(id));
    } else {
      pageIds.forEach(id => newSelected.add(id));
    }
    selected = newSelected;
  }

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

  function handleRowClick(usb, event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleSelect(usb.id);
    } else {
      navigate('usb-drive-detail', { id: usb.id });
    }
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  // Keyboard shortcuts
  function handleKeydown(event) {
    const isInput = event.target.tagName === 'INPUT' &&
                    !event.target.classList.contains('scanner-input');

    // Focus scanner: / or Ctrl+K
    if ((event.key === '/' || (event.ctrlKey && event.key === 'k')) && !isInput) {
      event.preventDefault();
      multiSearchInputRef?.focus();
    }

    // Show shortcuts: ?
    if (event.key === '?' && !isInput) {
      event.preventDefault();
      showKeyboardShortcuts = true;
    }

    // Escape: close modal, clear selection, or clear search
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

    // Select all: Ctrl+A
    if (event.ctrlKey && event.key === 'a' && !isInput) {
      event.preventDefault();
      const newSelected = new Set(selected);
      paginatedDrives.forEach(d => newSelected.add(d.id));
      selected = newSelected;
    }

    // Clear selection: Ctrl+Shift+A
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      clearSelection();
    }

    // Bulk edit: Ctrl+E
    if (event.ctrlKey && event.key === 'e' && selected.size > 0) {
      event.preventDefault();
      showBulkEdit = true;
    }

    // Print: Ctrl+P (only when items selected)
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

  // Auto-focus scanner input on mount
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
          placeholder="Scan or type USB IDs... (Enter to add)"
          onAdd={handleAddChip}
          onRemove={handleRemoveChip}
          onClear={handleClearChips}
          onModeToggle={handleModeToggle}
        />
      </div>

      <!-- Filters Section -->
      <div class="mb-4">
        <button
          class="flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content mb-2"
          onclick={() => filtersExpanded = !filtersExpanded}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform"
            class:rotate-90={filtersExpanded}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Filters
          {#if hasActiveFilters}
            <span class="badge badge-primary badge-xs">Active</span>
          {/if}
        </button>

        {#if filtersExpanded}
          <div class="flex flex-wrap gap-4 items-end p-3 bg-base-200 rounded-lg">
            <div class="w-36">
              <SearchableSelect
                bind:value={filterPlatform}
                options={platforms}
                placeholder="All Platforms"
                onchange={handlePlatformChange}
              />
            </div>

            <div class="w-36">
              <SearchableSelect
                bind:value={filterType}
                options={filteredTypes}
                placeholder="All Types"
                onchange={handleTypeChange}
              />
            </div>

            {#if selectedTypeRequiresModel}
              <div class="w-36">
                <SearchableSelect
                  bind:value={filterModel}
                  options={models}
                  placeholder="All Models"
                  onchange={handleModelChange}
                />
              </div>
            {/if}

            <div class="w-36">
              <SearchableSelect
                bind:value={filterTechnician}
                options={technicians}
                placeholder="All Technicians"
                onchange={handleTechnicianChange}
              />
            </div>

            <div class="w-36">
              <SearchableSelect
                bind:value={filterStatus}
                options={statusOptions}
                valueField="id"
                placeholder="All Statuses"
                onchange={handleStatusChange}
              />
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                bind:checked={showLostRetired}
              />
              <span class="text-sm">Show Lost/Retired</span>
            </label>

            {#if hasActiveFilters}
              <button class="btn btn-ghost btn-sm" onclick={clearFilters}>
                Clear All
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Table Header -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={paginatedDrives.length > 0 && paginatedDrives.every(u => selected.has(u.id))}
              onchange={toggleSelectAll}
            />
            <span class="text-sm">Select All (Page)</span>
          </label>
          {#if selected.size > 0}
            <span class="text-sm text-base-content/60">
              {selected.size} selected
            </span>
          {/if}
        </div>
        <div class="text-sm text-base-content/60">
          {filteredDrives.length} result{filteredDrives.length !== 1 ? 's' : ''}
        </div>
      </div>

      <!-- Table -->
      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if filteredDrives.length === 0}
        <div class="text-center py-8 text-base-content/50">
          {hasActiveFilters ? 'No USB drives match your filters' : 'No USB drives found. Create one to get started.'}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th class="w-10"></th>
                <th>USB ID</th>
                <th>Platform</th>
                <th>Type</th>
                <th>Model</th>
                <th>Version</th>
                <th>Technician</th>
                <th>Status</th>
                <th>Custom</th>
              </tr>
            </thead>
            <tbody>
              {#each paginatedDrives as usb}
                <tr
                  class="hover cursor-pointer transition-colors"
                  class:bg-primary={selected.has(usb.id)}
                  class:bg-opacity-20={selected.has(usb.id)}
                  onclick={(e) => handleRowClick(usb, e)}
                >
                  <td onclick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={selected.has(usb.id)}
                      onchange={() => toggleSelect(usb.id)}
                    />
                  </td>
                  <td class="font-mono font-bold">{usb.usb_id}</td>
                  <td>{usb.platform_name}</td>
                  <td>{usb.usb_type_name}</td>
                  <td>{usb.model_name || '-'}</td>
                  <td>
                    <span class:text-warning={!usb.version_is_current && !usb.is_legacy_valid}>
                      {usb.version_code}
                    </span>
                    {#if usb.version_is_current}
                      <span class="badge badge-success badge-xs ml-1">latest</span>
                    {:else if usb.is_legacy_valid}
                      <span class="badge badge-info badge-xs ml-1">legacy</span>
                    {/if}
                  </td>
                  <td>
                    {#if usb.technician_name}
                      <TechnicianWarning
                        technicianStatus={usb.technician_status}
                        technicianName={usb.technician_name}
                      />
                    {:else}
                      <span class="text-base-content/50">-</span>
                    {/if}
                  </td>
                  <td><StatusBadge status={usb.status} /></td>
                  <td class="text-sm">{usb.custom_text || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="flex justify-between items-center mt-4">
          <div class="text-sm text-base-content/50">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDrives.length)} of {filteredDrives.length}
            <span class="ml-4 opacity-60">Ctrl+click to multi-select | Press ? for shortcuts</span>
          </div>
          <Pagination {currentPage} {totalPages} onPageChange={goToPage} />
        </div>
      {/if}
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
