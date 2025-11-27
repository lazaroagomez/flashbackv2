<script>
  import { api } from '../../lib/api.js';
  import { showSuccess, showError } from '../../lib/stores/toast.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  let { navigate } = $props();

  const techStatusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' }
  ];

  let technicians = $state([]);
  let loading = $state(true);
  let showModal = $state(false);
  let showBulkModal = $state(false);
  let editingTechnician = $state(null);
  let formData = $state({ name: '', notes: '', status: 'active' });
  let bulkText = $state('');
  let bulkParsed = $state([]);
  let saving = $state(false);

  async function loadTechnicians() {
    loading = true;
    try {
      technicians = await api.getTechnicians(false);
    } catch (e) {
      showError('Failed to load technicians');
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingTechnician = null;
    formData = { name: '', notes: '', status: 'active' };
    showModal = true;
  }

  function openEditModal(tech, e) {
    e.stopPropagation();
    editingTechnician = tech;
    formData = {
      name: tech.name,
      notes: tech.notes || '',
      status: tech.status
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingTechnician = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }

    saving = true;
    try {
      if (editingTechnician) {
        await api.updateTechnician(editingTechnician.id, formData);
        showSuccess('Technician updated');
      } else {
        await api.createTechnician(formData);
        showSuccess('Technician created');
      }
      closeModal();
      loadTechnicians();
    } catch (e) {
      showError(e.message || 'Failed to save technician');
    } finally {
      saving = false;
    }
  }

  function viewDetail(tech) {
    navigate('technician-detail', { id: tech.id });
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
        notes: parts[1] || '',
        valid: !!parts[0]
      };
    });
  }

  async function handleBulkSubmit() {
    const validTechs = bulkParsed.filter(t => t.valid);
    if (validTechs.length === 0) {
      showError('No valid technicians to import');
      return;
    }

    saving = true;
    let created = 0;
    let failed = 0;

    for (const tech of validTechs) {
      try {
        await api.createTechnician({
          name: tech.name,
          notes: tech.notes,
          status: 'active'
        });
        created++;
      } catch (e) {
        failed++;
      }
    }

    saving = false;
    if (created > 0) {
      showSuccess(`Created ${created} technician(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      closeBulkModal();
      loadTechnicians();
    } else {
      showError('Failed to create any technicians');
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
    loadTechnicians();
  });
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Technicians</h1>
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Technician
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        <li><button onclick={openCreateModal}>Single Technician</button></li>
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
      {:else if technicians.length === 0}
        <div class="text-center py-8 text-base-content/50">
          No technicians found. Create one to get started.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each technicians as tech}
                <tr class="hover cursor-pointer" onclick={() => viewDetail(tech)}>
                  <td class="font-medium">{tech.name}</td>
                  <td class="max-w-xs truncate">{tech.notes || '-'}</td>
                  <td><StatusBadge status={tech.status} /></td>
                  <td>{new Date(tech.created_at).toLocaleDateString()}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick={(e) => openEditModal(tech, e)}>
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

<Modal open={showModal} title={editingTechnician ? 'Edit Technician' : 'Add Technician'} onclose={closeModal}>
  <form onsubmit={handleSubmit}>
    <div class="form-control">
      <label class="label">
        <span class="label-text">Name *</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.name}
        placeholder="Enter technician name"
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

    {#if editingTechnician}
      <div class="mt-4">
        <SearchableSelect
          bind:value={formData.status}
          options={techStatusOptions}
          valueField="id"
          label="Status"
          placeholder="Search status..."
        />
        <p class="text-xs text-base-content/50 mt-1 ml-1">Inactive technicians are hidden from assignment dropdowns</p>
      </div>
    {/if}

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeModal}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        {editingTechnician ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
</Modal>

<Modal open={showBulkModal} title="Bulk Import Technicians" onclose={closeBulkModal}>
  <div class="space-y-4">
    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-semibold">Format: one technician per line</p>
        <p class="text-sm">name,notes</p>
        <p class="text-xs mt-1 opacity-70">Only name is required. Notes are optional.</p>
      </div>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Technicians (one per line)</span>
      </label>
      <textarea
        class="textarea textarea-bordered font-mono text-sm"
        bind:value={bulkText}
        placeholder="John Smith,Senior technician
Jane Doe,New hire
Bob Wilson"
        rows="8"
      ></textarea>
    </div>

    {#if bulkParsed.length > 0}
      <div class="bg-base-200 rounded-lg p-3">
        <p class="font-semibold mb-2">Preview ({bulkParsed.filter(t => t.valid).length} valid):</p>
        <div class="max-h-40 overflow-auto">
          <table class="table table-xs">
            <thead>
              <tr>
                <th>Name</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {#each bulkParsed as item}
                <tr class:text-error={!item.valid} class:opacity-50={!item.valid}>
                  <td>{item.name || '(empty)'}</td>
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
        disabled={saving || bulkParsed.filter(t => t.valid).length === 0}
        onclick={handleBulkSubmit}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Import {bulkParsed.filter(t => t.valid).length} Technician(s)
      </button>
    </div>
  </div>
</Modal>
