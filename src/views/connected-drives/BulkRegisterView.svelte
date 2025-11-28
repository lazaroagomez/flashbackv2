<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  let { navigate, drives = [] } = $props();

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
    technician_id: null
  });

  let selectedType = $state(null);
  let createdDrives = $state([]);

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

  function displayModel(m) {
    return m.name + (m.model_number ? ` (${m.model_number})` : '');
  }

  function displayVersion(v) {
    let text = v.version_code;
    if (v.is_current) text += ' (latest)';
    if (v.is_legacy_valid) text += ' (legacy)';
    return text;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.platform_id || !formData.usb_type_id || !formData.version_id) {
      showError('Please fill all required fields');
      return;
    }
    if (selectedType?.requires_model && !formData.model_id) {
      showError('Model is required for this USB type');
      return;
    }

    saving = true;
    try {
      const result = await api.bulkRegisterDrives(
        formData,
        drives.map(d => ({
          hardware_model: d.model,
          hardware_serial: d.serial,
          capacity_gb: d.sizeGB
        })),
        session.username
      );
      createdDrives = result;
      showSuccess(`${result.length} USB drives registered`);
    } catch (e) {
      showError(e.message || 'Failed to register drives');
    } finally {
      saving = false;
    }
  }

  $effect(() => {
    loadReferenceData();
  });
</script>

<div class="space-y-6">
  <div class="flex items-center gap-4">
    <button class="btn btn-ghost btn-sm" onclick={() => navigate('connected-drives')}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <h1 class="text-2xl font-bold">Register {drives.length} Drive{drives.length > 1 ? 's' : ''}</h1>
  </div>

  {#if createdDrives.length > 0}
    <!-- Success State -->
    <div class="card bg-base-100 shadow">
      <div class="card-body items-center text-center">
        <div class="text-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="card-title">{createdDrives.length} Drives Registered!</h2>
        <div class="my-4 space-y-1">
          {#each createdDrives as drive}
            <p class="font-mono font-bold">{drive.usb_id}</p>
          {/each}
        </div>
        <div class="flex gap-2 mt-4">
          <button class="btn btn-primary" onclick={() => navigate('usb-drives')}>
            View All Drives
          </button>
          <button class="btn btn-ghost" onclick={() => navigate('connected-drives')}>
            Back to Connected
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Drives to Register -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg">Drives to Register</h2>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Serial</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {#each drives as drive}
                  <tr>
                    <td>{drive.model}</td>
                    <td class="font-mono text-xs">{drive.serial}</td>
                    <td>{drive.sizeGB} GB</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Registration Form -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg">Common Settings</h2>
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
                placeholder="Select platform..."
                required
                onchange={handlePlatformChange}
              />

              <div class="mt-4">
                <SearchableSelect
                  bind:value={formData.usb_type_id}
                  options={usbTypes}
                  label="USB Type"
                  placeholder="Select USB type..."
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
                    placeholder="Select model..."
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
                  placeholder="Select version..."
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
                placeholder="Select technician..."
              />

              <div class="form-control mt-6">
                <button class="btn btn-primary" type="submit" disabled={saving}>
                  {#if saving}
                    <span class="loading loading-spinner loading-sm"></span>
                  {/if}
                  Register {drives.length} Drive{drives.length > 1 ? 's' : ''}
                </button>
              </div>
            </form>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
