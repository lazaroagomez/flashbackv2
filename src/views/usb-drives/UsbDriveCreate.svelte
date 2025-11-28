<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  let { navigate, prefill = null } = $props();

  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let versions = $state([]);
  let technicians = $state([]);
  let loading = $state(true);
  let saving = $state(false);

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
      [platforms, technicians, models] = await Promise.all([
        api.getPlatforms(true),
        api.getTechnicians(true),
        api.getModels(true)
      ]);
    } catch (e) {
      showError('Failed to load data');
    } finally {
      loading = false;
    }
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
      const modelId = selectedType?.requires_model ? formData.model_id : 'null';
      versions = await api.getVersions(formData.usb_type_id, modelId);
    } catch (e) {
      showError('Failed to load versions');
    }
  }

  function handlePlatformChange(val) {
    formData.platform_id = val;
    formData.usb_type_id = null;
    formData.model_id = null;
    formData.version_id = null;
    selectedType = null;
    loadUsbTypes();
  }

  function handleTypeChange(val) {
    formData.usb_type_id = val;
    formData.model_id = null;
    formData.version_id = null;
    selectedType = usbTypes.find(t => t.id === val);
    if (!selectedType?.requires_model) {
      loadVersions();
    }
  }

  function handleModelChange(val) {
    formData.model_id = val;
    formData.version_id = null;
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
    if (selectedType?.requires_model && !formData.model_id) {
      showError('Model is required for this USB type');
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

            {#if selectedType?.requires_model}
              <div class="mt-4">
                <SearchableSelect
                  bind:value={formData.model_id}
                  options={models}
                  label="Model"
                  placeholder="Search models..."
                  displayFn={displayModel}
                  required
                  onchange={handleModelChange}
                />
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
                disabled={!formData.usb_type_id || (selectedType?.requires_model && !formData.model_id)}
              />
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

            {#if formData.hardware_serial}
              <div class="divider">Hardware Info</div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text">Model</span></label>
                  <input type="text" class="input input-bordered bg-base-200" value={formData.hardware_model} readonly />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Serial</span></label>
                  <input type="text" class="input input-bordered bg-base-200 font-mono" value={formData.hardware_serial} readonly />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Capacity (GB)</span></label>
                  <input type="text" class="input input-bordered bg-base-200" value={formData.capacity_gb} readonly />
                </div>
              </div>
            {/if}

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
