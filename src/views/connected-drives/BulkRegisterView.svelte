<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import CascadingUsbSelector from '../../lib/components/FormFields/CascadingUsbSelector.svelte';

  let { navigate, drives = [] } = $props();

  // Reference data (only technicians - cascade handled by component)
  let technicians = $state([]);
  let loading = $state(true);
  let saving = $state(false);

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

  // Other form data
  let technicianId = $state(null);
  let createdDrives = $state([]);

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

  // Handler for CascadingUsbSelector changes
  function handleCascadeChange(value, entities) {
    selectedType = entities.usbType;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!cascadeValue.platform_id || !cascadeValue.usb_type_id || !cascadeValue.version_id) {
      showError('Please fill all required fields');
      return;
    }
    if (selectedType?.requires_model && !cascadeValue.model_id && !cascadeValue.alias_id) {
      showError('Model is required for this USB type');
      return;
    }
    if (selectedType?.supports_aliases && !cascadeValue.alias_id && !cascadeValue.model_id) {
      showError('Please select an alias or model');
      return;
    }

    saving = true;
    try {
      const submitData = {
        ...cascadeValue,
        technician_id: technicianId
      };
      const result = await api.bulkRegisterDrives(
        submitData,
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
              <CascadingUsbSelector
                bind:value={cascadeValue}
                mode="full"
                layout="vertical"
                onchange={handleCascadeChange}
              />

              <div class="divider"></div>

              <SearchableSelect
                bind:value={technicianId}
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
