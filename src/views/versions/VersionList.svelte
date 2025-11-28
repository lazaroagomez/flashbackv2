<script>
  import { api } from '../../lib/api.js';
  import { session } from '../../lib/stores/session.svelte.js';
  import { showSuccess, showError, showWarning } from '../../lib/stores/toast.svelte.js';
  import Modal from '../../lib/components/Modal.svelte';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';
  import SearchableSelect from '../../lib/components/SearchableSelect.svelte';

  // Data
  let versions = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let loading = $state(true);

  // Step navigation
  let currentStep = $state(1);
  let selectedUsbType = $state(null);
  let selectedModel = $state(null);
  let modelSearch = $state('');

  // Modal states
  let showModal = $state(false);
  let showBulkModal = $state(false);
  let showConfirm = $state(false);
  let showDuplicateConfirm = $state(false);
  let editingVersion = $state(null);
  let settingCurrentId = $state(null);
  let similarItems = $state([]);
  let formData = $state({
    usb_type_id: null,
    model_id: null,
    version_code: '',
    is_current: false,
    is_legacy_valid: false,
    official_link: '',
    internal_link: '',
    comments: ''
  });
  let saving = $state(false);

  // Bulk import state
  let bulkText = $state('');
  let bulkParsed = $state([]);

  // Group USB types by platform
  const usbTypesByPlatform = $derived.by(() => {
    const grouped = {};
    for (const type of usbTypes) {
      if (type.status !== 'active') continue;
      const platform = type.platform_name || 'Other';
      if (!grouped[platform]) {
        grouped[platform] = [];
      }
      grouped[platform].push(type);
    }
    return grouped;
  });

  // Get version counts per USB type
  const versionCountsByType = $derived.by(() => {
    const counts = {};
    for (const v of versions) {
      const key = v.usb_type_id;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  });

  // Get models for selected USB type (only if requires_model)
  const modelsForType = $derived.by(() => {
    if (!selectedUsbType?.requires_model) return [];
    // Include all active models (some might not have versions yet)
    return models.filter(m => m.status === 'active');
  });

  // Filter models by search
  const filteredModels = $derived.by(() => {
    if (!modelSearch.trim()) return modelsForType;
    const search = modelSearch.toLowerCase();
    return modelsForType.filter(m =>
      m.name.toLowerCase().includes(search) ||
      (m.model_number && m.model_number.toLowerCase().includes(search))
    );
  });

  // Get version counts per model for selected USB type
  const versionCountsByModel = $derived.by(() => {
    if (!selectedUsbType) return {};
    const counts = {};
    for (const v of versions) {
      if (v.usb_type_id !== selectedUsbType.id) continue;
      const key = v.model_id || 'no-model';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  });

  // Get filtered versions for current selection
  const filteredVersions = $derived.by(() => {
    if (!selectedUsbType) return [];
    return versions.filter(v => {
      if (v.usb_type_id !== selectedUsbType.id) return false;
      if (selectedUsbType.requires_model && selectedModel) {
        return v.model_id === selectedModel.id;
      }
      return true;
    });
  });

  async function loadData() {
    loading = true;
    try {
      [versions, usbTypes, models] = await Promise.all([
        api.getVersions(null, null),
        api.getUsbTypes(null, false),
        api.getModels(false)
      ]);
    } catch (e) {
      showError('Failed to load data');
    } finally {
      loading = false;
    }
  }

  function selectUsbType(type) {
    selectedUsbType = type;
    selectedModel = null;
    modelSearch = '';
    if (type.requires_model) {
      currentStep = 2;
    } else {
      currentStep = 3;
    }
  }

  function selectModel(model) {
    selectedModel = model;
    currentStep = 3;
  }

  function goBack() {
    if (currentStep === 3 && selectedUsbType?.requires_model) {
      currentStep = 2;
      selectedModel = null;
    } else {
      currentStep = 1;
      selectedUsbType = null;
      selectedModel = null;
    }
  }

  function resetSelection() {
    currentStep = 1;
    selectedUsbType = null;
    selectedModel = null;
    modelSearch = '';
  }

  function openCreateModal() {
    editingVersion = null;
    formData = {
      usb_type_id: selectedUsbType?.id || null,
      model_id: selectedModel?.id || null,
      version_code: '',
      is_current: false,
      is_legacy_valid: false,
      official_link: '',
      internal_link: '',
      comments: ''
    };
    showModal = true;
  }

  function openEditModal(version) {
    editingVersion = version;
    formData = {
      usb_type_id: version.usb_type_id,
      model_id: version.model_id,
      version_code: version.version_code,
      is_current: version.is_current,
      is_legacy_valid: version.is_legacy_valid,
      official_link: version.official_link || '',
      internal_link: version.internal_link || '',
      comments: version.comments || ''
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingVersion = null;
  }

  // Display function for USB types
  function displayUsbType(t) {
    return t.platform_name + ' - ' + t.name;
  }

  // Display function for models
  function displayModel(m) {
    return m.name + (m.model_number ? ` (${m.model_number})` : '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.version_code.trim()) {
      showError('Version code is required');
      return;
    }

    const usbTypeId = selectedUsbType?.id || formData.usb_type_id;
    const modelId = selectedUsbType?.requires_model ? (selectedModel?.id || formData.model_id) : null;

    // Check for duplicates only when creating
    if (!editingVersion) {
      const similar = await api.checkSimilarVersion(formData.version_code, usbTypeId, modelId);
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
      const data = {
        ...formData,
        usb_type_id: selectedUsbType?.id || formData.usb_type_id,
        model_id: selectedUsbType?.requires_model ? (selectedModel?.id || formData.model_id) : null
      };

      if (editingVersion) {
        await api.updateVersion(editingVersion.id, data);
        showSuccess('Version updated');
      } else {
        await api.createVersion(data);
        showSuccess('Version created');
      }
      closeModal();
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to save version');
    } finally {
      saving = false;
    }
  }

  function confirmDuplicate() {
    showDuplicateConfirm = false;
    doCreate();
  }

  function confirmSetCurrent(version) {
    settingCurrentId = version.id;
    showConfirm = true;
  }

  async function handleSetCurrent() {
    showConfirm = false;
    try {
      await api.setCurrentVersion(settingCurrentId, session.username);
      showSuccess('Version set as latest. USBs with outdated versions marked as pending.');
      loadData();
    } catch (e) {
      showError(e.message || 'Failed to set latest version');
    } finally {
      settingCurrentId = null;
    }
  }

  async function openLink(link) {
    if (link) {
      await api.openLink(link);
    }
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

  function parseBulkVersions() {
    const lines = bulkText.split('\n').filter(line => line.trim());
    bulkParsed = lines.map((line, index) => ({
      version_code: line.trim(),
      is_current: index === lines.length - 1,
      valid: !!line.trim()
    }));
  }

  async function handleBulkSubmit() {
    const validVersions = bulkParsed.filter(v => v.valid);
    if (validVersions.length === 0) {
      showError('No valid versions to import');
      return;
    }

    saving = true;
    let created = 0;
    let failed = 0;
    let lastCreatedId = null;

    for (let i = 0; i < validVersions.length; i++) {
      const v = validVersions[i];
      try {
        const result = await api.createVersion({
          usb_type_id: selectedUsbType.id,
          model_id: selectedUsbType?.requires_model ? selectedModel?.id : null,
          version_code: v.version_code,
          is_current: false,
          is_legacy_valid: false,
          official_link: '',
          internal_link: '',
          comments: ''
        });
        created++;
        if (i === validVersions.length - 1) {
          lastCreatedId = result.id;
        }
      } catch (e) {
        failed++;
      }
    }

    // Set the last one as current
    if (lastCreatedId) {
      try {
        await api.setCurrentVersion(lastCreatedId, session.username);
      } catch (e) {
        showWarning('Versions created but failed to set as latest');
      }
    }

    saving = false;
    if (created > 0) {
      showSuccess(`Created ${created} version(s)${failed > 0 ? `, ${failed} failed` : ''}. Last version set as latest.`);
      closeBulkModal();
      loadData();
    } else {
      showError('Failed to create any versions');
    }
  }

  // Parse bulk text when it changes
  $effect(() => {
    if (bulkText) {
      parseBulkVersions();
    } else {
      bulkParsed = [];
    }
  });

  $effect(() => {
    loadData();
  });
</script>

<div class="space-y-6">
  <!-- Header with steps indicator -->
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Versions</h1>

    <!-- Steps indicator -->
    <ul class="steps steps-horizontal">
      <li class="step" class:step-primary={currentStep >= 1}>USB Type</li>
      <li class="step" class:step-primary={currentStep >= 2}>Model</li>
      <li class="step" class:step-primary={currentStep >= 3}>Versions</li>
    </ul>
  </div>

  {#if loading}
    <div class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- Step 1: Select USB Type -->
    {#if currentStep === 1}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title text-lg">Select USB Type</h2>
          <p class="text-base-content/60 text-sm mb-4">Choose a USB type to view or manage its versions</p>

          {#each Object.entries(usbTypesByPlatform) as [platform, types]}
            <div class="mb-6">
              <h3 class="font-semibold text-base-content/70 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {platform}
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {#each types as type}
                  <button
                    class="card bg-base-200 hover:bg-primary hover:text-primary-content transition-colors cursor-pointer"
                    onclick={() => selectUsbType(type)}
                  >
                    <div class="card-body p-4">
                      <h4 class="font-semibold">{type.name}</h4>
                      <div class="flex justify-between items-center text-sm opacity-70">
                        <span>{versionCountsByType[type.id] || 0} versions</span>
                        {#if type.requires_model}
                          <span class="badge badge-ghost badge-sm">Models</span>
                        {/if}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/each}

          {#if Object.keys(usbTypesByPlatform).length === 0}
            <div class="text-center py-8 text-base-content/50">
              No USB types found. Create USB types first.
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Step 2: Select Model (if required) -->
    {#if currentStep === 2}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <!-- Back button and breadcrumb -->
          <div class="flex items-center gap-3 mb-4">
            <button class="btn btn-ghost btn-sm" onclick={goBack}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div class="text-sm breadcrumbs">
              <ul>
                <li><span class="opacity-60">USB Type</span></li>
                <li><span class="font-semibold">{selectedUsbType.platform_name} - {selectedUsbType.name}</span></li>
              </ul>
            </div>
          </div>

          <h2 class="card-title text-lg">Select Model</h2>
          <p class="text-base-content/60 text-sm mb-4">Choose a model to view its versions</p>

          <!-- Search bar -->
          <div class="form-control mb-4">
            <div class="relative w-full max-w-md">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-base-content/50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                class="input input-bordered w-full pl-10"
                placeholder="Search models..."
                bind:value={modelSearch}
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {#each filteredModels as model}
              <button
                class="card bg-base-200 hover:bg-primary hover:text-primary-content transition-colors cursor-pointer"
                onclick={() => selectModel(model)}
              >
                <div class="card-body p-4">
                  <h4 class="font-semibold">{model.name}</h4>
                  <div class="text-sm opacity-70">
                    {#if model.model_number}
                      <span class="block">{model.model_number}</span>
                    {/if}
                    <span>{versionCountsByModel[model.id] || 0} versions</span>
                  </div>
                </div>
              </button>
            {/each}
          </div>

          {#if filteredModels.length === 0}
            <div class="text-center py-8 text-base-content/50">
              {modelSearch ? 'No models match your search.' : 'No models found. Create models first.'}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Step 3: Versions Table -->
    {#if currentStep === 3}
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <!-- Back button and breadcrumb -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <button class="btn btn-ghost btn-sm" onclick={goBack}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div class="text-sm breadcrumbs">
                <ul>
                  <li><button class="link link-hover opacity-60" onclick={resetSelection}>USB Types</button></li>
                  <li>
                    {#if selectedUsbType?.requires_model}
                      <button class="link link-hover opacity-60" onclick={() => { currentStep = 2; selectedModel = null; }}>
                        {selectedUsbType.platform_name} - {selectedUsbType.name}
                      </button>
                    {:else}
                      <span class="font-semibold">{selectedUsbType.platform_name} - {selectedUsbType.name}</span>
                    {/if}
                  </li>
                  {#if selectedModel}
                    <li><span class="font-semibold">{selectedModel.name}</span></li>
                  {/if}
                </ul>
              </div>
            </div>

            <!-- Add button -->
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-primary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Version
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                <li><button onclick={openCreateModal}>Single Version</button></li>
                <li><button onclick={openBulkModal}>Bulk Import</button></li>
              </ul>
            </div>
          </div>

          <!-- Summary card -->
          <div class="stats bg-base-200 mb-4">
            <div class="stat py-3 px-4">
              <div class="stat-title text-xs">USB Type</div>
              <div class="stat-value text-lg">{selectedUsbType.name}</div>
              <div class="stat-desc">{selectedUsbType.platform_name}</div>
            </div>
            {#if selectedModel}
              <div class="stat py-3 px-4">
                <div class="stat-title text-xs">Model</div>
                <div class="stat-value text-lg">{selectedModel.name}</div>
                <div class="stat-desc">{selectedModel.model_number || '-'}</div>
              </div>
            {/if}
            <div class="stat py-3 px-4">
              <div class="stat-title text-xs">Versions</div>
              <div class="stat-value text-lg">{filteredVersions.length}</div>
              <div class="stat-desc">
                {filteredVersions.filter(v => v.is_current).length} latest
              </div>
            </div>
          </div>

          {#if filteredVersions.length === 0}
            <div class="text-center py-8 text-base-content/50">
              No versions found. Add one to get started.
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Version Code</th>
                    <th>Status</th>
                    <th>Links</th>
                    <th>Comments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each filteredVersions as version}
                    <tr class="hover">
                      <td class="font-medium font-mono">{version.version_code}</td>
                      <td>
                        <div class="flex gap-1">
                          {#if version.is_current}
                            <span class="badge badge-success badge-sm">Latest</span>
                          {/if}
                          {#if version.is_legacy_valid}
                            <span class="badge badge-info badge-sm">Legacy</span>
                          {/if}
                          {#if !version.is_current && !version.is_legacy_valid}
                            <span class="text-base-content/50">-</span>
                          {/if}
                        </div>
                      </td>
                      <td>
                        <div class="flex gap-1">
                          {#if version.official_link}
                            <button
                              class="btn btn-ghost btn-xs"
                              onclick={() => openLink(version.official_link)}
                              title="Official Link"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          {/if}
                          {#if version.internal_link}
                            <button
                              class="btn btn-ghost btn-xs"
                              onclick={() => openLink(version.internal_link)}
                              title="Internal Link"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </button>
                          {/if}
                          {#if !version.official_link && !version.internal_link}
                            <span class="text-base-content/50">-</span>
                          {/if}
                        </div>
                      </td>
                      <td class="max-w-xs truncate">{version.comments || '-'}</td>
                      <td>
                        <div class="flex gap-1">
                          <button class="btn btn-ghost btn-sm" onclick={() => openEditModal(version)}>
                            Edit
                          </button>
                          {#if !version.is_current}
                            <button
                              class="btn btn-outline btn-success btn-sm"
                              onclick={() => confirmSetCurrent(version)}
                            >
                              Set Latest
                            </button>
                          {/if}
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Single Version Modal -->
<Modal open={showModal} title={editingVersion ? 'Edit Version' : 'Add Version'} onclose={closeModal}>
  <form onsubmit={handleSubmit}>
    <!-- Show current selection info -->
    {#if selectedUsbType}
      <div class="alert mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <div class="font-semibold">{selectedUsbType.platform_name} - {selectedUsbType.name}</div>
          {#if selectedModel}
            <div class="text-sm opacity-70">{selectedModel.name}</div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="form-control">
      <label class="label">
        <span class="label-text">Version Code *</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.version_code}
        placeholder="e.g., v138, 1.2.3"
        maxlength="100"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label cursor-pointer justify-start gap-3">
        <input type="checkbox" class="checkbox" bind:checked={formData.is_current} />
        <span class="label-text">Mark as Latest Version</span>
      </label>
      {#if formData.is_current}
        <div class="alert alert-warning mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>This will mark USBs with older non-legacy versions as "Pending Update"</span>
        </div>
      {/if}
    </div>

    {#if selectedUsbType?.supports_legacy}
      <div class="form-control mt-4">
        <label class="label cursor-pointer justify-start gap-3">
          <input type="checkbox" class="checkbox" bind:checked={formData.is_legacy_valid} />
          <span class="label-text">Legacy Valid</span>
        </label>
        <label class="label">
          <span class="label-text-alt text-base-content/50">Legacy versions won't trigger pending update status</span>
        </label>
      </div>
    {/if}

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Official Link</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.official_link}
        placeholder="https:// or \\server\share"
        maxlength="500"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Internal Link</span>
      </label>
      <input
        type="text"
        class="input input-bordered"
        bind:value={formData.internal_link}
        placeholder="https:// or \\server\share"
        maxlength="500"
      />
    </div>

    <div class="form-control mt-4">
      <label class="label">
        <span class="label-text">Comments</span>
      </label>
      <textarea
        class="textarea textarea-bordered"
        bind:value={formData.comments}
        placeholder="Optional notes"
        rows="2"
      ></textarea>
    </div>

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeModal}>Cancel</button>
      <button type="submit" class="btn btn-primary" disabled={saving}>
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        {editingVersion ? 'Update' : 'Create'}
      </button>
    </div>
  </form>
</Modal>

<!-- Confirm Set Latest Dialog -->
<ConfirmDialog
  open={showConfirm}
  title="Set as Latest Version"
  message="Setting this as the latest version will mark all USB drives with older non-legacy versions as 'Pending Update'. Continue?"
  confirmText="Set Latest"
  confirmClass="btn-success"
  onconfirm={handleSetCurrent}
  oncancel={() => { showConfirm = false; settingCurrentId = null; }}
/>

<!-- Bulk Import Modal -->
<Modal open={showBulkModal} title="Bulk Import Versions" onclose={closeBulkModal}>
  <div class="space-y-4">
    <!-- Show current selection info -->
    <div class="alert">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <div class="font-semibold">{selectedUsbType?.platform_name} - {selectedUsbType?.name}</div>
        {#if selectedModel}
          <div class="text-sm opacity-70">{selectedModel.name}</div>
        {/if}
      </div>
    </div>

    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        <p class="font-semibold">Enter one version per line</p>
        <p class="text-sm">Versions will be created in order. The <strong>last version</strong> will be set as <strong>latest</strong>.</p>
      </div>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Versions (one per line)</span>
      </label>
      <textarea
        class="textarea textarea-bordered font-mono text-sm"
        bind:value={bulkText}
        placeholder="v123
v124
v125
v126
v127
v128"
        rows="8"
      ></textarea>
    </div>

    {#if bulkParsed.length > 0}
      <div class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>
          This will create {bulkParsed.filter(v => v.valid).length} version(s) and set
          <strong class="mx-1">{bulkParsed[bulkParsed.length - 1]?.version_code}</strong>
          as latest. USBs with older non-legacy versions will be marked as "Pending Update".
        </span>
      </div>

      <div class="bg-base-200 rounded-lg p-3">
        <p class="font-semibold mb-2">Preview:</p>
        <div class="flex flex-wrap gap-2">
          {#each bulkParsed as item}
            <span
              class="badge"
              class:badge-success={item.is_current}
              class:badge-outline={!item.is_current}
            >
              {item.version_code}
              {#if item.is_current}
                (latest)
              {/if}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="modal-action">
      <button type="button" class="btn" onclick={closeBulkModal}>Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        disabled={saving || bulkParsed.filter(v => v.valid).length === 0}
        onclick={handleBulkSubmit}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        Import {bulkParsed.filter(v => v.valid).length} Version(s)
      </button>
    </div>
  </div>
</Modal>

<ConfirmDialog
  open={showDuplicateConfirm}
  title="Similar Version Found"
  message="A version with a similar code already exists: {similarItems.map(s => s.version_code).join(', ')}. Do you still want to create '{formData.version_code}'?"
  confirmText="Create Anyway"
  confirmClass="btn-warning"
  onconfirm={confirmDuplicate}
  oncancel={() => showDuplicateConfirm = false}
/>
