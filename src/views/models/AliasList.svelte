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

  let aliases = $state([]);
  let allModels = $state([]);
  let loading = $state(true);
  let showModal = $state(false);
  let showManageModelsModal = $state(false);
  let editingAlias = $state(null);
  let managingAlias = $state(null);
  let aliasModels = $state([]);
  let formData = $state({
    name: '',
    notes: '',
    status: 'active'
  });
  let saving = $state(false);
  let loadingModels = $state(false);

  // For adding models to alias
  let selectedModelToAdd = $state(null);

  // Duplicate detection
  let showDuplicateConfirm = $state(false);
  let similarItems = $state([]);

  // Search within manage models modal
  let modelSearchQuery = $state('');

  async function loadData() {
    loading = true;
    try {
      [aliases, allModels] = await Promise.all([
        api.getAliasesWithCount(false),
        api.getModels(true) // Only active models
      ]);
    } catch (e) {
      showError('Failed to load aliases');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingAlias = null;
    formData = { name: '', notes: '', status: 'active' };
    showModal = true;
  }

  function openEditModal(alias, e) {
    e?.stopPropagation();
    editingAlias = alias;
    formData = {
      name: alias.name,
      notes: alias.notes || '',
      status: alias.status
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingAlias = null;
  }

  async function openManageModelsModal(alias) {
    managingAlias = alias;
    modelSearchQuery = '';
    showManageModelsModal = true;
    await loadAliasModels(alias.id);
  }

  async function loadAliasModels(aliasId) {
    loadingModels = true;
    try {
      aliasModels = await api.getAliasModels(aliasId);
    } catch (e) {
      showError('Failed to load alias models');
    } finally {
      loadingModels = false;
    }
  }

  function closeManageModelsModal() {
    showManageModelsModal = false;
    managingAlias = null;
    aliasModels = [];
    selectedModelToAdd = null;
  }

  // Models available to add (not already in any alias)
  const availableModels = $derived.by(() => {
    const aliasModelIds = new Set(aliasModels.map(m => m.id));
    let available = allModels.filter(m => !aliasModelIds.has(m.id));

    // Filter by search query
    if (modelSearchQuery.trim()) {
      const query = modelSearchQuery.toLowerCase().trim();
      available = available.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (m.model_number && m.model_number.toLowerCase().includes(query))
      );
    }

    return available;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }

    // Check for duplicates only when creating
    if (!editingAlias) {
      const similar = await api.checkSimilarAlias(formData.name);
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
      if (editingAlias) {
        await api.updateAlias(editingAlias.id, formData);
        showSuccess('Alias updated');
      } else {
        await api.createAlias(formData);
        showSuccess('Alias created');
      }
      closeModal();
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to save alias');
    } finally {
      saving = false;
    }
  }

  function confirmDuplicate() {
    showDuplicateConfirm = false;
    doCreate();
  }

  async function addModelToAlias() {
    if (!selectedModelToAdd || !managingAlias) return;

    try {
      await api.addModelToAlias(managingAlias.id, selectedModelToAdd);
      showSuccess('Model added to alias');
      selectedModelToAdd = null;
      await loadAliasModels(managingAlias.id);
      await loadData(); // Refresh model counts
    } catch (e) {
      showError(e.message || 'Failed to add model');
    }
  }

  async function removeModelFromAlias(modelId) {
    if (!managingAlias) return;

    try {
      await api.removeModelFromAlias(managingAlias.id, modelId);
      showSuccess('Model removed from alias');
      await loadAliasModels(managingAlias.id);
      await loadData(); // Refresh model counts
    } catch (e) {
      showError(e.message || 'Failed to remove model');
    }
  }

  $effect(() => {
    loadData();
  });
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <p class="text-base-content/70">
      Group multiple models that share the same version/recovery image.
    </p>
    <button class="btn btn-primary" onclick={openCreateModal}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Alias
    </button>
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if aliases.length === 0}
        <div class="text-center py-8 text-base-content/50">
          No aliases found. Create one to group models that share the same version.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Models</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each aliases as alias}
                <tr class="hover">
                  <td class="font-medium">{alias.name}</td>
                  <td>
                    <span class="badge badge-neutral">{alias.model_count} model(s)</span>
                  </td>
                  <td class="max-w-xs truncate">{alias.notes || '-'}</td>
                  <td><StatusBadge status={alias.status} /></td>
                  <td class="space-x-2">
                    <button class="btn btn-ghost btn-sm" onclick={() => openManageModelsModal(alias)}>
                      Manage Models
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick={(e) => openEditModal(alias, e)}>
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

