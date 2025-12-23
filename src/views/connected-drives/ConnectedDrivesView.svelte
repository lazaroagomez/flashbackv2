<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import {
    connectedDrivesState,
    loadConnectedDrives,
    refreshConnectedDrives
  } from '../../lib/stores/connectedDrives.svelte.js';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';
  import BulkEditModal from '../../lib/components/BulkEditModal.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';

  let { navigate } = $props();

  // Use global store for drives
  const drives = $derived(connectedDrivesState.drives);
  const loading = $derived(connectedDrivesState.loading);
  const error = $derived(connectedDrivesState.error);

  let selected = $state([]);

  // Single format state
  let formatDrive = $state(null);
  let showFormatConfirm = $state(false);

  // Bulk format queue state
  let formatQueue = $state([]);
  let showBulkFormatConfirm = $state(false);

  // Bulk edit state
  let showBulkEditModal = $state(false);

  // Format progress state (from WUSBKit NDJSON)
  let formatProgress = $state(null);
  let unsubscribeProgress = null;

  const isFormatting = $derived(formatQueue.some(q => q.status === 'formatting'));
  const registeredDrives = $derived(drives.filter(d => d.isRegistered));
  const unregisteredDrives = $derived(drives.filter(d => !d.isRegistered && d.serial));
  const noSerialDrives = $derived(drives.filter(d => !d.isRegistered && !d.serial));

  // Selected registered drive database IDs for bulk edit
  const selectedRegisteredIds = $derived(
    registeredDrives
      .filter(d => selected.includes(d.diskIndex))
      .map(d => d.dbId)
  );

  // Use global store's refresh function
  async function loadDrives() {
    selected = [];
    formatQueue = [];
    await refreshConnectedDrives();
  }

  function toggleSelect(diskIndex) {
    if (selected.includes(diskIndex)) {
      selected = selected.filter(s => s !== diskIndex);
    } else {
      selected = [...selected, diskIndex];
    }
  }

  function toggleSelectAllUnregistered() {
    const allIndexes = unregisteredDrives.map(d => d.diskIndex);
    if (allIndexes.every(idx => selected.includes(idx))) {
      selected = selected.filter(idx => !allIndexes.includes(idx));
    } else {
      selected = [...new Set([...selected, ...allIndexes])];
    }
  }

  function toggleSelectAllRegistered() {
    const allIndexes = registeredDrives.map(d => d.diskIndex);
    if (allIndexes.every(idx => selected.includes(idx))) {
      selected = selected.filter(idx => !allIndexes.includes(idx));
    } else {
      selected = [...new Set([...selected, ...allIndexes])];
    }
  }

  function handleRowClick(drive, event) {
    if (drive.isRegistered) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        toggleSelect(drive.diskIndex);
      } else {
        navigate('usb-drive-detail', { id: drive.dbId });
      }
    } else if (drive.serial) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        toggleSelect(drive.diskIndex);
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
    const selectedDrives = drives.filter(d => selected.includes(d.diskIndex) && !d.isRegistered && d.serial);
    navigate('bulk-register', { drives: selectedDrives });
  }

  // Single format
  function openFormatDialog(drive, event) {
    event.stopPropagation();
    formatDrive = drive;
    showFormatConfirm = true;
  }

  async function handleSingleFormat() {
    if (!formatDrive) return;
    showFormatConfirm = false;

    formatQueue = [{ ...formatDrive, status: 'formatting' }];

    try {
      await api.formatUsbDrive({
        diskIndex: formatDrive.diskIndex,
        label: formatDrive.usbId || 'USB',  // Use USB ID as label for registered drives
        fileSystem: 'exFAT',
        dbId: formatDrive.dbId,  // null for unregistered drives
        username: session.username
      });
      formatQueue = [{ ...formatDrive, status: 'done' }];
      showSuccess(`Drive "${formatDrive.model}" formatted successfully`);
    } catch (e) {
      formatQueue = [{ ...formatDrive, status: 'error', error: e.message }];
      showError(e.message || 'Format failed');
    } finally {
      formatDrive = null;
      setTimeout(() => {
        formatQueue = [];
        loadDrives();
      }, 2000);
    }
  }

  // Bulk format
  function openBulkFormatDialog() {
    if (selected.length === 0) return;
    showBulkFormatConfirm = true;
  }

  async function handleBulkFormat() {
    showBulkFormatConfirm = false;

    const drivesToFormat = drives.filter(d => selected.includes(d.diskIndex));
    formatQueue = drivesToFormat.map(d => ({ ...d, status: 'pending' }));
    selected = [];

    for (let i = 0; i < formatQueue.length; i++) {
      formatQueue = formatQueue.map((q, idx) =>
        idx === i ? { ...q, status: 'formatting' } : q
      );

      try {
        await api.formatUsbDrive({
          diskIndex: formatQueue[i].diskIndex,
          label: formatQueue[i].usbId || 'USB',  // Use USB ID as label for registered drives
          fileSystem: 'exFAT',
          dbId: formatQueue[i].dbId,  // null for unregistered drives
          username: session.username
        });
        formatQueue = formatQueue.map((q, idx) =>
          idx === i ? { ...q, status: 'done' } : q
        );
      } catch (e) {
        formatQueue = formatQueue.map((q, idx) =>
          idx === i ? { ...q, status: 'error', error: e.message } : q
        );
      }
    }

    const successCount = formatQueue.filter(q => q.status === 'done').length;
    const errorCount = formatQueue.filter(q => q.status === 'error').length;

    if (successCount > 0) {
      showSuccess(`${successCount} drive(s) formatted successfully`);
    }
    if (errorCount > 0) {
      showError(`${errorCount} drive(s) failed to format`);
    }

    setTimeout(() => {
      formatQueue = [];
      loadDrives();
    }, 3000);
  }

  function getQueueStatus(diskIndex) {
    return formatQueue.find(q => q.diskIndex === diskIndex);
  }

  $effect(() => {
    // Only load if we don't have cached data yet
    if (!connectedDrivesState.initialized) {
      loadConnectedDrives(true);
    }

    // Subscribe to format progress events
    unsubscribeProgress = api.onFormatProgress((progress) => {
      formatProgress = progress;
      // Update queue item with progress
      if (progress.diskNumber !== undefined) {
        formatQueue = formatQueue.map(q =>
          q.diskIndex === progress.diskNumber
            ? { ...q, progress: progress }
            : q
        );
      }
    });

    return () => {
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }
    };
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Connected Drives</h1>
    <button class="btn btn-ghost btn-sm gap-2" onclick={loadDrives} disabled={loading || isFormatting}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" class:animate-spin={loading} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  </div>

  <!-- Selection Actions Bar -->
  {#if selected.length > 0 && !isFormatting}
    <div class="flex items-center gap-4 p-3 bg-base-200 rounded-lg">
      <span class="font-medium">{selected.length} drive{selected.length > 1 ? 's' : ''} selected</span>
      {#if selectedRegisteredIds.length > 0}
        <button class="btn btn-secondary btn-sm" onclick={() => showBulkEditModal = true}>
          Bulk Edit ({selectedRegisteredIds.length})
        </button>
      {/if}
      {#if drives.filter(d => selected.includes(d.diskIndex) && !d.isRegistered && d.serial).length > 0}
        <button class="btn btn-primary btn-sm" onclick={handleBulkRegister}>
          Register Selected
        </button>
      {/if}
      <button class="btn btn-error btn-sm" onclick={openBulkFormatDialog}>
        Format Selected
      </button>
      <button class="btn btn-ghost btn-sm" onclick={() => selected = []}>
        Clear
      </button>
    </div>
  {/if}

  <!-- Format Queue Progress -->
  {#if formatQueue.length > 0}
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title text-lg">
          {#if isFormatting}
            <span class="loading loading-spinner loading-sm"></span>
            Formatting Drives...
          {:else}
            Format Complete
          {/if}
        </h3>
        <div class="space-y-2">
          {#each formatQueue as item}
            <div class="flex flex-col gap-2 p-3 rounded bg-base-200">
              <div class="flex items-center gap-3">
                {#if item.status === 'pending'}
                  <span class="badge badge-ghost">Waiting</span>
                {:else if item.status === 'formatting'}
                  <span class="loading loading-spinner loading-sm"></span>
                {:else if item.status === 'done'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                {:else if item.status === 'error'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                {/if}
                <span class="flex-1">{item.model}</span>
                <span class="font-mono text-sm text-base-content/60">{item.sizeGB} GB</span>
                {#if item.status === 'error'}
                  <span class="text-error text-sm">{item.error}</span>
                {/if}
              </div>
              {#if item.status === 'formatting' && item.progress}
                <div class="flex items-center gap-2">
                  <progress class="progress progress-primary flex-1" value={item.progress.percentage || 0} max="100"></progress>
                  <span class="text-sm text-base-content/70 w-32 text-right">
                    {item.progress.stage || 'Formatting'} {item.progress.percentage || 0}%
                  </span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {#if loading && drives.length === 0}
    <!-- Only show full spinner if we have no cached data -->
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if error && drives.length === 0}
    <div class="alert alert-error">
      <span>{error}</span>
      <button class="btn btn-sm" onclick={loadDrives}>Retry</button>
    </div>
  {:else if drives.length === 0 && connectedDrivesState.initialized}
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
                  <th>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={registeredDrives.length > 0 && registeredDrives.every(d => selected.includes(d.diskIndex))}
                      onchange={toggleSelectAllRegistered}
                      disabled={isFormatting}
                    />
                  </th>
                  <th>USB ID</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each registeredDrives as drive}
                  {@const queueItem = getQueueStatus(drive.diskIndex)}
                  <tr
                    class="hover cursor-pointer"
                    class:bg-primary={selected.includes(drive.diskIndex)}
                    class:bg-opacity-20={selected.includes(drive.diskIndex)}
                    onclick={(e) => handleRowClick(drive, e)}
                  >
                    <td onclick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm"
                        checked={selected.includes(drive.diskIndex)}
                        onchange={() => toggleSelect(drive.diskIndex)}
                        disabled={isFormatting}
                      />
                    </td>
                    <td class="font-mono font-bold text-success">{drive.usbId}</td>
                    <td>
                      <StatusBadge status={drive.status} />
                    </td>
                    <td class="text-xs text-base-content/70">
                      {[drive.platformName, drive.usbTypeName, drive.modelName, drive.versionCode, drive.technicianName].filter(Boolean).join(' | ')}
                    </td>
                    <td onclick={(e) => e.stopPropagation()}>
                      {#if queueItem}
                        {#if queueItem.status === 'formatting'}
                          <span class="loading loading-spinner loading-sm"></span>
                        {:else if queueItem.status === 'done'}
                          <span class="text-success">Done</span>
                        {:else if queueItem.status === 'error'}
                          <span class="text-error">Failed</span>
                        {:else}
                          <span class="text-base-content/50">Waiting</span>
                        {/if}
                      {:else}
                        <button
                          class="btn btn-ghost btn-sm text-error"
                          onclick={(e) => openFormatDialog(drive, e)}
                          disabled={isFormatting}
                        >
                          Format
                        </button>
                      {/if}
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
                      checked={unregisteredDrives.length > 0 && unregisteredDrives.every(d => selected.includes(d.diskIndex))}
                      onchange={toggleSelectAllUnregistered}
                      disabled={isFormatting}
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
                  {@const queueItem = getQueueStatus(drive.diskIndex)}
                  <tr
                    class="hover cursor-pointer"
                    class:bg-primary={selected.includes(drive.diskIndex)}
                    class:bg-opacity-20={selected.includes(drive.diskIndex)}
                    onclick={(e) => handleRowClick(drive, e)}
                  >
                    <td onclick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm"
                        checked={selected.includes(drive.diskIndex)}
                        onchange={() => toggleSelect(drive.diskIndex)}
                        disabled={isFormatting}
                      />
                    </td>
                    <td>{drive.model}</td>
                    <td class="font-mono text-sm">{drive.serial}</td>
                    <td>{drive.sizeGB}</td>
                    <td onclick={(e) => e.stopPropagation()}>
                      {#if queueItem}
                        {#if queueItem.status === 'formatting'}
                          <span class="loading loading-spinner loading-sm"></span>
                        {:else if queueItem.status === 'done'}
                          <span class="text-success">Done</span>
                        {:else if queueItem.status === 'error'}
                          <span class="text-error">Failed</span>
                        {:else}
                          <span class="text-base-content/50">Waiting</span>
                        {/if}
                      {:else}
                        <div class="flex gap-1">
                          <button class="btn btn-primary btn-sm" onclick={() => handleRegister(drive)} disabled={isFormatting}>
                            Register
                          </button>
                          <button
                            class="btn btn-ghost btn-sm text-error"
                            onclick={(e) => openFormatDialog(drive, e)}
                            disabled={isFormatting}
                          >
                            Format
                          </button>
                        </div>
                      {/if}
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

    <!-- Drives without serial -->
    {#if noSerialDrives.length > 0}
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
                  <th></th>
                  <th>Model</th>
                  <th>Size (GB)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each noSerialDrives as drive}
                  {@const queueItem = getQueueStatus(drive.diskIndex)}
                  <tr class="hover">
                    <td>
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm"
                        checked={selected.includes(drive.diskIndex)}
                        onchange={() => toggleSelect(drive.diskIndex)}
                        disabled={isFormatting}
                      />
                    </td>
                    <td>{drive.model}</td>
                    <td>{drive.sizeGB}</td>
                    <td>
                      {#if queueItem}
                        {#if queueItem.status === 'formatting'}
                          <span class="loading loading-spinner loading-sm"></span>
                        {:else if queueItem.status === 'done'}
                          <span class="text-success">Done</span>
                        {:else if queueItem.status === 'error'}
                          <span class="text-error">Failed</span>
                        {:else}
                          <span class="text-base-content/50">Waiting</span>
                        {/if}
                      {:else}
                        <button
                          class="btn btn-ghost btn-sm text-error"
                          onclick={(e) => openFormatDialog(drive, e)}
                          disabled={isFormatting}
                        >
                          Format
                        </button>
                      {/if}
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

<!-- Single Format Confirm -->
<ConfirmDialog
  open={showFormatConfirm}
  title="Format USB Drive"
  message={`WARNING: This will permanently erase ALL data on "${formatDrive?.model}" (${formatDrive?.sizeGB} GB). This action cannot be undone. Are you sure you want to continue?`}
  confirmText="Format Drive"
  confirmClass="btn-error"
  onconfirm={handleSingleFormat}
  oncancel={() => { showFormatConfirm = false; formatDrive = null; }}
/>

<!-- Bulk Format Confirm -->
<ConfirmDialog
  open={showBulkFormatConfirm}
  title="Format Multiple Drives"
  message={`WARNING: This will permanently erase ALL data on ${selected.length} drive(s). This action cannot be undone. Are you sure you want to continue?`}
  confirmText={`Format ${selected.length} Drive${selected.length > 1 ? 's' : ''}`}
  confirmClass="btn-error"
  onconfirm={handleBulkFormat}
  oncancel={() => showBulkFormatConfirm = false}
/>

<!-- Bulk Edit Modal -->
<BulkEditModal
  bind:open={showBulkEditModal}
  selectedIds={selectedRegisteredIds}
  onupdate={() => {
    selected = [];
    loadDrives();
  }}
/>
