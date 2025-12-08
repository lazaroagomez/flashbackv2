<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';
  import { createBulkImport } from '../../lib/utils/bulkImport.svelte.js';
  import AliasList from './AliasList.svelte';

  let { navigate } = $props();

  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' }
  ];

  // Tab state
  let activeTab = $state('models');

  // Search state
  let searchQuery = $state('');

  let models = $state([]);
  let loading = $state(true);
  let showModal = $state(false);
  let showBulkModal = $state(false);
  let editingModel = $state(null);
  let formData = $state({
    name: '',
    model_number: '',
    notes: '',
    status: 'active'
  });
  let saving = $state(false);

  // Single item duplicate detection (for create modal)
  let showSingleDuplicateConfirm = $state(false);
  let singleSimilarItems = $state([]);

  // Bulk import composable
  const bulkImport = createBulkImport({
    checkSimilar: (item) => api.checkSimilarModel(item.name),
    createItem: (item) => api.createModel({
      name: item.name,
      model_number: item.model_number,
      notes: item.notes,
      status: 'active'
    }),
    parseItem: (line) => {
      const parts = line.split(',').map(p => p.trim());
      return {
        name: parts[0] || '',
        model_number: parts[1] || '',
        notes: parts[2] || '',
        valid: !!parts[0]
      };
    },
    entityName: 'model',
    onComplete: ({ results, message, success }) => {
      if (success) {
        showSuccess(message);
        closeBulkModal();
        loadModels();
      } else if (results.failed > 0) {
        showError(message || 'Failed to create any models');
      }
    }
  });

  async function loadModels() {
    loading = true;
    try {
      models = await api.getModels(false);
    } catch (e) {
      showError('Failed to load models');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingModel = null;
    formData = { name: '', model_number: '', notes: '', status: 'active' };
    showModal = true;
  }

  function openEditModal(model, e) {
    e.stopPropagation();
    editingModel = model;
    formData = {
      name: model.name,
      model_number: model.model_number || '',
      notes: model.notes || '',
      status: model.status
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingModel = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }

    // Check for duplicates only when creating
    if (!editingModel) {
      const similar = await api.checkSimilarModel(formData.name);
      if (similar.length > 0) {
        singleSimilarItems = similar;
        showSingleDuplicateConfirm = true;
        return;
      }
    }

    await doCreate();
  }

  async function doCreate() {
    saving = true;
    try {
      if (editingModel) {
        await api.updateModel(editingModel.id, formData);
        showSuccess('Model updated');
      } else {
        await api.createModel(formData);
        showSuccess('Model created');
      }
      closeModal();
      loadModels();
    } catch (e) {
      showError(e.message || 'Failed to save model');
    } finally {
      saving = false;
    }
  }

  function confirmSingleDuplicate() {
    showSingleDuplicateConfirm = false;
    doCreate();
  }

  function viewDetail(model) {
    navigate('model-detail', { id: model.id });
  }

  function openBulkModal() {
    bulkImport.reset();
    showBulkModal = true;
  }

  function closeBulkModal() {
    showBulkModal = false;
    bulkImport.reset();
  }

  async function handleBulkSubmit() {
    const result = await bulkImport.startImport();
    if (!result.success) {
      showError(result.message);
    }
  }

  // Parse bulk text when it changes
  $effect(() => {
    if (bulkImport.bulkText) {
      bulkImport.parseBulkText();
    }
  });

  // Filtered models based on search query
  const filteredModels = $derived.by(() => {
    if (!searchQuery.trim()) return models;
    const query = searchQuery.toLowerCase().trim();
    return models.filter(m =>
      m.name.toLowerCase().includes(query) ||
      (m.model_number && m.model_number.toLowerCase().includes(query)) ||
      (m.notes && m.notes.toLowerCase().includes(query))
    );
  });

  $effect(() => {
    loadModels();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Models & Aliases</h1>
    {#if activeTab === 'models'}
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Model
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
          <li><button onclick={openCreateModal}>Single Model</button></li>
          <li><button onclick={openBulkModal}>Bulk Import</button></li>
        </ul>
      </div>
    {/if}
  </div>

  <!-- Tabs -->
  <div role="tablist" class="tabs tabs-boxed w-fit">
    <button
      role="tab"
      class="tab"
      class:tab-active={activeTab === 'models'}
      onclick={() => activeTab = 'models'}
    >
      Models
    </button>
    <button
      role="tab"
      class="tab"
      class:tab-active={activeTab === 'aliases'}
      onclick={() => activeTab = 'aliases'}
    >
      Aliases
    </button>
  </div>

  {#if activeTab === 'models'}
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <!-- Search box -->
        <div class="flex gap-4 mb-4">
          <div class="form-control w-full max-w-md">
            <input
              type="text"
              class="input input-bordered"
              placeholder="Search models by name, number, or notes..."
              bind:value={searchQuery}
            />
          </div>
          {#if searchQuery}
            <button class="btn btn-ghost btn-sm" onclick={() => searchQuery = ''}>
              Clear
            </button>
          {/if}
        </div>

        {#if loading}
          <div class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        {:else if models.length === 0}
          <div class="text-center py-8 text-base-content/50">
            No models found. Create one to get started.
          </div>
        {:else if filteredModels.length === 0}
          <div class="text-center py-8 text-base-content/50">
            No models match your search.
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Model Number</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredModels as model}
                  <tr class="hover cursor-pointer" onclick={() => viewDetail(model)}>
                    <td class="font-medium">{model.name}</td>
                    <td>{model.model_number || '-'}</td>
                    <td class="max-w-xs truncate">{model.notes || '-'}</td>
                    <td><StatusBadge status={model.status} /></td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick={(e) => openEditModal(model, e)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div class="text-sm text-base-content/50 mt-2">
            Showing {filteredModels.length} of {models.length} models
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <AliasList />
  {/if}
</div>

<Modal open={showModal} title={editingModel ? 'Edit Model' : 'Add Model'} onclose={closeModal}>
  <form onsubmit={handleSubmit}>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Name *</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.name}
        placeholder="Enter model name"
        maxlength="100"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Model Number</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.model_number}
        placeholder="Enter model number (optional)"
        maxlength="100"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Notes</span>
      </label>
      <textarea
        class="textarea textarea-bordered"
        bind:value={formData.notes}
        placeholder="Enter notes (optional)"
        rows="3"
      ></textarea>
    </div>

    {#if editingModel}
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
        {editingModel ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
</Modal>

<Modal open={showBulkModal} title="Bulk Import Models" onclose={closeBulkModal}>
  <div class="space-y-4">
    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-semibold">Format: one model per line</p>
        <p class="text-sm">model_name,model_number,notes</p>
        <p class="text-xs mt-1 opacity-70">Only model_name is required. Model number and notes are optional.</p>
      </div>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Models (one per line)</span>
      </label>
      <textarea
        class="textarea textarea-bordered font-mono text-sm"
        bind:value={bulkImport.bulkText}
        placeholder="iPhone 15,A3090,Latest model
iPhone 14,A2882
Galaxy S24,SM-S921"
        rows="8"
      ></textarea>
    </div>

    {#if bulkImport.bulkParsed.length > 0}
      <div class="bg-base-200 rounded-lg p-3">
        <p class="font-semibold mb-2">Preview ({bulkImport.bulkParsed.filter(m => m.valid).length} valid):</p>
        <div class="max-h-40 overflow-auto">
          <table class="table table-xs">
            <thead>
              <tr>
                <th>Name</th>
                <th>Model #</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {#each bulkImport.bulkParsed as item}
                <tr class:text-error={!item.valid} class:opacity-50={!item.valid}>
                  <td>{item.name || '(empty)'}</td>
                  <td>{item.model_number || '-'}</td>
                  <td class="max-w-xs truncate">{item.notes || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeBulkModal}>Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        disabled={bulkImport.saving || bulkImport.bulkParsed.filter(m => m.valid).length === 0}
        onclick={handleBulkSubmit}
      >
        {#if bulkImport.saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Import {bulkImport.bulkParsed.filter(m => m.valid).length} Model(s)
      </button>
    </div>
  </div>
</Modal>

<!-- Single item duplicate confirmation -->
<ConfirmDialog
  open={showSingleDuplicateConfirm}
  title="Similar Model Found"
  message="A model with a similar name already exists: {singleSimilarItems.map(s => s.name + (s.model_number ? ` (${s.model_number})` : '')).join(', ')}. Do you still want to create '{formData.name}'?"
  confirmText="Create Anyway"
  cancelText="Cancel"
  confirmClass="btn-warning"
  onconfirm={confirmSingleDuplicate}
  oncancel={() => showSingleDuplicateConfirm = false}
/>

<!-- Bulk import duplicate confirmation -->
<ConfirmDialog
  open={bulkImport.showDuplicateConfirm}
  title="Similar Model Found"
  message="A model with a similar name already exists: {bulkImport.similarItems.map(s => s.name + (s.model_number ? ` (${s.model_number})` : '')).join(', ')}. Do you still want to create '{bulkImport.pendingBulkItem?.name}'?"
  confirmText="Create Anyway"
  cancelText="Skip"
  confirmClass="btn-warning"
  onconfirm={bulkImport.confirmDuplicate}
  oncancel={bulkImport.skipDuplicate}
/>
