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

  const registeredDrives = $derived(drives.filter(d => d.isRegistered));
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

  function handleRowClick(drive, event) {
    if (drive.isRegistered) {
      if (event.ctrlKey || event.metaKey) {
        return; // No multiselect for registered drives
      }
      navigate('usb-drive-detail', { id: drive.dbId });
    } else if (drive.serial) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        toggleSelect(drive.serial);
      }
    }
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

  function openFormatDialog(drive, event) {
    event.stopPropagation();
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
      await loadDrives();
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
    <div class="card bg-base-100 shadow">
      <div class="card-body text-center py-8 text-base-content/50">
        No USB drives detected. Connect a USB drive and click Refresh.
      </div>
    </div>
  {:else}
    <!-- Registered Drives -->
    {#if registeredDrives.length > 0}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg text-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Registered ({registeredDrives.length})
          </h2>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>USB ID</th>
                  <th>Model</th>
                  <th>Serial</th>
                  <th>Size (GB)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each registeredDrives as drive}
                  <tr class="hover cursor-pointer" onclick={(e) => handleRowClick(drive, e)}>
                    <td class="font-mono font-bold text-success">{drive.usbId}</td>
                    <td>{drive.model}</td>
                    <td class="font-mono text-sm">{drive.serial || '—'}</td>
                    <td>{drive.sizeGB}</td>
                    <td onclick={(e) => e.stopPropagation()}>
                      <button
                        class="btn btn-ghost btn-sm text-error"
                        onclick={(e) => openFormatDialog(drive, e)}
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
        </div>
      </div>
    {/if}

    <!-- Unregistered Drives -->
    {#if unregisteredDrives.length > 0}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg text-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Unregistered ({unregisteredDrives.length})
          </h2>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={unregisteredDrives.length > 0 && unregisteredDrives.every(d => selected.includes(d.serial))}
                      onchange={toggleSelectAll}
                    />
                  </th>
                  <th>Model</th>
                  <th>Serial</th>
                  <th>Size (GB)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each unregisteredDrives as drive}
                  <tr
                    class="hover cursor-pointer"
                    class:bg-primary={selected.includes(drive.serial)}
                    class:bg-opacity-20={selected.includes(drive.serial)}
                    onclick={(e) => handleRowClick(drive, e)}
                  >
                    <td onclick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm"
                        checked={selected.includes(drive.serial)}
                        onchange={() => toggleSelect(drive.serial)}
                      />
                    </td>
                    <td>{drive.model}</td>
                    <td class="font-mono text-sm">{drive.serial}</td>
                    <td>{drive.sizeGB}</td>
                    <td onclick={(e) => e.stopPropagation()}>
                      <button class="btn btn-primary btn-sm" onclick={() => handleRegister(drive)}>
                        Register
                      </button>
                      <button
                        class="btn btn-ghost btn-sm text-error"
                        onclick={(e) => openFormatDialog(drive, e)}
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
          <p class="text-xs text-base-content/50 mt-2">Ctrl+click to multi-select</p>
        </div>
      </div>
    {/if}

    <!-- Drives without serial (can't be registered) -->
    {#if drives.some(d => !d.isRegistered && !d.serial)}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No Serial (Cannot Register)
          </h2>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Size (GB)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each drives.filter(d => !d.isRegistered && !d.serial) as drive}
                  <tr class="hover">
                    <td>{drive.model}</td>
                    <td>{drive.sizeGB}</td>
                    <td>
                      <button
                        class="btn btn-ghost btn-sm text-error"
                        onclick={(e) => openFormatDialog(drive, e)}
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
        </div>
      </div>
    {/if}
  {/if}
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
