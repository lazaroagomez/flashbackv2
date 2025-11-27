<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  let { navigate } = $props();

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
    custom_text: ''
  });
  let quantity = $state(1);

  let selectedType = $state(null);
  let createdUsbs = $state(null);

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
    if (v.is_current) text += ' (current)';
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
    if (quantity < 1 || quantity > 100) {
      showError('Quantity must be between 1 and 100');
      return;
    }

    saving = true;
    try {
      const result = await api.createUsbDriveSeries(formData, quantity, session.username);
      showSuccess(`Created ${result.length} USB drives`);
      createdUsbs = result;
    } catch (e) {
      showError(e.message || 'Failed to create USB drives');
    } finally {
      saving = false;
    }
  }

  async function printAllStickers() {
    if (!createdUsbs?.length) return;
    try {
      const ids = createdUsbs.map(u => u.id);
      const result = await api.printStickerBulk(ids);
      showSuccess(`Generated ${result.count} sticker(s)`);
    } catch (e) {
      showError(e.message || 'Failed to print stickers');
    }
  }

  function createAnother() {
    createdUsbs = null;
    quantity = 1;
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
    <h1 class="text-2xl font-bold">Create USB Drive Series</h1>
  </div>

  {#if createdUsbs}
    <!-- Success State -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="text-center mb-4">
          <div class="text-success mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Created {createdUsbs.length} USB Drives!</h2>
        </div>

        <div class="overflow-x-auto max-h-64">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>USB ID</th>
              </tr>
            </thead>
            <tbody>
              {#each createdUsbs as usb}
                <tr class="hover cursor-pointer" onclick={() => navigate('usb-drive-detail', { id: usb.id })}>
                  <td class="font-mono font-bold">{usb.usb_id}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="flex gap-2 mt-6 justify-center">
          {#if formData.technician_id}
            <button class="btn btn-primary" onclick={printAllStickers}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print All Stickers
            </button>
          {:else}
            <div class="tooltip" data-tip="Assign a technician to print stickers">
              <button class="btn btn-primary" disabled>Print Stickers</button>
            </div>
          {/if}
          <button class="btn btn-outline" onclick={createAnother}>Create More</button>
          <button class="btn btn-ghost" onclick={() => navigate('usb-drives')}>
            View All USB Drives
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
            <div class="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Creates multiple USB drives with the same configuration and sequential IDs</span>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Quantity *</span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                bind:value={quantity}
                min="1"
                max="100"
              />
              <label class="label">
                <span class="label-text-alt text-base-content/50">Max 100 per batch</span>
              </label>
            </div>

            <div class="divider"></div>

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
            <p class="text-xs text-base-content/50 mt-1 ml-1">All created USBs will be assigned to this technician</p>

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
              <label class="label">
                <span class="label-text-alt text-base-content/50">Same custom text for all created USBs</span>
              </label>
            </div>

            <div class="form-control mt-6">
              <button class="btn btn-primary" type="submit" disabled={saving}>
                {#if saving}
                  <span class="loading loading-spinner loading-sm"></span>
                {/if}
                Create {quantity} USB Drive{quantity > 1 ? 's' : ''}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  {/if}
</div>
