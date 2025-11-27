<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  let { navigate } = $props();

  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' }
  ];

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
  let bulkText = $state('');
  let saving = $state(false);
  let bulkParsed = $state([]);

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

  function viewDetail(model) {
    navigate('model-detail', { id: model.id });
  }

  function openBulkModal() {
    bulkText = '';
    bulkParsed = [];
    showBulkModal = true;
  }

  function closeBulkModal() {
    showBulkModal = false;
    bulkText = '';
    bulkParsed = [];
  }

  function parseBulkText() {
    const lines = bulkText.split('\n').filter(line => line.trim());
    bulkParsed = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        name: parts[0] || '',
        model_number: parts[1] || '',
        notes: parts[2] || '',
        valid: !!parts[0]
      };
    });
  }

  async function handleBulkSubmit() {
    const validModels = bulkParsed.filter(m => m.valid);
    if (validModels.length === 0) {
      showError('No valid models to import');
      return;
    }

    saving = true;
    let created = 0;
    let failed = 0;

    for (const model of validModels) {
      try {
        await api.createModel({
          name: model.name,
          model_number: model.model_number,
          notes: model.notes,
          status: 'active'
        });
        created++;
      } catch (e) {
        failed++;
      }
    }

    saving = false;
    if (created > 0) {
      showSuccess(`Created ${created} model(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      closeBulkModal();
      loadModels();
    } else {
      showError('Failed to create any models');
    }
  }

  // Parse bulk text when it changes
  $effect(() => {
    if (bulkText) {
      parseBulkText();
    } else {
      bulkParsed = [];
    }
  });

  $effect(() => {
    loadModels();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Models</h1>
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
  </div>

  <div class="card bg-base-100 shadow">
    <div class="card-body">
      {#if loading}
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {:else if models.length === 0}
        <div class="text-center py-8 text-base-content/50">
          No models found. Create one to get started.
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
              {#each models as model}
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
      {/if}
    </div>
  </div>
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
        bind:value={bulkText}
        placeholder="iPhone 15,A3090,Latest model
iPhone 14,A2882
Galaxy S24,SM-S921"
        rows="8"
      ></textarea>
    </div>

    {#if bulkParsed.length > 0}
      <div class="bg-base-200 rounded-lg p-3">
        <p class="font-semibold mb-2">Preview ({bulkParsed.filter(m => m.valid).length} valid):</p>
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
              {#each bulkParsed as item}
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
        disabled={saving || bulkParsed.filter(m => m.valid).length === 0}
        onclick={handleBulkSubmit}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Import {bulkParsed.filter(m => m.valid).length} Model(s)
      </button>
    </div>
  </div>
</Modal>
