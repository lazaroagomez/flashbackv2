<script>
  import SearchableSelect from '../../../lib/components/SearchableSelect.svelte';

  /**
   * Filter bar component for USB drives list
   * Handles platform, type, model, technician, and status filtering
   */
  let {
    // Filter values (bindable)
    filterPlatform = $bindable(null),
    filterType = $bindable(null),
    filterModel = $bindable(null),
    filterTechnician = $bindable(null),
    filterStatus = $bindable(null),
    showLostRetired = $bindable(false),

    // Reference data
    platforms = [],
    usbTypes = [],
    models = [],
    technicians = [],

    // Callbacks
    onFilterChange = () => {},
    onClearFilters = () => {}
  } = $props();

  let expanded = $state(true);
  let selectedTypeRequiresModel = $state(false);

  // Status options
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

  // Filter types based on selected platform
  const filteredTypes = $derived.by(() => {
    if (!filterPlatform) return usbTypes;
    return usbTypes.filter(t => t.platform_id === filterPlatform);
  });

  const hasActiveFilters = $derived(
    filterPlatform || filterType || filterModel || filterTechnician || filterStatus
  );

  function handlePlatformChange(val) {
    filterPlatform = val;
    filterType = null;
    filterModel = null;
    selectedTypeRequiresModel = false;
    onFilterChange();
  }

  function handleTypeChange(val) {
    filterType = val;
    filterModel = null;
    const type = usbTypes.find(t => t.id === val);
    selectedTypeRequiresModel = type?.requires_model || false;
    onFilterChange();
  }

  function handleModelChange(val) {
    filterModel = val;
    onFilterChange();
  }

  function handleTechnicianChange(val) {
    filterTechnician = val;
    onFilterChange();
  }

  function handleStatusChange(val) {
    filterStatus = val;
    onFilterChange();
  }

  function clearFilters() {
    filterPlatform = null;
    filterType = null;
    filterModel = null;
    filterTechnician = null;
    filterStatus = null;
    selectedTypeRequiresModel = false;
    onClearFilters();
  }
</script>

<div class="mb-4">
  <button
    class="flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content mb-2"
    onclick={() => expanded = !expanded}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 transition-transform"
      class:rotate-90={expanded}
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

  {#if expanded}
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