<!-- Create/Edit Alias Modal -->
<Modal open={showModal} title={editingAlias ? 'Edit Alias' : 'Add Alias'} onclose={closeModal}>
  <form onsubmit={handleSubmit}>
    <div class="form-control">
      <label class="label" for="alias-name">
        <span class="label-text">Name *</span>
      </label>
      <input
        id="alias-name"
        type="text"
        class="input input-bordered"
        bind:value={formData.name}
        placeholder="Enter alias name (e.g., nissa)"
        maxlength="100"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label" for="alias-notes">
        <span class="label-text">Notes</span>
      </label>
      <textarea
        id="alias-notes"
        class="textarea textarea-bordered"
        bind:value={formData.notes}
        placeholder="Enter notes (optional)"
        rows="3"
      ></textarea>
    </div>

    {#if editingAlias}
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
        {editingAlias ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
</Modal>

<!-- Manage Models Modal -->
<Modal
  open={showManageModelsModal}
  title="Manage Models - {managingAlias?.name}"
  onclose={closeManageModelsModal}
  size="lg"
>
  <div class="space-y-4">
    <!-- Add model section -->
    <div class="bg-base-200 rounded-lg p-4">
      <h3 class="font-semibold mb-3">Add Model to Alias</h3>
      <div class="flex gap-2">
        <div class="flex-1">
          <input
            type="text"
            class="input input-bordered w-full"
            placeholder="Search models..."
            bind:value={modelSearchQuery}
          />
        </div>
      </div>

      {#if modelSearchQuery && availableModels.length > 0}
        <div class="mt-2 max-h-40 overflow-y-auto">
          {#each availableModels.slice(0, 10) as model}
            <button
              class="w-full text-left p-2 hover:bg-base-300 rounded flex justify-between items-center"
              onclick={() => { selectedModelToAdd = model.id; addModelToAlias(); }}
            >
              <span>{model.name} {model.model_number ? `(${model.model_number})` : ''}</span>
              <span class="btn btn-xs btn-primary">Add</span>
            </button>
          {/each}
          {#if availableModels.length > 10}
            <p class="text-sm text-base-content/50 p-2">
              ... and {availableModels.length - 10} more. Type to filter.
            </p>
          {/if}
        </div>
      {:else if modelSearchQuery}
        <p class="text-sm text-base-content/50 mt-2">No matching models available.</p>
      {:else}
        <p class="text-sm text-base-content/50 mt-2">Type to search for models to add.</p>
      {/if}
    </div>

    <!-- Current models in alias -->
    <div>
      <h3 class="font-semibold mb-3">
        Models in this Alias ({aliasModels.length})
      </h3>

      {#if loadingModels}
        <div class="flex justify-center py-4">
          <span class="loading loading-spinner"></span>
        </div>
      {:else if aliasModels.length === 0}
        <div class="text-center py-4 text-base-content/50">
          No models in this alias yet. Add models above.
        </div>
      {:else}
        <div class="overflow-x-auto max-h-60">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Model Number</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {#each aliasModels as model}
                <tr>
                  <td>{model.name}</td>
                  <td>{model.model_number || '-'}</td>
                  <td>
                    <button
                      class="btn btn-ghost btn-xs text-error"
                      onclick={() => removeModelFromAlias(model.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeManageModelsModal}>Close</button>
    </div>
  </div>
</Modal>

<!-- Duplicate confirmation -->
<ConfirmDialog
  open={showDuplicateConfirm}
  title="Similar Alias Found"
  message="An alias with a similar name already exists: {similarItems.map(s => s.name).join(', ')}. Do you still want to create '{formData.name}'?"
  confirmText="Create Anyway"
  confirmClass="btn-warning"
  onconfirm={confirmDuplicate}
  oncancel={() => showDuplicateConfirm = false}
/>
