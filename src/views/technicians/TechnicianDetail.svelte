<script>
  import { api } from '../../lib/api.js';
  import { showError } from '../../lib/stores/toast.svelte.js';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';

  let { id, navigate } = $props();

  let technician = $state(null);
  let usbDrives = $state([]);
  let loading = $state(true);
  let filterStatus = $state(null);

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

        {#if filteredDrives.length === 0}
          <p class="text-base-content/50">
            {filterStatus ? `No USB drives with status "${filterStatus}"` : 'No USB drives assigned to this technician'}
          </p>
        {:else}
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
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
                    onclick={() => navigate('usb-drive-detail', { id: usb.id })}
                  >
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
        {/if}
      </div>
    </div>
  {/if}
</div>
