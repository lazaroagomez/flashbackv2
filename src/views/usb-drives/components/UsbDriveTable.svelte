<script>
  import StatusBadge from '../../../lib/components/StatusBadge.svelte';
  import TechnicianWarning from '../../../lib/components/TechnicianWarning.svelte';
  import Pagination from '../../../lib/components/Pagination.svelte';

  /**
   * Table component for displaying USB drives
   * Handles row selection and pagination
   */
  let {
    // Data
    drives = [],
    loading = false,
    hasActiveFilters = false,

    // Selection (bindable)
    selected = $bindable(new Set()),

    // Pagination
    itemsPerPage = 50,
    currentPage = $bindable(1),

    // Callbacks
    onRowClick = (usb, event) => {},
    onNavigate = () => {}
  } = $props();

  // Pagination computations
  const totalPages = $derived(Math.ceil(drives.length / itemsPerPage));
  const paginatedDrives = $derived.by(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return drives.slice(start, start + itemsPerPage);
  });

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

  function handleRowClick(usb, event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleSelect(usb.id);
    } else {
      onRowClick(usb, event);
    }
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }
</script>

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
    {drives.length} result{drives.length !== 1 ? 's' : ''}
  </div>
</div>

<!-- Table Content -->
{#if loading}
  <div class="flex justify-center py-8">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if drives.length === 0}
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
      Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, drives.length)} of {drives.length}
      <span class="ml-4 opacity-60">Ctrl+click to multi-select | Press ? for shortcuts</span>
    </div>
    <Pagination {currentPage} {totalPages} onPageChange={goToPage} />
  </div>
{/if}
