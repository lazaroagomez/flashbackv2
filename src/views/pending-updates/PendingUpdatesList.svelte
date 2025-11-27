<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';

  let { navigate } = $props();

  let pendingUpdates = $state([]);
  let loading = $state(true);
  let selected = $state([]);
  let showConfirm = $state(false);
  let updating = $state(false);

  async function loadPendingUpdates() {
    loading = true;
    try {
      pendingUpdates = await api.getPendingUpdates();
    } catch (e) {
      showError('Failed to load pending updates');
    } finally {
      loading = false;
    }
  }

  // Group by technician
  const groupedByTechnician = $derived.by(() => {
    const groups = {};
    for (const item of pendingUpdates) {
      const techName = item.technician_name || 'Unassigned';
      if (!groups[techName]) {
        groups[techName] = [];
      }
      groups[techName].push(item);
    }
    return groups;
  });

  const technicianNames = $derived(Object.keys(groupedByTechnician).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  }));

  function toggleSelect(id) {
    if (selected.includes(id)) {
      selected = selected.filter(s => s !== id);
    } else {
      selected = [...selected, id];
    }
  }

  function toggleSelectAll() {
    if (selected.length === pendingUpdates.length) {
      selected = [];
    } else {
      selected = pendingUpdates.map(u => u.id);
    }
  }

  function selectByTechnician(techName) {
    const techIds = groupedByTechnician[techName].map(u => u.id);
    const allSelected = techIds.every(id => selected.includes(id));

    if (allSelected) {
      selected = selected.filter(s => !techIds.includes(s));
    } else {
      selected = [...new Set([...selected, ...techIds])];
    }
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

  function confirmMarkUpdated() {
    if (selected.length === 0) {
      showError('No USB drives selected');
      return;
    }
    showConfirm = true;
  }

  async function handleMarkUpdated() {
    showConfirm = false;
    updating = true;
    try {
      await api.markAsUpdated(selected, session.username);
      showSuccess(`${selected.length} USB drive(s) marked as updated`);
      selected = [];
      loadPendingUpdates();
    } catch (e) {
      showError(e.message || 'Failed to mark as updated');
    } finally {
      updating = false;
    }
  }

  async function printSelected() {
    if (selected.length === 0) {
      showError('No USB drives selected');
      return;
    }

    // Filter to only those with technicians
    const withTechnician = pendingUpdates.filter(u => selected.includes(u.id) && u.technician_id);

    if (withTechnician.length === 0) {
      showError('None of the selected USB drives have a technician assigned');
      return;
    }

    try {
      const result = await api.printStickerBulk(withTechnician.map(u => u.id));
      showSuccess(`Generated ${result.count} sticker(s)`);
    } catch (e) {
      showError(e.message || 'Failed to print stickers');
    }
  }

  $effect(() => {
    loadPendingUpdates();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold">Pending Updates</h1>
      <p class="text-base-content/60">USB drives that need version updates</p>
    </div>
    <button class="btn btn-ghost" onclick={loadPendingUpdates}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if pendingUpdates.length === 0}
    <div class="card bg-base-100 shadow">
      <div class="card-body items-center text-center py-12">
        <div class="text-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold">All USB drives are up to date!</h2>
        <p class="text-base-content/60">No pending updates at this time.</p>
      </div>
    </div>
  {:else}
    <!-- Actions Bar -->
    <div class="card bg-base-100 shadow">
      <div class="card-body py-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              class="checkbox"
              checked={selected.length === pendingUpdates.length}
              onchange={toggleSelectAll}
            />
            <span class="text-sm">
              {selected.length > 0 ? `${selected.length} selected` : 'Select all'}
            </span>
          </div>

          <div class="flex-1"></div>

          {#if selected.length > 0}
            <button class="btn btn-success" onclick={confirmMarkUpdated} disabled={updating}>
              {#if updating}
                <span class="loading loading-spinner loading-sm"></span>
              {/if}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Mark as Updated
            </button>
            <button class="btn btn-outline" onclick={printSelected}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Stickers
            </button>
            <button class="btn btn-ghost btn-sm" onclick={() => selected = []}>
              Clear
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Grouped Tables -->
    {#each technicianNames as techName}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="flex items-center gap-4 mb-4">
            <h3 class="card-title flex-1">
              {#if techName === 'Unassigned'}
                <span class="text-warning">Unassigned</span>
              {:else}
                {techName}
              {/if}
              <span class="badge badge-neutral ml-2">{groupedByTechnician[techName].length}</span>
            </h3>
            <button
              class="btn btn-ghost btn-sm"
              onclick={() => selectByTechnician(techName)}
            >
              {groupedByTechnician[techName].every(u => selected.includes(u.id)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th></th>
                  <th>USB ID</th>
                  <th>Platform</th>
                  <th>Type</th>
                  <th>Model</th>
                  <th>Installed</th>
                  <th>Latest</th>
                  <th>Custom</th>
                </tr>
              </thead>
              <tbody>
                {#each groupedByTechnician[techName] as usb}
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
                    <td class="text-warning">{usb.version_code}</td>
                    <td class="text-success font-medium">{usb.current_version_code || '-'}</td>
                    <td class="text-sm">{usb.custom_text || '-'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/each}

    <div class="text-sm text-base-content/50 flex justify-between">
      <span>Total: {pendingUpdates.length} USB drive(s) pending update</span>
      <span class="opacity-60">Ctrl+click to multi-select</span>
    </div>
  {/if}
</div>

<ConfirmDialog
  open={showConfirm}
  title="Mark as Updated"
  message="This will update {selected.length} USB drive(s) to the latest version and change their status to 'Assigned'. Continue?"
  confirmText="Mark Updated"
  confirmClass="btn-success"
  onconfirm={handleMarkUpdated}
  oncancel={() => showConfirm = false}
/>
