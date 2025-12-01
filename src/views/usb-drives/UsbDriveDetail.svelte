<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import TechnicianWarning from '../../lib/components/TechnicianWarning.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import BackHeader from '../../lib/components/BackHeader.svelte';

  let { id, navigate } = $props();

  let usb = $state(null);
  let eventLogs = $state([]);
  let loading = $state(true);

  // Edit state
  let showEditModal = $state(false);
  let showRepurposeModal = $state(false);
  let editData = $state({
    version_id: null,
    technician_id: null,
    status: null,
    custom_text: ''
  });
  let repurposeData = $state({
    platform_id: null,
    usb_type_id: null,
    model_id: null,
    version_id: null,
    technician_id: null,
    custom_text: ''
  });
  let saving = $state(false);

  // Reference data
  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let versions = $state([]);
  let technicians = $state([]);

  // For repurpose form
  let repurposeUsbTypes = $state([]);
  let repurposeVersions = $state([]);
  let repurposeSelectedType = $state(null);

  async function loadData() {
    loading = true;
    try {
      [usb, eventLogs, technicians] = await Promise.all([
        api.getUsbDrive(id),
        api.getEventLogs(id),
        api.getTechnicians(true)
      ]);

      // Load versions for current type/model (only active versions)
      const modelId = usb.requires_model ? usb.model_id : 'null';
      versions = await api.getVersions(usb.usb_type_id, modelId, true);
    } catch (e) {
      showError('Failed to load USB drive details');
    } finally {
      loading = false;
    }
  }

  async function loadRepurposeData() {
    try {
      [platforms, models] = await Promise.all([
        api.getPlatforms(true),
        api.getModels(true)
      ]);
    } catch (e) {
      showError('Failed to load data');
    }
  }

  function openEditModal() {
    editData = {
      version_id: usb.version_id,
      technician_id: usb.technician_id,
      status: usb.status,
      custom_text: usb.custom_text || ''
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
  }

  async function handleEdit(e) {
    e.preventDefault();
    saving = true;
    try {
      await api.updateUsbDrive(id, editData, session.username);
      showSuccess('USB drive updated');
      closeEditModal();
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to update USB drive');
    } finally {
      saving = false;
    }
  }

  async function openRepurposeModal() {
    await loadRepurposeData();
    repurposeData = {
      platform_id: null,
      usb_type_id: null,
      model_id: null,
      version_id: null,
      technician_id: usb.technician_id,
      custom_text: usb.custom_text || ''
    };
    repurposeSelectedType = null;
    repurposeUsbTypes = [];
    repurposeVersions = [];
    showRepurposeModal = true;
  }

  function closeRepurposeModal() {
    showRepurposeModal = false;
  }

  const statusOptions = [
    { id: 'assigned', name: 'Assigned' },
    { id: 'pending_update', name: 'Pending Update' },
    { id: 'on_hold', name: 'On Hold' },
    { id: 'lost', name: 'Lost' },
    { id: 'retired', name: 'Retired' }
  ];

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

  async function handleRepurposePlatformChange(val) {
    repurposeData.platform_id = val;
    repurposeData.usb_type_id = null;
    repurposeData.model_id = null;
    repurposeData.version_id = null;
    repurposeSelectedType = null;

    if (repurposeData.platform_id) {
      repurposeUsbTypes = await api.getUsbTypes(repurposeData.platform_id, true);
    } else {
      repurposeUsbTypes = [];
    }
    repurposeVersions = [];
  }

  async function handleRepurposeTypeChange(val) {
    repurposeData.usb_type_id = val;
    repurposeData.model_id = null;
    repurposeData.version_id = null;
    repurposeSelectedType = repurposeUsbTypes.find(t => t.id === val);

    if (repurposeData.usb_type_id && !repurposeSelectedType?.requires_model) {
      repurposeVersions = await api.getVersions(repurposeData.usb_type_id, 'null', true);
    } else {
      repurposeVersions = [];
    }
  }

  async function handleRepurposeModelChange(val) {
    repurposeData.model_id = val;
    repurposeData.version_id = null;

    if (repurposeData.usb_type_id && repurposeData.model_id) {
      repurposeVersions = await api.getVersions(repurposeData.usb_type_id, repurposeData.model_id, true);
    } else {
      repurposeVersions = [];
    }
  }

  async function handleRepurpose(e) {
    e.preventDefault();

    if (!repurposeData.platform_id || !repurposeData.usb_type_id || !repurposeData.version_id) {
      showError('Platform, USB Type, and Version are required');
      return;
    }
    if (repurposeSelectedType?.requires_model && !repurposeData.model_id) {
      showError('Model is required for this USB type');
      return;
    }

    saving = true;
    try {
      await api.repurposeUsbDrive(id, repurposeData, session.username);
      showSuccess('USB drive repurposed');
      closeRepurposeModal();
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to repurpose USB drive');
    } finally {
      saving = false;
    }
  }

  async function changeStatus(newStatus) {
    try {
      await api.updateUsbDrive(id, { ...usb, status: newStatus }, session.username);
      showSuccess(`Status changed to ${newStatus}`);
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to change status');
    }
  }

  async function printSticker() {
    if (!usb.technician_id) {
      showError('Cannot print sticker: No technician assigned');
      return;
    }
    try {
      await api.printSticker(id);
      showSuccess('Sticker generated');
    } catch (e) {
      showError(e.message || 'Failed to print sticker');
    }
  }

  async function markAsUpdated() {
    try {
      await api.markAsUpdated([id], session.username);
      showSuccess('USB drive marked as updated');
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to mark as updated');
    }
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  $effect(() => {
    if (id) loadData();
  });
</script>

<div class="space-y-6">
  <BackHeader title="USB Drive Details" onBack={() => navigate('usb-drives')} />

  {#if loading}
    <div class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if !usb}
    <div class="alert alert-error">USB drive not found</div>
  {:else}
    <!-- USB Info Card -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 class="text-4xl font-mono font-bold">{usb.usb_id}</h2>
            <p class="text-base-content/60 mt-1">Created: {formatDate(usb.created_at)}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            {#if usb.status === 'pending_update'}
              <button class="btn btn-success btn-sm" onclick={markAsUpdated}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Mark Updated
              </button>
            {/if}
            <button class="btn btn-outline btn-sm" onclick={openEditModal}>Edit</button>
            <button class="btn btn-outline btn-sm" onclick={openRepurposeModal}>Repurpose</button>
            {#if usb.technician_id}
              <button class="btn btn-primary btn-sm" onclick={printSticker}>
                Print Sticker
              </button>
            {:else}
              <div class="tooltip" data-tip="Assign a technician first">
                <button class="btn btn-primary btn-sm" disabled>Print Sticker</button>
              </div>
            {/if}
          </div>
        </div>

        <div class="divider"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span class="text-base-content/60 text-sm">Platform</span>
            <p class="font-medium">{usb.platform_name}</p>
          </div>
          <div>
            <span class="text-base-content/60 text-sm">USB Type</span>
            <p class="font-medium">{usb.usb_type_name}</p>
          </div>
          <div>
            <span class="text-base-content/60 text-sm">Model</span>
            <p class="font-medium">{usb.model_name || '-'}</p>
          </div>
          <div>
            <span class="text-base-content/60 text-sm">Version</span>
            <p class="font-medium">
              {usb.version_code}
              {#if usb.version_is_current}
                <span class="badge badge-success badge-sm ml-1">latest</span>
              {:else if usb.is_legacy_valid}
                <span class="badge badge-info badge-sm ml-1">legacy</span>
              {:else}
                <span class="badge badge-warning badge-sm ml-1">outdated</span>
              {/if}
            </p>
          </div>
          <div>
            <span class="text-base-content/60 text-sm">Technician</span>
            <p class="font-medium">
              {#if usb.technician_name}
                <TechnicianWarning
                  technicianStatus={usb.technician_status}
                  technicianName={usb.technician_name}
                />
              {:else}
                <span class="text-base-content/50">Not assigned</span>
              {/if}
            </p>
          </div>
          <div>
            <span class="text-base-content/60 text-sm">Status</span>
            <p><StatusBadge status={usb.status} /></p>
          </div>
          {#if usb.custom_text}
            <div>
              <span class="text-base-content/60 text-sm">Custom Text</span>
              <p class="font-medium">{usb.custom_text}</p>
            </div>
          {/if}
        </div>

        <!-- Hardware Info -->
        {#if usb.hardware_serial || usb.hardware_model || usb.capacity_gb}
          <div class="divider">Hardware Info</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span class="text-base-content/60 text-sm">Hardware Model</span>
              <p class="font-medium">{usb.hardware_model || '-'}</p>
            </div>
            <div>
              <span class="text-base-content/60 text-sm">Hardware Serial</span>
              <p class="font-medium font-mono">{usb.hardware_serial || '-'}</p>
            </div>
            <div>
              <span class="text-base-content/60 text-sm">Capacity</span>
              <p class="font-medium">{usb.capacity_gb ? `${usb.capacity_gb} GB` : '-'}</p>
            </div>
          </div>
        {/if}

        <!-- Quick Status Actions -->
        <div class="divider"></div>
        <div class="flex flex-wrap gap-2">
          <span class="text-sm text-base-content/60 mr-2">Change Status:</span>
          {#if usb.status !== 'assigned'}
            <button class="btn btn-success btn-xs" onclick={() => changeStatus('assigned')}>Assigned</button>
          {/if}
          {#if usb.status !== 'pending_update'}
            <button class="btn btn-warning btn-xs" onclick={() => changeStatus('pending_update')}>Pending Update</button>
          {/if}
          {#if usb.status !== 'on_hold'}
            <button class="btn btn-info btn-xs" onclick={() => changeStatus('on_hold')}>On Hold</button>
          {/if}
          {#if usb.status !== 'lost'}
            <button class="btn btn-error btn-xs" onclick={() => changeStatus('lost')}>Lost</button>
          {/if}
          {#if usb.status !== 'retired'}
            <button class="btn btn-neutral btn-xs" onclick={() => changeStatus('retired')}>Retired</button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title">Event History</h3>
        {#if eventLogs.length === 0}
          <p class="text-base-content/50">No events recorded</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Details</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {#each eventLogs as event}
                  <tr>
                    <td class="whitespace-nowrap">{formatDate(event.timestamp)}</td>
                    <td><StatusBadge status={event.event_type} /></td>
                    <td>{event.details}</td>
                    <td>{event.username}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>

  {/if}
</div>

<!-- Edit Modal -->
<Modal open={showEditModal} title="Edit USB Drive" onclose={closeEditModal}>
  <form onsubmit={handleEdit}>
    <SearchableSelect
      bind:value={editData.version_id}
      options={versions}
      label="Version"
      placeholder="Search versions..."
      displayFn={displayVersion}
    />

    <div class="mt-4">
      <SearchableSelect
        bind:value={editData.technician_id}
        options={technicians}
        label="Technician"
        placeholder="Search technicians..."
      />
    </div>

    <div class="mt-4">
      <SearchableSelect
        bind:value={editData.status}
        options={statusOptions}
        valueField="id"
        label="Status"
        placeholder="Search status..."
      />
    </div>

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Custom Text</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={editData.custom_text}
        maxlength="12"
      />
    </div>

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeEditModal}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}<span class="loading loading-spinner loading-sm"></span>{/if}
        Save Changes
      </button>
    </div>
  </form>
</Modal>

<!-- Repurpose Modal -->
<Modal open={showRepurposeModal} title="Repurpose USB Drive" onclose={closeRepurposeModal}>
  <form onsubmit={handleRepurpose}>
    <div class="alert alert-warning mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>This will change the USB type and version. The USB ID ({usb?.usb_id}) will remain the same.</span>
    </div>

    <SearchableSelect
      bind:value={repurposeData.platform_id}
      options={platforms}
      label="Platform"
      placeholder="Search platforms..."
      required
      onchange={handleRepurposePlatformChange}
    />

    <div class="mt-4">
      <SearchableSelect
        bind:value={repurposeData.usb_type_id}
        options={repurposeUsbTypes}
        label="USB Type"
        placeholder="Search USB types..."
        required
        disabled={!repurposeData.platform_id}
        onchange={handleRepurposeTypeChange}
      />
    </div>

    {#if repurposeSelectedType?.requires_model}
      <div class="mt-4">
        <SearchableSelect
          bind:value={repurposeData.model_id}
          options={models}
          label="Model"
          placeholder="Search models..."
          displayFn={displayModel}
          required
          onchange={handleRepurposeModelChange}
        />
      </div>
    {/if}

    <div class="mt-4">
      <SearchableSelect
        bind:value={repurposeData.version_id}
        options={repurposeVersions}
        label="Version"
        placeholder="Search versions..."
        displayFn={displayVersion}
        required
        disabled={!repurposeData.usb_type_id || (repurposeSelectedType?.requires_model && !repurposeData.model_id)}
      />
    </div>

    <div class="mt-4">
      <SearchableSelect
        bind:value={repurposeData.technician_id}
        options={technicians}
        label="Technician"
        placeholder="Search technicians..."
      />
    </div>

    <div class="form-control mt-4">
      <label class="label"><span class="label-text">Custom Text</span></label>
      <input type="text" class="input input-bordered" bind:value={repurposeData.custom_text} maxlength="12" />
    </div>

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeRepurposeModal}>Cancel</button>
      <button type="submit" class="btn btn-warning" disabled={saving}>
        {#if saving}<span class="loading loading-spinner loading-sm"></span>{/if}
        Repurpose
      </button>
    </div>
  </form>
</Modal>
