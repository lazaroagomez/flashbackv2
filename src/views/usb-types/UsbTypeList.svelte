<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' }
  ];

  let usbTypes = $state([]);
  let platforms = $state([]);
  let loading = $state(true);
  let showModal = $state(false);
  let editingType = $state(null);
  let formData = $state({
    platform_id: null,
    name: '',
    requires_model: false,
    supports_legacy: false,
    status: 'active'
  });
  let saving = $state(false);
  let filterPlatform = $state(null);

  // Duplicate detection
  let showDuplicateConfirm = $state(false);
  let similarItems = $state([]);

  async function loadData() {
    loading = true;
    try {
      [usbTypes, platforms] = await Promise.all([
        api.getUsbTypes(filterPlatform, false),
        api.getPlatforms(false)
      ]);
    } catch (e) {
      showError('Failed to load data');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingType = null;
    formData = {
      platform_id: filterPlatform || null,
      name: '',
      requires_model: false,
      supports_legacy: false,
      status: 'active'
    };
    showModal = true;
  }

  function openEditModal(type) {
    editingType = type;
    formData = {
      platform_id: type.platform_id,
      name: type.name,
      requires_model: type.requires_model,
      supports_legacy: type.supports_legacy,
      status: type.status
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingType = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }
    if (!formData.platform_id) {
      showError('Platform is required');
      return;
    }

    // Check for duplicates only when creating
    if (!editingType) {
      const similar = await api.checkSimilarUsbType(formData.name, formData.platform_id);
      if (similar.length > 0) {
        similarItems = similar;
        showDuplicateConfirm = true;
        return;
      }
    }

    await doCreate();
  }

  async function doCreate() {
    saving = true;
    try {
      if (editingType) {
        await api.updateUsbType(editingType.id, formData);
        showSuccess('USB Type updated');
      } else {
        await api.createUsbType(formData);
        showSuccess('USB Type created');
      }
      closeModal();
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to save USB type');
    } finally {
      saving = false;
    }
  }

  function confirmDuplicate() {
    showDuplicateConfirm = false;
    doCreate();
  }

  function handleFilterChange(val) {
    filterPlatform = val;
    loadData();
  }

  $effect(() => {
    loadData();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">USB Types</h1>
    <button class="btn btn-primary" onclick={openCreateModal}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add USB Type
    </button>
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <div class="flex gap-4 mb-4">
        <div class="w-64">
          <SearchableSelect
            bind:value={filterPlatform}
            options={platforms}
            placeholder="All Platforms"
            onchange={handleFilterChange}
          />
        </div>
      </div>

      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if usbTypes.length === 0}
        <div class="text-center py-8 text-base-content/50">
          No USB types found. Create one to get started.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Platform</th>
                <th>Requires Model</th>
                <th>Supports Legacy</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each usbTypes as type}
                <tr class="hover">
                  <td class="font-medium">{type.name}</td>
                  <td>{type.platform_name}</td>
                  <td>
                    {#if type.requires_model}
                      <span class="badge badge-info badge-sm">Yes</span>
                    {:else}
                      <span class="text-base-content/50">No</span>
                    {/if}
                  </td>
                  <td>
                    {#if type.supports_legacy}
                      <span class="badge badge-info badge-sm">Yes</span>
                    {:else}
                      <span class="text-base-content/50">No</span>
                    {/if}
                  </td>
                  <td><StatusBadge status={type.status} /></td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick={() => openEditModal(type)}>
                      Edit
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>

<Modal open={showModal} title={editingType ? 'Edit USB Type' : 'Add USB Type'} onclose={closeModal}>
  <form onsubmit={handleSubmit}>
    <SearchableSelect
      bind:value={formData.platform_id}
      options={platforms.filter(p => p.status === 'active')}
      label="Platform"
      placeholder="Search platforms..."
      required
    />

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Name *</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.name}
        placeholder="Enter USB type name"
        maxlength="100"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label cursor-pointer justify-start gap-3">
        <input type="checkbox" class="checkbox" bind:checked={formData.requires_model} />
        <span class="label-text">Requires Model</span>
      </label>
      <label class="label">
        <span class="label-text-alt text-base-content/50">If checked, USB drives of this type must have a model assigned</span>
      </label>
    </div>

    <div class="form-control mt-2">
      <label class="label cursor-pointer justify-start gap-3">
        <input type="checkbox" class="checkbox" bind:checked={formData.supports_legacy} />
        <span class="label-text">Supports Legacy Versions</span>
      </label>
      <label class="label">
        <span class="label-text-alt text-base-content/50">If checked, versions can be marked as "legacy valid" to prevent pending update status</span>
      </label>
    </div>

    {#if editingType}
      <div class="mt-4">
        <SearchableSelect
          bind:value={formData.status}
          options={statusOptions}
          valueField="id"
          label="Status"
          placeholder="Search status..."
        />
      </div>
    {/if}

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeModal}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        {editingType ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
</Modal>

<ConfirmDialog
  open={showDuplicateConfirm}
  title="Similar USB Type Found"
  message="A USB type with a similar name already exists: {similarItems.map(s => `${s.name} (${s.platform_name})`).join(', ')}. Do you still want to create '{formData.name}'?"
  confirmText="Create Anyway"
  confirmClass="btn-warning"
  onconfirm={confirmDuplicate}
  oncancel={() => showDuplicateConfirm = false}
/>
