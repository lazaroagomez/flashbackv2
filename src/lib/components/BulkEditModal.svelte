<script>
  import { api } from '../api.js';
  import { session } from '../stores/session.svelte.js';
  import { showSuccess, showError } from '../stores/toast.svelte.js';
  import Modal from './Modal.svelte';
  import SearchableSelect from './SearchableSelect.svelte';

  let {
    open = $bindable(false),
    selectedIds = [],
    onupdate = () => {}
  } = $props();

  // Reference data
  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let versions = $state([]);
  let technicians = $state([]);
  let loading = $state(false);
  let saving = $state(false);

  // Which fields to change (checkboxes)
  let changePlatformType = $state(false);
  let changeVersion = $state(false);
  let changeTechnician = $state(false);
  let changeStatus = $state(false);
  let changeCustomText = $state(false);

  // Form values
  let selectedPlatform = $state(null);
  let selectedType = $state(null);
  let selectedModel = $state(null);
  let selectedVersion = $state(null);
  let selectedTechnician = $state(null);
  let selectedStatus = $state(null);
  let customText = $state('');

  // Derived state for cascading
  let selectedTypeData = $state(null);

  const statusOptions = [
    { id: 'assigned', name: 'Assigned' },
    { id: 'pending_update', name: 'Pending Update' },
    { id: 'on_hold', name: 'On Hold' },
    { id: 'lost', name: 'Lost' },
    { id: 'retired', name: 'Retired' }
  ];

  async function loadReferenceData() {
    loading = true;
    try {
      [platforms, models, technicians] = await Promise.all([
        api.getPlatforms(true),
        api.getModels(true),
        api.getTechnicians(true)
      ]);
    } catch (e) {
      showError('Failed to load reference data');
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    changePlatformType = false;
    changeVersion = false;
    changeTechnician = false;
    changeStatus = false;
    changeCustomText = false;
    selectedPlatform = null;
    selectedType = null;
    selectedModel = null;
    selectedVersion = null;
    selectedTechnician = null;
    selectedStatus = null;
    customText = '';
    selectedTypeData = null;
    usbTypes = [];
    versions = [];
  }

  function handleClose() {
    resetForm();
    open = false;
  }

  // Cascading handlers
  async function handlePlatformChange(val) {
    selectedPlatform = val;
    selectedType = null;
    selectedModel = null;
    selectedVersion = null;
    selectedTypeData = null;
    versions = [];

    if (val) {
      usbTypes = await api.getUsbTypes(val, true);
    } else {
      usbTypes = [];
    }
  }

  async function handleTypeChange(val) {
    selectedType = val;
    selectedModel = null;
    selectedVersion = null;
    selectedTypeData = usbTypes.find(t => t.id === val) || null;

    if (val && !selectedTypeData?.requires_model) {
      versions = await api.getVersions(val, 'null', true);
    } else {
      versions = [];
    }
  }

  async function handleModelChange(val) {
    selectedModel = val;
    selectedVersion = null;

    if (selectedType && val) {
      versions = await api.getVersions(selectedType, val, true);
    } else if (selectedType && !selectedTypeData?.requires_model) {
      versions = await api.getVersions(selectedType, 'null', true);
    } else {
      versions = [];
    }
  }

  // Display helpers
  function displayModel(m) {
    return m.name + (m.model_number ? ` (${m.model_number})` : '');
  }

  function displayVersion(v) {
    let text = v.version_code;
    if (v.is_current) text += ' (latest)';
    if (v.is_legacy_valid) text += ' (legacy)';
    return text;
  }

  async function handleSubmit() {
    const updates = {};

    // Platform/Type/Model/Version change (repurpose)
    if (changePlatformType) {
      if (!selectedPlatform || !selectedType || !selectedVersion) {
        showError('Platform, USB Type, and Version are required');
        return;
      }
      if (selectedTypeData?.requires_model && !selectedModel) {
        showError('Model is required for this USB type');
        return;
      }
      updates.repurpose = {
        platform_id: selectedPlatform,
        usb_type_id: selectedType,
        model_id: selectedModel,
        version_id: selectedVersion
      };
    }

    // Version only change (without repurpose)
    if (changeVersion && !changePlatformType) {
      if (!selectedVersion) {
        showError('Please select a version');
        return;
      }
      updates.version_id = selectedVersion;
    }

    if (changeTechnician) {
      updates.technician_id = selectedTechnician;
    }

    if (changeStatus && selectedStatus) {
      updates.status = selectedStatus;
    }

    if (changeCustomText) {
      updates.custom_text = customText;
    }

    if (Object.keys(updates).length === 0) {
      showError('No changes selected');
      return;
    }

    saving = true;
    try {
      const result = await api.bulkUpdateUsbDrives(selectedIds, updates, session.username);
      showSuccess(`Updated ${result.updated} USB drive(s)`);
      handleClose();
      onupdate();
    } catch (e) {
      showError(e.message || 'Failed to update USB drives');
    } finally {
      saving = false;
    }
  }

  const hasChanges = $derived(
    changePlatformType ||
    (changeVersion && selectedVersion) ||
    changeTechnician ||
    (changeStatus && selectedStatus) ||
    changeCustomText
  );

  const filteredUsbTypes = $derived.by(() => {
    if (!selectedPlatform) return [];
    return usbTypes;
  });

  // Load data when modal opens
  $effect(() => {
    if (open) {
      loadReferenceData();
    }
  });

  // Reset version selection when not changing platform/type
  $effect(() => {
    if (!changePlatformType) {
      selectedPlatform = null;
      selectedType = null;
      selectedModel = null;
      selectedTypeData = null;
      usbTypes = [];
      if (!changeVersion) {
        selectedVersion = null;
        versions = [];
      }
    }
  });
</script>

<Modal {open} title="Bulk Edit USB Drives" onclose={handleClose} maxWidth="max-w-2xl">
  <div class="space-y-4">
    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>Editing <strong>{selectedIds.length}</strong> USB drive(s). Only checked fields will be changed.</span>
    </div>

    {#if loading}
      <div class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else}
      <div class="grid gap-4">
        <!-- Repurpose: Platform/Type/Model/Version -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox"
                bind:checked={changePlatformType}
              />
              <span class="font-medium">Change Platform / USB Type (Repurpose)</span>
            </label>

            {#if changePlatformType}
              <div class="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <SearchableSelect
                    bind:value={selectedPlatform}
                    options={platforms}
                    label="Platform *"
                    placeholder="Select platform..."
                    onchange={handlePlatformChange}
                  />
                </div>
                <div>
                  <SearchableSelect
                    bind:value={selectedType}
                    options={filteredUsbTypes}
                    label="USB Type *"
                    placeholder="Select USB type..."
                    onchange={handleTypeChange}
                    disabled={!selectedPlatform}
                  />
                </div>
                {#if selectedTypeData?.requires_model}
                  <div>
                    <SearchableSelect
                      bind:value={selectedModel}
                      options={models}
                      label="Model *"
                      placeholder="Select model..."
                      displayFn={displayModel}
                      onchange={handleModelChange}
                    />
                  </div>
                {/if}
                <div>
                  <SearchableSelect
                    bind:value={selectedVersion}
                    options={versions}
                    label="Version *"
                    placeholder="Select version..."
                    displayFn={displayVersion}
                    disabled={versions.length === 0}
                  />
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Technician -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox"
                bind:checked={changeTechnician}
              />
              <span class="font-medium">Change Technician</span>
            </label>

            {#if changeTechnician}
              <div class="mt-4 max-w-xs">
                <SearchableSelect
                  bind:value={selectedTechnician}
                  options={[{ id: null, name: '(Unassigned)' }, ...technicians]}
                  placeholder="Select technician..."
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- Status -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox"
                bind:checked={changeStatus}
              />
              <span class="font-medium">Change Status</span>
            </label>

            {#if changeStatus}
              <div class="mt-4 max-w-xs">
                <SearchableSelect
                  bind:value={selectedStatus}
                  options={statusOptions}
                  valueField="id"
                  placeholder="Select status..."
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- Custom Text -->
        <div class="card bg-base-200">
          <div class="card-body p-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox"
                bind:checked={changeCustomText}
              />
              <span class="font-medium">Change Custom Text</span>
            </label>

            {#if changeCustomText}
              <div class="mt-4">
                <input
                  type="text"
                  class="input input-bordered w-full max-w-xs"
                  bind:value={customText}
                  placeholder="Enter custom text (leave empty to clear)"
                  maxlength="50"
                />
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <div class="modal-action">
      <button type="button" class="btn" onclick={handleClose}>Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        disabled={saving || !hasChanges}
        onclick={handleSubmit}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Update {selectedIds.length} Drive(s)
      </button>
    </div>
  </div>
</Modal>
