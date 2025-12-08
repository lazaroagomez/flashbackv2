<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';

  let { navigate, prefill = null } = $props();

  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let aliases = $state([]);
  let versions = $state([]);
  let technicians = $state([]);
  let loading = $state(true);
  let saving = $state(false);

  // Connected drives for auto-populate
  let connectedDrives = $state([]);
  let loadingDrives = $state(false);
  let showDriveSelector = $state(false);

  // Alias-related state
  let selectedAlias = $state(null);
  let aliasModels = $state([]); // Models in the selected alias
  let showAliasPrompt = $state(false);
  let pendingModelAlias = $state(null); // Alias found when user selects a model

  let formData = $state({
    platform_id: null,
    usb_type_id: null,
    model_id: null,
    version_id: null,
    technician_id: null,
    custom_text: '',
    hardware_model: prefill?.hardware_model || '',
    hardware_serial: prefill?.hardware_serial || '',
    capacity_gb: prefill?.capacity_gb || null
  });

  let selectedType = $state(null);
  let createdUsb = $state(null);

  async function loadReferenceData() {
    loading = true;
    try {
      [platforms, technicians, models, aliases] = await Promise.all([
        api.getPlatforms(true),
        api.getTechnicians(true),
        api.getModels(true),
        api.getAliases(true)
      ]);
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

  async function loadUsbTypes() {
    if (!formData.platform_id) {
      usbTypes = [];
      return;
    }
    try {
      usbTypes = await api.getUsbTypes(formData.platform_id, true);
    } catch (e) {
      showError('Failed to load USB types');
    }
  }

  async function loadVersions() {
    if (!formData.usb_type_id) {
      versions = [];
      return;
    }
    try {
      // If alias is selected, load versions by alias
      // Otherwise, load by model if requires_model
      const modelId = selectedAlias ? null : (selectedType?.requires_model ? formData.model_id : null);
      const aliasId = selectedAlias?.id || null;
      versions = await api.getVersions(formData.usb_type_id, modelId, true, aliasId);
    } catch (e) {
      showError('Failed to load versions');
    }
  }

  async function loadAliasModels(aliasId) {
    if (!aliasId) {
      aliasModels = [];
      return;
    }
    try {
      aliasModels = await api.getAliasModels(aliasId);
    } catch (e) {
      showError('Failed to load alias models');
      aliasModels = [];
    }
  }

  function handlePlatformChange(val) {
    formData.platform_id = val;
    formData.usb_type_id = null;
    formData.model_id = null;
    formData.version_id = null;
    selectedType = null;
    selectedAlias = null;
    aliasModels = [];
    loadUsbTypes();
  }

  function handleTypeChange(val) {
    formData.usb_type_id = val;
    formData.model_id = null;
    formData.version_id = null;
    selectedType = usbTypes.find(t => t.id === val);
    selectedAlias = null;
    aliasModels = [];
    if (!selectedType?.requires_model && !selectedType?.supports_aliases) {
      loadVersions();
    }
  }

  async function handleAliasChange(val) {
    const alias = aliases.find(a => a.id === val);
    selectedAlias = alias || null;
    formData.model_id = null;
    formData.version_id = null;

    if (alias) {
      await loadAliasModels(alias.id);
      await loadVersions();
    } else {
      aliasModels = [];
      versions = [];
    }
  }

  async function handleModelChange(val) {
    formData.model_id = val;
    formData.version_id = null;

    // If USB type supports aliases and user selected a model, check if it has an alias
    if (selectedType?.supports_aliases && val && !selectedAlias) {
      try {
        const modelAlias = await api.getModelAlias(val);
        if (modelAlias) {
          // Model has an alias - prompt user to switch to alias
          pendingModelAlias = modelAlias;
          showAliasPrompt = true;
          return;
        }
      } catch (e) {
        // No alias found, continue normally
      }
    }

    loadVersions();
  }

  function confirmUseAlias() {
    // User chose to switch to the alias
    showAliasPrompt = false;
    handleAliasChange(pendingModelAlias.id);
    pendingModelAlias = null;
  }

  function skipUseAlias() {
    // User chose to keep using the model directly
    showAliasPrompt = false;
    pendingModelAlias = null;
    loadVersions();
  }

  // Display function for models
  function displayModel(m) {
    return m.name + (m.model_number ? ` (${m.model_number})` : '');
  }

  // Display function for versions
  function displayVersion(v) {
    let text = v.version_code;
    if (v.is_current) text += ' (latest)';
    if (v.is_legacy_valid) text += ' (legacy)';
    return text;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.platform_id) {
      showError('Platform is required');
      return;
    }
    if (!formData.usb_type_id) {
      showError('USB Type is required');
      return;
    }
    // Model is required unless using alias
    if (selectedType?.requires_model && !formData.model_id && !selectedAlias) {
      showError('Model is required for this USB type');
      return;
    }
    // For supports_aliases types, need either alias or model
    if (selectedType?.supports_aliases && !selectedAlias && !formData.model_id) {
      showError('Please select an alias or model');
      return;
    }
    if (!formData.version_id) {
      showError('Version is required');
      return;
    }

    saving = true;
    try {
      const result = await api.createUsbDrive(formData, session.username);
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
    formData = {
      platform_id: formData.platform_id,
      usb_type_id: formData.usb_type_id,
      model_id: formData.model_id,
      version_id: formData.version_id,
      technician_id: formData.technician_id,
      custom_text: formData.custom_text,
      hardware_model: '',
      hardware_serial: '',
      capacity_gb: null
    };
    // Keep selectedAlias and aliasModels from previous selection
  }

  // Derived: models to show in dropdown
  // If alias is selected, show only models in that alias
  // Otherwise show all models
  const availableModels = $derived.by(() => {
    if (selectedAlias && aliasModels.length > 0) {
      return aliasModels;
    }
    return models;
  });

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
            <SearchableSelect
              bind:value={formData.platform_id}
              options={platforms}
              label="Platform"
              placeholder="Search platforms..."
              required
              onchange={handlePlatformChange}
            />

            <div class="mt-4">
              <SearchableSelect
                bind:value={formData.usb_type_id}
                options={usbTypes}
                label="USB Type"
                placeholder="Search USB types..."
                required
                disabled={!formData.platform_id}
                onchange={handleTypeChange}
              />
            </div>

            {#if selectedType?.supports_aliases}
              <div class="mt-4">
                <SearchableSelect
                  value={selectedAlias?.id || null}
                  options={aliases}
                  label="Alias (optional)"
                  placeholder="Search aliases..."
                  onchange={handleAliasChange}
                />
                <p class="text-xs text-base-content/50 mt-1 ml-1">
                  Select an alias to use shared versions across multiple models
                </p>
              </div>
            {/if}

            {#if selectedType?.requires_model || selectedType?.supports_aliases}
              <div class="mt-4">
                <SearchableSelect
                  bind:value={formData.model_id}
                  options={availableModels}
                  label={selectedAlias ? "Model (from alias)" : "Model"}
                  placeholder="Search models..."
                  displayFn={displayModel}
                  required={selectedType?.requires_model && !selectedAlias}
                  onchange={handleModelChange}
                />
                {#if selectedAlias}
                  <p class="text-xs text-base-content/50 mt-1 ml-1">
                    Showing {aliasModels.length} model(s) in "{selectedAlias.name}" alias
                  </p>
                {/if}
              </div>
            {/if}

            <div class="mt-4">
              <SearchableSelect
                bind:value={formData.version_id}
                options={versions}
                label="Version"
                placeholder="Search versions..."
                displayFn={displayVersion}
                required
                disabled={!formData.usb_type_id || (selectedType?.requires_model && !formData.model_id && !selectedAlias) || (selectedType?.supports_aliases && !selectedAlias && !formData.model_id)}
              />
              {#if selectedAlias && versions.length > 0}
                <p class="text-xs text-base-content/50 mt-1 ml-1">
                  Showing versions for alias "{selectedAlias.name}"
                </p>
              {/if}
            </div>

            <div class="divider"></div>

            <SearchableSelect
              bind:value={formData.technician_id}
              options={technicians}
              label="Technician (optional)"
              placeholder="Search technicians..."
            />
            <p class="text-xs text-base-content/50 mt-1 ml-1">Required for printing stickers</p>

            <div class="form-control mt-4">
              <label class="label">
                <span class="label-text">Custom Text (optional)</span>
              </label>
              <input
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
                <label class="label"><span class="label-text">Hardware Model</span></label>
                <input
                  type="text"
                  class="input input-bordered"
                  bind:value={formData.hardware_model}
                  placeholder="e.g., SanDisk Ultra"
                />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Hardware Serial</span></label>
                <input
                  type="text"
                  class="input input-bordered font-mono"
                  bind:value={formData.hardware_serial}
                  placeholder="e.g., 4C530001234567"
                />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Capacity (GB)</span></label>
                <input
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

<!-- Alias Prompt Dialog -->
<ConfirmDialog
  open={showAliasPrompt}
  title="Model Has an Alias"
  message="This model belongs to the '{pendingModelAlias?.name}' alias. Using the alias will allow you to select from shared versions that apply to all {pendingModelAlias?.model_count || 0} models in the group. Would you like to use the alias instead?"
  confirmText="Use Alias"
  cancelText="Keep Model"
  confirmClass="btn-primary"
  onconfirm={confirmUseAlias}
  oncancel={skipUseAlias}
/>
