<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError, showWarning } from '../../lib/stores/toast.svelte.js';
  import {
    flashingState,
    startFlashing,
    updateFlashProgress,
    markDeviceFailed,
    stopFlashing,
    resetFlashing
  } from '../../lib/stores/flashing.svelte.js';
  import {
    connectedDrivesState,
    loadConnectedDrives,
    refreshConnectedDrives
  } from '../../lib/stores/connectedDrives.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import FlashDeviceList from './components/FlashDeviceList.svelte';
  import FlashImageSelector from './components/FlashImageSelector.svelte';
  import FlashProgressPanel from './components/FlashProgressPanel.svelte';
  import FlashSettingsPanel from './components/FlashSettingsPanel.svelte';

  let { navigate } = $props();

  // Use global store for devices
  const devices = $derived(connectedDrivesState.drives);
  const loading = $derived(connectedDrivesState.loading);

  // Local state (selection, UI)
  let selectedDevices = $state([]);
  let selectedImage = $state(null);
  let imageInfo = $state(null);
  let flashSettings = $state({
    verify: true
  });

  // Use global store for flashing state
  const flashing = $derived(flashingState.isFlashing);
  const flashProgress = $derived(flashingState.flashProgress);
  const deviceProgress = $derived(flashingState.deviceProgress);

  // Dialogs
  let showFlashConfirm = $state(false);

  // Derived
  const canStartFlash = $derived(
    selectedDevices.length > 0 &&
    selectedImage &&
    imageInfo &&
    !flashing
  );

  const selectedDeviceInfo = $derived(
    devices.filter(d => selectedDevices.includes(d.diskIndex))
  );

  // Progress event cleanup functions
  let unsubProgress = null;
  let unsubFailed = null;

  // Initialize
  async function init() {
    // Load devices if not already cached
    if (!connectedDrivesState.initialized) {
      await loadConnectedDrives(true);
    }

    // Subscribe to flash progress events (use global store)
    unsubProgress = api.onFlashProgress((progress) => {
      updateFlashProgress(progress);
    });

    unsubFailed = api.onFlashDeviceFailed(({ device, error }) => {
      showError(`Device ${device} failed: ${error}`);
      markDeviceFailed(device, error);
    });
  }

  function cleanup() {
    if (unsubProgress) unsubProgress();
    if (unsubFailed) unsubFailed();
  }

  // Use global store's refresh function
  async function loadDevices() {
    await refreshConnectedDrives();
    // Remove any selected devices that are no longer present
    selectedDevices = selectedDevices.filter(idx =>
      connectedDrivesState.drives.some(d => d.diskIndex === idx)
    );
  }

  async function handleImageSelect() {
    try {
      const path = await api.selectFlashImage();
      if (!path) return;

      const info = await api.validateFlashImage(path);
      selectedImage = path;
      imageInfo = info;
    } catch (e) {
      showError(`Invalid image: ${e.message}`);
      selectedImage = null;
      imageInfo = null;
    }
  }

  function clearImage() {
    selectedImage = null;
    imageInfo = null;
  }

  function handleDeviceToggle(diskIndex) {
    if (selectedDevices.includes(diskIndex)) {
      selectedDevices = selectedDevices.filter(d => d !== diskIndex);
    } else {
      selectedDevices = [...selectedDevices, diskIndex];
    }
  }

  function selectAllDevices() {
    selectedDevices = devices.map(d => d.diskIndex);
  }

  function clearAllDevices() {
    selectedDevices = [];
  }

  function openFlashConfirm() {
    // Validate image size vs device capacity
    for (const device of selectedDeviceInfo) {
      const imageSizeGB = (imageInfo?.size || 0) / (1024 * 1024 * 1024);
      if (imageSizeGB > device.sizeGB) {
        showError(`Image (${imageSizeGB.toFixed(2)} GB) is larger than ${device.model} (${device.sizeGB} GB)`);
        return;
      }
    }
    showFlashConfirm = true;
  }

  async function handleStartFlash() {
    showFlashConfirm = false;

    // Start flashing using global store
    startFlashing(selectedDeviceInfo, imageInfo, selectedImage);

    try {
      const devicePaths = selectedDeviceInfo.map(d => `\\\\.\\PhysicalDrive${d.diskIndex}`);

      const result = await api.startFlash({
        imagePath: selectedImage,
        devicePaths,
        options: {
          verify: flashSettings.verify
        }
      });

      if (result.success) {
        showSuccess(`Successfully flashed ${result.successfulDevices.length} device(s)`);

        // Log flash events for registered drives
        for (const device of selectedDeviceInfo) {
          if (device.dbId) {
            try {
              await api.logFlashEvent({
                dbId: device.dbId,
                imagePath: selectedImage,
                result: { success: true, verified: flashSettings.verify, duration: result.duration },
                username: session.username
              });
            } catch (logError) {
              console.error('Failed to log flash event:', logError);
            }
          }
        }
      } else {
        showWarning(`Flash completed with ${result.failedDevices.length} failure(s)`);
      }

      // Refresh device list
      await loadDevices();
      selectedDevices = [];
      stopFlashing();

    } catch (e) {
      showError(`Flash failed: ${e.message}`);
      resetFlashing();
    }
  }

  async function handleCancelFlash() {
    try {
      await api.cancelFlash();
      showWarning('Flash operation cancelled');
      resetFlashing();
    } catch (e) {
      showError(`Cancel failed: ${e.message}`);
    }
  }

  // Lifecycle
  $effect(() => {
    init();
    return cleanup;
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        USB Flashing
      </h1>
      <p class="text-sm text-base-content/60 mt-1">Flash images to multiple USB drives simultaneously</p>
    </div>
    <button
      class="btn btn-ghost btn-sm gap-2"
      onclick={loadDevices}
      disabled={loading || flashing}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" class:animate-spin={loading} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  </div>

  <!-- Progress Panel (shown during flashing) -->
  {#if flashing}
    <FlashProgressPanel
      progress={flashProgress}
      devices={flashingState.devices}
      {deviceProgress}
      imageName={flashingState.imageInfo?.name || ''}
      onCancel={handleCancelFlash}
    />
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Device Selection (2 cols on large screens) -->
      <div class="lg:col-span-2">
        <FlashDeviceList
          {devices}
          {selectedDevices}
          {loading}
          onToggle={handleDeviceToggle}
          onSelectAll={selectAllDevices}
          onClearAll={clearAllDevices}
        />
      </div>

      <!-- Right Panel -->
      <div class="space-y-6">
        <!-- Image Selection -->
        <FlashImageSelector
          {selectedImage}
          {imageInfo}
          onSelect={handleImageSelect}
          onClear={clearImage}
        />

        <!-- Settings -->
        <FlashSettingsPanel bind:settings={flashSettings} />

        <!-- Action Button -->
        <button
          class="btn btn-primary w-full btn-lg gap-2"
          disabled={!canStartFlash}
          onclick={openFlashConfirm}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Flash {selectedDevices.length} Device{selectedDevices.length !== 1 ? 's' : ''}
        </button>

        {#if selectedDevices.length === 0}
          <p class="text-xs text-center text-base-content/50">
            Select at least one USB device to flash
          </p>
        {:else if !selectedImage}
          <p class="text-xs text-center text-base-content/50">
            Select a disk image to flash
          </p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Flash Confirmation Modal -->
<Modal bind:open={showFlashConfirm} title="Confirm Flash Operation">
  <div class="space-y-4">
    <div class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <h3 class="font-bold">Warning: Data Loss</h3>
        <p class="text-sm">This will permanently erase ALL data on the selected devices.</p>
      </div>
    </div>

    <div class="bg-base-200 rounded-lg p-4">
      <h4 class="font-semibold mb-2">Selected Devices ({selectedDevices.length}):</h4>
      <ul class="space-y-1 text-sm">
        {#each selectedDeviceInfo as device}
          <li class="flex items-center gap-2">
            <span class="badge badge-sm badge-ghost">Disk {device.diskIndex}</span>
            {#if device.usbId}
              <span class="font-mono text-success">{device.usbId}</span>
            {/if}
            <span>{device.model}</span>
            <span class="text-base-content/60">({device.sizeGB} GB)</span>
          </li>
        {/each}
      </ul>
    </div>

    <div class="bg-base-200 rounded-lg p-4">
      <h4 class="font-semibold mb-2">Image:</h4>
      <p class="text-sm">{imageInfo?.name}</p>
      <p class="text-xs text-base-content/60">
        Size: {((imageInfo?.size || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB
        {#if flashSettings.verify}
          <span class="badge badge-success badge-xs ml-2">Verification ON</span>
        {/if}
      </p>
    </div>

    <div class="flex gap-3 justify-end mt-6">
      <button class="btn btn-ghost" onclick={() => showFlashConfirm = false}>
        Cancel
      </button>
      <button class="btn btn-error" onclick={handleStartFlash}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Start Flashing
      </button>
    </div>
  </div>
</Modal>
