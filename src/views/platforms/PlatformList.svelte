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

  let platforms = $state([]);
  let loading = $state(true);
  let showModal = $state(false);
  let editingPlatform = $state(null);
  let formData = $state({ name: '', status: 'active' });
  let saving = $state(false);

  // Duplicate detection
  let showDuplicateConfirm = $state(false);
  let similarItems = $state([]);

  async function loadPlatforms() {
    loading = true;
    try {
      platforms = await api.getPlatforms(false);
    } catch (e) {
      showError('Failed to load platforms');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingPlatform = null;
    formData = { name: '', status: 'active' };
    showModal = true;
  }

  function openEditModal(platform) {
    editingPlatform = platform;
    formData = { name: platform.name, status: platform.status };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingPlatform = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }

    // Check for duplicates only when creating
    if (!editingPlatform) {
      const similar = await api.checkSimilarPlatform(formData.name);
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
      if (editingPlatform) {
        await api.updatePlatform(editingPlatform.id, formData);
        showSuccess('Platform updated');
      } else {
        await api.createPlatform(formData);
        showSuccess('Platform created');
      }
      closeModal();
      loadPlatforms();
    } catch (e) {
      showError(e.message || 'Failed to save platform');
    } finally {
      saving = false;
    }
  }

  function confirmDuplicate() {
    showDuplicateConfirm = false;
    doCreate();
  }

  $effect(() => {
    loadPlatforms();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Platforms</h1>
    <button class="btn btn-primary" onclick={openCreateModal}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Platform
    </button>
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if platforms.length === 0}
        <div class="text-center py-8 text-base-content/50">
          No platforms found. Create one to get started.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each platforms as platform}
                <tr class="hover">
                  <td class="font-medium">{platform.name}</td>
                  <td><StatusBadge status={platform.status} /></td>
                  <td>{new Date(platform.created_at).toLocaleDateString()}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick={() => openEditModal(platform)}>
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

<Modal open={showModal} title={editingPlatform ? 'Edit Platform' : 'Add Platform'} onclose={closeModal}>
  <form onsubmit={handleSubmit}>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Name *</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.name}
        placeholder="Enter platform name"
        maxlength="100"
      />
    </div>

    {#if editingPlatform}
      <div class="mt-4">
        <SearchableSelect
          bind:value={formData.status}
          options={statusOptions}
          valueField="id"
          label="Status"
          placeholder="Search status..."
        />
        <p class="text-xs text-base-content/50 mt-1 ml-1">Inactive platforms are hidden from dropdowns</p>
      </div>
    {/if}

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeModal}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        {editingPlatform ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
</Modal>

<ConfirmDialog
  open={showDuplicateConfirm}
  title="Similar Platform Found"
  message="A platform with a similar name already exists: {similarItems.map(s => s.name).join(', ')}. Do you still want to create '{formData.name}'?"
  confirmText="Create Anyway"
  confirmClass="btn-warning"
  onconfirm={confirmDuplicate}
  oncancel={() => showDuplicateConfirm = false}
/>
