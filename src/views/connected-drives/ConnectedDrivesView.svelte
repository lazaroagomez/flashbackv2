<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';

  let { navigate } = $props();

  let drives = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let selected = $state([]);
  let formatting = $state(false);
  let formatDrive = $state(null);
  let showFormatConfirm = $state(false);

  // Filter to only unregistered drives
  const unregisteredDrives = $derived(drives.filter(d => !d.isRegistered && d.serial));

  async function loadDrives() {
    loading = true;
    error = null;
    selected = [];
    try {
      drives = await api.detectUsbDevices();
    } catch (e) {
      error = e.message || 'Failed to detect USB devices';
    } finally {
      loading = false;
    }
  }

  function toggleSelect(serial) {
    if (selected.includes(serial)) {
      selected = selected.filter(s => s !== serial);
    } else {
      selected = [...selected, serial];
    }
  }

  function toggleSelectAll() {
    const allSerials = unregisteredDrives.map(d => d.serial);
    if (allSerials.every(s => selected.includes(s))) {
      selected = [];
    } else {
      selected = allSerials;
    }
  }

  function handleView(dbId) {
    navigate('usb-drive-detail', { id: dbId });
  }

  function handleRegister(drive) {
    navigate('usb-drive-create', {
      prefill: {
        hardware_model: drive.model,
        hardware_serial: drive.serial,
        capacity_gb: drive.sizeGB
      }
    });
  }

  function handleBulkRegister() {
    const selectedDrives = drives.filter(d => selected.includes(d.serial));
    navigate('bulk-register', { drives: selectedDrives });
  }

  function openFormatDialog(drive) {
    formatDrive = drive;
    showFormatConfirm = true;
  }

  async function handleFormat() {
    if (!formatDrive) return;

    showFormatConfirm = false;
    formatting = true;

    try {
      await api.formatUsbDrive(formatDrive.diskIndex, 'USB', 'exFAT');
      showSuccess(`Drive "${formatDrive.model}" formatted successfully`);
      await loadDrives(); // Refresh the list
    } catch (e) {
      showError(e.message || 'Format failed');
    } finally {
      formatting = false;
      formatDrive = null;
    }
  }

  $effect(() => {
    loadDrives();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Connected Drives</h1>
    <button class="btn btn-ghost btn-sm gap-2" onclick={loadDrives} disabled={loading || formatting}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  </div>

  {#if selected.length > 0}
    <div class="flex items-center gap-4 p-3 bg-base-200 rounded-lg">
      <span class="font-medium">{selected.length} drive{selected.length > 1 ? 's' : ''} selected</span>
      <button class="btn btn-primary btn-sm" onclick={handleBulkRegister}>
        Register Selected
      </button>
      <button class="btn btn-ghost btn-sm" onclick={() => selected = []}>
        Clear
      </button>
    </div>
  {/if}

  {#if formatting}
    <div class="alert alert-info">
      <span class="loading loading-spinner loading-sm"></span>
      <span>Formatting drive... This may take a minute.</span>
    </div>
  {/if}

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if error}
        <div class="alert alert-error">
          <span>{error}</span>
          <button class="btn btn-sm" onclick={loadDrives}>Retry</button>
        </div>
      {:else if drives.length === 0}
        <div class="text-center py-8 text-base-content/50">
          No USB drives detected. Connect a USB drive and click Refresh.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                {#if unregisteredDrives.length > 0}
                  <th>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={unregisteredDrives.length > 0 && unregisteredDrives.every(d => selected.includes(d.serial))}
                      onchange={toggleSelectAll}
                    />
                  </th>
                {/if}
                <th>Status</th>
                <th>Model</th>
                <th>Serial</th>
                <th>Size (GB)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each drives as drive}
                <tr class="hover" class:bg-primary={selected.includes(drive.serial)} class:bg-opacity-10={selected.includes(drive.serial)}>
                  {#if unregisteredDrives.length > 0}
                    <td>
                      {#if !drive.isRegistered && drive.serial}
                        <input
                          type="checkbox"
                          class="checkbox checkbox-sm"
                          checked={selected.includes(drive.serial)}
                          onchange={() => toggleSelect(drive.serial)}
                        />
                      {/if}
                    </td>
                  {/if}
                  <td>
                    {#if drive.isRegistered}
                      <span class="badge badge-success gap-1">Registered</span>
                    {:else}
                      <span class="badge badge-error gap-1">Unregistered</span>
                    {/if}
                  </td>
                  <td>{drive.model}</td>
                  <td class="font-mono text-sm">{drive.serial || '—'}</td>
                  <td>{drive.sizeGB}</td>
                  <td class="flex gap-1">
                    {#if drive.isRegistered}
                      <button class="btn btn-ghost btn-sm" onclick={() => handleView(drive.dbId)}>
                        View
                      </button>
                    {:else if drive.serial}
                      <button class="btn btn-primary btn-sm" onclick={() => handleRegister(drive)}>
                        Register
                      </button>
                    {:else}
                      <span class="text-base-content/50 text-sm">No serial</span>
                    {/if}
                    <button
                      class="btn btn-ghost btn-sm text-error"
                      onclick={() => openFormatDialog(drive)}
                      disabled={formatting}
                      title="Format drive (erases all data)"
                    >
                      Format
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>

<ConfirmDialog
  open={showFormatConfirm}
  title="Format USB Drive"
  message={`WARNING: This will permanently erase ALL data on "${formatDrive?.model}" (${formatDrive?.sizeGB} GB). This action cannot be undone. Are you sure you want to continue?`}
  confirmText="Format Drive"
  confirmClass="btn-error"
  onconfirm={handleFormat}
  oncancel={() => { showFormatConfirm = false; formatDrive = null; }}
/>
