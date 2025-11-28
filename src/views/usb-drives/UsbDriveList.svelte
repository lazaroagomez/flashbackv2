<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import TechnicianWarning from '../../lib/components/TechnicianWarning.svelte';
  import SearchBar from '../../lib/components/SearchBar.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import BulkEditModal from '../../lib/components/BulkEditModal.svelte';

  let { navigate } = $props();

  let usbDrives = $state([]);
  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let technicians = $state([]);
  let loading = $state(true);
  let selected = $state([]);
  let showBulkEdit = $state(false);

  // Filters
  let search = $state('');
  let filterPlatform = $state(null);
  let filterType = $state(null);
  let filterModel = $state(null);
  let filterTechnician = $state(null);
  let filterStatus = $state(null);

  let selectedTypeRequiresModel = $state(false);

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
      if (search) filters.search = search;
      if (filterPlatform) filters.platform_id = filterPlatform;
      if (filterType) filters.usb_type_id = filterType;
      if (filterModel) filters.model_id = filterModel;
      if (filterTechnician) filters.technician_id = filterTechnician;
      if (filterStatus) filters.status = filterStatus;

      usbDrives = await api.getUsbDrives(filters);
    } catch (e) {
      showError('Failed to load USB drives');
    } finally {
      loading = false;
    }
  }

  function handleSearch(value) {
    search = value;
    loadUsbDrives();
  }

  const statusOptions = [
    { id: 'assigned', name: 'Assigned' },
    { id: 'pending_update', name: 'Pending Update' },
    { id: 'damaged', name: 'Damaged' },
    { id: 'lost', name: 'Lost' },
    { id: 'retired', name: 'Retired' }
  ];

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
    search = '';
    filterPlatform = null;
    filterType = null;
    filterModel = null;
    filterTechnician = null;
    filterStatus = null;
    selectedTypeRequiresModel = false;
    loadUsbDrives();
  }

  function toggleSelect(id) {
    if (selected.includes(id)) {
      selected = selected.filter(s => s !== id);
    } else {
      selected = [...selected, id];
    }
  }

  function toggleSelectAll() {
    if (selected.length === usbDrives.length) {
      selected = [];
    } else {
      selected = usbDrives.map(u => u.id);
    }
  }

  async function printSelected() {
    if (selected.length === 0) {
      showError('No USB drives selected');
      return;
    }
    try {
      const result = await api.printStickerBulk(selected);
      showSuccess(`Generated ${result.count} sticker(s)`);
    } catch (e) {
      showError(e.message || 'Failed to print stickers');
    }
  }

  function handleBulkEditComplete() {
    selected = [];
    loadUsbDrives();
  }

  function handleRowClick(usb, event) {
    // Ctrl+click for multi-select
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleSelect(usb.id);
    } else {
      navigate('usb-drive-detail', { id: usb.id });
    }
  }

  const filteredTypes = $derived.by(() => {
    if (!filterPlatform) return usbTypes;
    return usbTypes.filter(t => t.platform_id === filterPlatform);
  });

  const hasActiveFilters = $derived(
    search || filterPlatform || filterType || filterModel || filterTechnician || filterStatus
  );

  $effect(() => {
    loadReferenceData();
    loadUsbDrives();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">USB Drives</h1>
    <div class="flex gap-2">
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
          <li><button onclick={() => navigate('usb-drive-create')}>Single USB</button></li>
          <li><button onclick={() => navigate('usb-drive-create-series')}>Series (Bulk)</button></li>
        </ul>
      </div>
    </div>
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <!-- Search and Filters -->
      <div class="flex flex-wrap gap-4 mb-4 items-end">
        <div class="w-64">
          <SearchBar
            value={search}
            placeholder="Search USB ID, technician, model..."
            oninput={handleSearch}
          />
        </div>

        <div class="w-40">
          <SearchableSelect
            bind:value={filterPlatform}
            options={platforms}
            placeholder="All Platforms"
            onchange={handlePlatformChange}
          />
        </div>

        <div class="w-40">
          <SearchableSelect
            bind:value={filterType}
            options={filteredTypes}
            placeholder="All Types"
            onchange={handleTypeChange}
          />
        </div>

        {#if selectedTypeRequiresModel}
          <div class="w-40">
            <SearchableSelect
              bind:value={filterModel}
              options={models}
              placeholder="All Models"
              onchange={handleModelChange}
            />
          </div>
        {/if}

        <div class="w-40">
          <SearchableSelect
            bind:value={filterTechnician}
            options={technicians}
            placeholder="All Technicians"
            onchange={handleTechnicianChange}
          />
        </div>

        <div class="w-40">
          <SearchableSelect
            bind:value={filterStatus}
            options={statusOptions}
            valueField="id"
            placeholder="All Statuses"
            onchange={handleStatusChange}
          />
        </div>

        {#if hasActiveFilters}
          <button class="btn btn-ghost btn-sm" onclick={clearFilters}>
            Clear Filters
          </button>
        {/if}
      </div>

      <!-- Bulk Actions -->
      {#if selected.length > 0}
        <div class="flex items-center gap-4 mb-4 p-2 bg-base-200 rounded">
          <span>{selected.length} selected</span>
          <button class="btn btn-sm btn-primary" onclick={() => showBulkEdit = true}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Bulk Edit
          </button>
          <button class="btn btn-sm btn-outline" onclick={printSelected}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Stickers
          </button>
          <button class="btn btn-sm btn-ghost" onclick={() => selected = []}>
            Clear Selection
          </button>
        </div>
      {/if}

      <!-- Table -->
      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if usbDrives.length === 0}
        <div class="text-center py-8 text-base-content/50">
          {hasActiveFilters ? 'No USB drives match your filters' : 'No USB drives found. Create one to get started.'}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={selected.length === usbDrives.length}
                    onchange={toggleSelectAll}
                  />
                </th>
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
              {#each usbDrives as usb}
                <tr
                  class="hover cursor-pointer"
                  class:bg-primary={selected.includes(usb.id)}
                  class:bg-opacity-20={selected.includes(usb.id)}
                  onclick={(e) => handleRowClick(usb, e)}
                >
                  <td onclick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={selected.includes(usb.id)}
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
        <div class="text-sm text-base-content/50 mt-2 flex justify-between">
          <span>Showing {usbDrives.length} USB drive(s)</span>
          <span class="opacity-60">Ctrl+click to multi-select</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<BulkEditModal
  bind:open={showBulkEdit}
  selectedIds={selected}
  onupdate={handleBulkEditComplete}
/>
