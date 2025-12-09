<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import CascadingUsbSelector from '../../lib/components/FormFields/CascadingUsbSelector.svelte';

  let { navigate, prefill = null } = $props();

  // Reference data (only technicians now - cascade handled by component)
  let technicians = $state([]);
  let loading = $state(true);
  let saving = $state(false);

  // Connected drives for auto-populate
  let connectedDrives = $state([]);
  let loadingDrives = $state(false);
  let showDriveSelector = $state(false);

  // Cascade selection (handled by CascadingUsbSelector)
  let cascadeValue = $state({
    platform_id: null,
    usb_type_id: null,
    alias_id: null,
    model_id: null,
    version_id: null
  });

  // Track selected type data from CascadingUsbSelector for validation
  let selectedType = $state(null);

  // Other form fields
  let formData = $state({
    technician_id: null,
    custom_text: '',
    hardware_model: prefill?.hardware_model || '',
    hardware_serial: prefill?.hardware_serial || '',
    capacity_gb: prefill?.capacity_gb || null
  });

  let createdUsb = $state(null);

  async function loadReferenceData() {
    loading = true;
    try {
      technicians = await api.getTechnicians(true);
    } catch (e) {
      showError('Failed to load data');
    } finally {
      loading = false;
    }
  }

  async function loadConnectedDrives() {
    loadingDrives = true;
    try {
      const drives = await api.detectUsbDevices();
      // Filter to only unregistered drives with serial numbers
      connectedDrives = drives.filter(d => !d.isRegistered && d.serial);
    } catch (e) {
      showError('Failed to detect connected drives');
      connectedDrives = [];
    } finally {
      loadingDrives = false;
    }
  }

  function selectConnectedDrive(drive) {
    formData.hardware_model = drive.model;
    formData.hardware_serial = drive.serial;
    formData.capacity_gb = drive.sizeGB;
    showDriveSelector = false;
  }

  function clearHardwareInfo() {
    formData.hardware_model = '';
    formData.hardware_serial = '';
    formData.capacity_gb = null;
  }

  // Handler for CascadingUsbSelector changes
  function handleCascadeChange(value, entities) {
    selectedType = entities.usbType;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!cascadeValue.platform_id) {
      showError('Platform is required');
      return;
    }
    if (!cascadeValue.usb_type_id) {
      showError('USB Type is required');
      return;
    }
    // Model is required unless using alias
    if (selectedType?.requires_model && !cascadeValue.model_id && !cascadeValue.alias_id) {
      showError('Model is required for this USB type');
      return;
    }
    // For supports_aliases types, need either alias or model
    if (selectedType?.supports_aliases && !cascadeValue.alias_id && !cascadeValue.model_id) {
      showError('Please select an alias or model');
      return;
    }
    if (!cascadeValue.version_id) {
      showError('Version is required');
      return;
    }

    saving = true;
    try {
      // Combine cascade values with other form data
      const submitData = {
        ...cascadeValue,
        ...formData
      };
      const result = await api.createUsbDrive(submitData, session.username);
      showSuccess(`USB drive ${result.usb_id} created`);
      createdUsb = result;
    } catch (e) {
      showError(e.message || 'Failed to create USB drive');
    } finally {
      saving = false;
    }
  }

  async function printSticker() {
    if (!createdUsb?.id) return;
    try {
      await api.printSticker(createdUsb.id);
      showSuccess('Sticker generated');
    } catch (e) {
      showError(e.message || 'Failed to print sticker');
    }
  }

  function createAnother() {
    createdUsb = null;
    // Keep cascade selections, only clear hardware info
    formData = {
      technician_id: formData.technician_id,
      custom_text: formData.custom_text,
      hardware_model: '',
      hardware_serial: '',
      capacity_gb: null
    };
    // cascadeValue is preserved automatically
  }

  $effect(() => {
    loadReferenceData();
  });
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <button class="btn btn-ghost btn-sm" onclick={() => navigate('usb-drives')}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <h1 class="text-2xl font-bold">Create USB Drive</h1>
  </div>

  {#if createdUsb}
    <!-- Success State -->
    <div class="card bg-base-100 shadow max-w-xl">
      <div class="card-body items-center text-center">
        <div class="text-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="card-title">USB Drive Created!</h2>
        <p class="text-4xl font-mono font-bold my-4">{createdUsb.usb_id}</p>

        <div class="flex gap-2 mt-4">
          {#if formData.technician_id}
            <button class="btn btn-primary" onclick={printSticker}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Sticker
            </button>
          {:else}
            <div class="tooltip" data-tip="Assign a technician to print sticker">
              <button class="btn btn-primary" disabled>Print Sticker</button>
            </div>
          {/if}
          <button class="btn btn-outline" onclick={createAnother}>Create Another</button>
          <button class="btn btn-ghost" onclick={() => navigate('usb-drive-detail', { id: createdUsb.id })}>
            View Details
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Create Form -->
    <div class="card bg-base-100 shadow max-w-xl">
      <div class="card-body">
        {#if loading}
          <div class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        {:else}
          <form onsubmit={handleSubmit}>
            <CascadingUsbSelector
              bind:value={cascadeValue}
              mode="full"
              layout="vertical"
              onchange={handleCascadeChange}
            />

            <div class="divider"></div>

            <SearchableSelect
              bind:value={formData.technician_id}
              options={technicians}
              label="Technician (optional)"
              placeholder="Search technicians..."
            />
            <p class="text-xs text-base-content/50 mt-1 ml-1">Required for printing stickers</p>

            <div class="form-control mt-4">
              <label class="label" for="custom-text">
                <span class="label-text">Custom Text (optional)</span>
              </label>
              <input
                id="custom-text"
                type="text"
                class="input input-bordered"
                bind:value={formData.custom_text}
                placeholder="Max 12 characters"
                maxlength="12"
              />
            </div>

            <div class="divider">Hardware Info</div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-base-content/60">Physical drive details</span>
              <div class="flex gap-2">
                <div class="dropdown dropdown-end">
                  <button
                    type="button"
                    class="btn btn-outline btn-sm gap-1"
                    onclick={() => { showDriveSelector = !showDriveSelector; if (!showDriveSelector === false) loadConnectedDrives(); }}
                    onfocus={() => loadConnectedDrives()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-3-3m3 3l3-3" />
                    </svg>
                    Auto-populate
                  </button>
                  {#if showDriveSelector}
                    <div class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-80 mt-1">
                      {#if loadingDrives}
                        <div class="flex justify-center py-4">
                          <span class="loading loading-spinner loading-sm"></span>
                        </div>
                      {:else if connectedDrives.length === 0}
                        <p class="text-sm text-base-content/50 p-2">No unregistered drives detected</p>
                      {:else}
                        {#each connectedDrives as drive}
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm justify-start text-left h-auto py-2"
                            onclick={() => selectConnectedDrive(drive)}
                          >
                            <div>
                              <div class="font-medium">{drive.model}</div>
                              <div class="text-xs text-base-content/60 font-mono">{drive.serial} • {drive.sizeGB} GB</div>
                            </div>
                          </button>
                        {/each}
                      {/if}
                    </div>
                  {/if}
                </div>
                {#if formData.hardware_serial}
                  <button type="button" class="btn btn-ghost btn-sm" onclick={clearHardwareInfo}>
                    Clear
                  </button>
                {/if}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label" for="hardware-model"><span class="label-text">Hardware Model</span></label>
                <input
                  id="hardware-model"
                  type="text"
                  class="input input-bordered"
                  bind:value={formData.hardware_model}
                  placeholder="e.g., SanDisk Ultra"
                />
              </div>
              <div class="form-control">
                <label class="label" for="hardware-serial"><span class="label-text">Hardware Serial</span></label>
                <input
                  id="hardware-serial"
                  type="text"
                  class="input input-bordered font-mono"
                  bind:value={formData.hardware_serial}
                  placeholder="e.g., 4C530001234567"
                />
              </div>
              <div class="form-control">
                <label class="label" for="capacity-gb"><span class="label-text">Capacity (GB)</span></label>
                <input
                  id="capacity-gb"
                  type="number"
                  class="input input-bordered"
                  bind:value={formData.capacity_gb}
                  placeholder="e.g., 32"
                  step="0.01"
                />
              </div>
            </div>

            <div class="form-control mt-6">
              <button class="btn btn-primary" type="submit" disabled={saving}>
                {#if saving}
                  <span class="loading loading-spinner loading-sm"></span>
                {/if}
                Create USB Drive
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  {/if}
</div>
