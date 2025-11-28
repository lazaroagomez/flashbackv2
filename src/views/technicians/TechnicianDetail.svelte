<script>
  import { api } from '../../lib/api.js';
  import { showError, showSuccess } from '../../lib/stores/toast.svelte.js';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import BulkEditModal from '../../lib/components/BulkEditModal.svelte';

  let { id, navigate } = $props();

  let technician = $state(null);
  let usbDrives = $state([]);
  let loading = $state(true);
  let filterStatus = $state(null);
  let selected = $state([]);
  let showBulkEdit = $state(false);

  async function loadData() {
    loading = true;
    try {
      [technician, usbDrives] = await Promise.all([
        api.getTechnician(id),
        api.getTechnicianUsbDrives(id)
      ]);
    } catch (e) {
      showError('Failed to load technician details');
    } finally {
      loading = false;
    }
  }

  const filteredDrives = $derived.by(() => {
    if (!filterStatus) return usbDrives;
    return usbDrives.filter(u => u.status === filterStatus);
  });

  const stats = $derived.by(() => {
    if (!usbDrives) return { total: 0, assigned: 0, pending: 0, other: 0 };
    return {
      total: usbDrives.length,
      assigned: usbDrives.filter(u => u.status === 'assigned').length,
      pending: usbDrives.filter(u => u.status === 'pending_update').length,
      other: usbDrives.filter(u => !['assigned', 'pending_update'].includes(u.status)).length
    };
  });

  function toggleSelect(driveId) {
    if (selected.includes(driveId)) {
      selected = selected.filter(s => s !== driveId);
    } else {
      selected = [...selected, driveId];
    }
  }

  function toggleSelectAll() {
    if (selected.length === filteredDrives.length) {
      selected = [];
    } else {
      selected = filteredDrives.map(u => u.id);
    }
  }

  function handleRowClick(usb, event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleSelect(usb.id);
    } else {
      navigate('usb-drive-detail', { id: usb.id });
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
    loadData();
  }

  $effect(() => {
    if (id) loadData();
  });
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <button class="btn btn-ghost btn-sm" onclick={() => navigate('technicians')}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <h1 class="text-2xl font-bold">Technician Details</h1>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if !technician}
    <div class="alert alert-error">Technician not found</div>
  {:else}
    <!-- Technician Info Card -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="card-title">{technician.name}</h2>
          </div>
          <StatusBadge status={technician.status} />
        </div>
        {#if technician.notes}
          <p class="mt-2">{technician.notes}</p>
        {/if}
        <p class="text-base-content/60 text-sm mt-2">
          Created: {new Date(technician.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full">
      <div class="stat cursor-pointer hover:bg-base-200" onclick={() => filterStatus = null}>
        <div class="stat-title">Total USBs</div>
        <div class="stat-value">{stats.total}</div>
      </div>
      <div class="stat cursor-pointer hover:bg-base-200" onclick={() => filterStatus = 'assigned'}>
        <div class="stat-title">Assigned</div>
        <div class="stat-value text-success">{stats.assigned}</div>
      </div>
      <div class="stat cursor-pointer hover:bg-base-200" onclick={() => filterStatus = 'pending_update'}>
        <div class="stat-title">Pending Update</div>
        <div class="stat-value text-warning">{stats.pending}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Other</div>
        <div class="stat-value">{stats.other}</div>
      </div>
    </div>

    <!-- USB Drives List -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title">Assigned USB Drives</h3>
          {#if filterStatus}
            <button class="btn btn-ghost btn-sm" onclick={() => filterStatus = null}>
              Clear filter: {filterStatus}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
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

        {#if filteredDrives.length === 0}
          <p class="text-base-content/50">
            {filterStatus ? `No USB drives with status "${filterStatus}"` : 'No USB drives assigned to this technician'}
          </p>
        {:else}
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={selected.length === filteredDrives.length && filteredDrives.length > 0}
                      onchange={toggleSelectAll}
                    />
                  </th>
                  <th>USB ID</th>
                  <th>Platform</th>
                  <th>Type</th>
                  <th>Model</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredDrives as usb}
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
                    <td>{usb.version_code}</td>
                    <td><StatusBadge status={usb.status} /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div class="text-sm text-base-content/50 mt-2 flex justify-between">
            <span>Showing {filteredDrives.length} USB drive(s)</span>
            <span class="opacity-60">Ctrl+click to multi-select</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<BulkEditModal
  bind:open={showBulkEdit}
  selectedIds={selected}
  onupdate={handleBulkEditComplete}
/>
