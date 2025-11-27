<script>
  import { api } from '../../lib/api.js';
  import { showError } from '../../lib/stores/toast.svelte.js';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import TechnicianWarning from '../../lib/components/TechnicianWarning.svelte';

  let { id, navigate } = $props();

  let model = $state(null);
  let usbDrives = $state([]);
  let loading = $state(true);

  async function loadData() {
    loading = true;
    try {
      [model, usbDrives] = await Promise.all([
        api.getModel(id),
        api.getModelUsbDrives(id)
      ]);
    } catch (e) {
      showError('Failed to load model details');
    } finally {
      loading = false;
    }
  }

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
    <button class="btn btn-ghost btn-sm" onclick={() => navigate('models')}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <h1 class="text-2xl font-bold">Model Details</h1>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if !model}
    <div class="alert alert-error">Model not found</div>
  {:else}
    <!-- Model Info Card -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="card-title">{model.name}</h2>
            {#if model.model_number}
              <p class="text-base-content/60">Model #: {model.model_number}</p>
            {/if}
          </div>
          <StatusBadge status={model.status} />
        </div>
        {#if model.notes}
          <p class="mt-2">{model.notes}</p>
        {/if}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full">
      <div class="stat">
        <div class="stat-title">Total USBs</div>
        <div class="stat-value">{stats.total}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Assigned</div>
        <div class="stat-value text-success">{stats.assigned}</div>
      </div>
      <div class="stat">
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
        <h3 class="card-title">Associated USB Drives</h3>
        {#if usbDrives.length === 0}
          <p class="text-base-content/50">No USB drives associated with this model</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>USB ID</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Technician</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {#each usbDrives as usb}
                  <tr
                    class="hover cursor-pointer"
                    onclick={() => navigate('usb-drive-detail', { id: usb.id })}
                  >
                    <td class="font-mono font-bold">{usb.usb_id}</td>
                    <td>{usb.usb_type_name}</td>
                    <td>{usb.version_code}</td>
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
