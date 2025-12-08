<script>
  import { api } from '../../api.js';
  import { showError } from '../../stores/toast.svelte.js';
  import SearchableSelect from '../SearchableSelect.svelte';
  import ConfirmDialog from '../ConfirmDialog.svelte';

  let {
    // Two-way bound value object
    value = $bindable({
      platform_id: null,
      usb_type_id: null,
      alias_id: null,
      model_id: null,
      version_id: null
    }),

    // Mode: 'full' for complete cascade, 'version-only' for just version selector
    mode = 'full',

    // For version-only mode, pass existing USB data to determine context
    currentUsb = null,

    // Layout: 'vertical' or 'grid'
    layout = 'vertical',

    // Control
    disabled = false,

    // Callback when value changes - provides full entity data
    onchange = null
  } = $props();

  // Reference data
  let platforms = $state([]);
  let usbTypes = $state([]);
  let models = $state([]);
  let aliases = $state([]);
  let versions = $state([]);
  let loading = $state(false);

  // Selected entity data (full objects, not just IDs)
  let selectedType = $state(null);
  let selectedAlias = $state(null);

  // Alias-related state
  let aliasModels = $state([]);
  let showAliasPrompt = $state(false);
  let pendingModelAlias = $state(null);

  // Load initial reference data
  async function loadReferenceData() {
    if (mode !== 'full') return;

    loading = true;
    try {
      [platforms, models, aliases] = await Promise.all([
        api.getPlatforms(true),
        api.getModels(true),
        api.getAliases(true)
      ]);
    } catch (e) {
      showError('Failed to load reference data');
    } finally {
      loading = false;
    }
  }

  // Load USB types for selected platform
  async function loadUsbTypes() {
    if (!value.platform_id) {
      usbTypes = [];
      return;
    }
    try {
      usbTypes = await api.getUsbTypes(value.platform_id, true);
    } catch (e) {
      showError('Failed to load USB types');
    }
  }

  // Load versions based on current selection
  async function loadVersions() {
    const typeId = mode === 'full' ? value.usb_type_id : currentUsb?.usb_type_id;
    if (!typeId) {
      versions = [];
      return;
    }

    try {
      // Determine how to load versions based on selection
      const aliasId = selectedAlias?.id || null;
      const modelId = aliasId ? null : (value.model_id || (currentUsb?.model_id ?? 'null'));
      versions = await api.getVersions(typeId, modelId === null ? 'null' : modelId, true, aliasId);
    } catch (e) {
      showError('Failed to load versions');
    }
  }

  // Load models for selected alias
  async function loadAliasModels(aliasId) {
    if (!aliasId) {
      aliasModels = [];
      return;
    }
    try {
      aliasModels = await api.getAliasModels(aliasId);
    } catch (e) {
      showError('Failed to load alias models');
      aliasModels = [];
    }
  }

  // Cascade handlers
  function handlePlatformChange(val) {
    value.platform_id = val;
    value.usb_type_id = null;
    value.alias_id = null;
    value.model_id = null;
    value.version_id = null;
    selectedType = null;
    selectedAlias = null;
    aliasModels = [];
    loadUsbTypes();
    notifyChange();
  }

  function handleTypeChange(val) {
    value.usb_type_id = val;
    value.alias_id = null;
    value.model_id = null;
    value.version_id = null;
    selectedType = usbTypes.find(t => t.id === val) || null;
    selectedAlias = null;
    aliasModels = [];

    // Load versions if type doesn't require model or alias
    if (selectedType && !selectedType.requires_model && !selectedType.supports_aliases) {
      loadVersions();
    }
    notifyChange();
  }

  async function handleAliasChange(val) {
    const alias = aliases.find(a => a.id === val);
    selectedAlias = alias || null;
    value.alias_id = val || null;
    value.model_id = null;
    value.version_id = null;

    if (alias) {
      await loadAliasModels(alias.id);
      await loadVersions();
    } else {
      aliasModels = [];
      versions = [];
    }
    notifyChange();
  }

  async function handleModelChange(val) {
    value.model_id = val;
    value.version_id = null;

    // Check if model has an alias (prompt user to use alias instead)
    if (selectedType?.supports_aliases && val && !selectedAlias) {
      try {
        const modelAlias = await api.getModelAlias(val);
        if (modelAlias) {
          pendingModelAlias = modelAlias;
          showAliasPrompt = true;
          return;
        }
      } catch (e) {
        // No alias found, continue normally
      }
    }

    loadVersions();
    notifyChange();
  }

  function handleVersionChange(val) {
    value.version_id = val;
    notifyChange();
  }

  // Alias prompt handlers
  function confirmUseAlias() {
    showAliasPrompt = false;
    handleAliasChange(pendingModelAlias.id);
    pendingModelAlias = null;
  }

  function skipUseAlias() {
    showAliasPrompt = false;
    pendingModelAlias = null;
    loadVersions();
    notifyChange();
  }

  // Notify parent of changes with full entity data
  function notifyChange() {
    if (onchange) {
      onchange(value, {
        platform: platforms.find(p => p.id === value.platform_id) || null,
        usbType: selectedType,
        alias: selectedAlias,
        model: availableModels.find(m => m.id === value.model_id) || null,
        version: versions.find(v => v.id === value.version_id) || null
      });
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

  // Computed: available models based on alias selection
  const availableModels = $derived.by(() => {
    if (selectedAlias && aliasModels.length > 0) {
      return aliasModels;
    }
    return models;
  });

  // Computed: should show model selector
  const showModelSelector = $derived(
    mode === 'full' && selectedType && (selectedType.requires_model || selectedType.supports_aliases)
  );

  // Computed: should show alias selector
  const showAliasSelector = $derived(
    mode === 'full' && selectedType?.supports_aliases
  );

  // Computed: is model required
  const modelRequired = $derived(
    selectedType?.requires_model && !selectedAlias
  );

  // Computed: version selector should be disabled
  const versionDisabled = $derived.by(() => {
    if (mode === 'version-only') return disabled;
    if (!value.usb_type_id) return true;
    if (selectedType?.requires_model && !value.model_id && !selectedAlias) return true;
    if (selectedType?.supports_aliases && !selectedAlias && !value.model_id) return true;
    return disabled;
  });

  // Layout class
  const layoutClass = $derived(
    layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'
  );

  // Initialize
  $effect(() => {
    loadReferenceData();
  });

  // For version-only mode, load versions when currentUsb is provided
  $effect(() => {
    if (mode === 'version-only' && currentUsb) {
      loadVersions();
    }
  });
</script>

{#if mode === 'full'}
  <div class={layoutClass}>
    <div>
      <SearchableSelect
        bind:value={value.platform_id}
        options={platforms}
        label="Platform"
        placeholder="Search platforms..."
        required
        {disabled}
        onchange={handlePlatformChange}
      />
    </div>

    <div>
      <SearchableSelect
        bind:value={value.usb_type_id}
        options={usbTypes}
        label="USB Type"
        placeholder="Search USB types..."
        required
        disabled={disabled || !value.platform_id}
        onchange={handleTypeChange}
      />
    </div>

    {#if showAliasSelector}
      <div>
        <SearchableSelect
          value={selectedAlias?.id || null}
          options={aliases}
          label="Alias (optional)"
          placeholder="Search aliases..."
          {disabled}
          onchange={handleAliasChange}
        />
        <p class="text-xs text-base-content/50 mt-1 ml-1">
          Select an alias to use shared versions across multiple models
        </p>
      </div>
    {/if}

    {#if showModelSelector}
      <div>
        <SearchableSelect
          bind:value={value.model_id}
          options={availableModels}
          label={selectedAlias ? "Model (from alias)" : "Model"}
          placeholder="Search models..."
          displayFn={displayModel}
          required={modelRequired}
          {disabled}
          onchange={handleModelChange}
        />
        {#if selectedAlias}
          <p class="text-xs text-base-content/50 mt-1 ml-1">
            Showing {aliasModels.length} model(s) in "{selectedAlias.name}" alias
          </p>
        {/if}
      </div>
    {/if}

    <div>
      <SearchableSelect
        bind:value={value.version_id}
        options={versions}
        label="Version"
        placeholder="Search versions..."
        displayFn={displayVersion}
        required
        disabled={versionDisabled}
        onchange={handleVersionChange}
      />
      {#if selectedAlias && versions.length > 0}
        <p class="text-xs text-base-content/50 mt-1 ml-1">
          Showing versions for alias "{selectedAlias.name}"
        </p>
      {/if}
    </div>
  </div>

{:else if mode === 'version-only'}
  <SearchableSelect
    bind:value={value.version_id}
    options={versions}
    label="Version"
    placeholder="Search versions..."
    displayFn={displayVersion}
    {disabled}
    onchange={handleVersionChange}
  />
{/if}

<!-- Alias Prompt Dialog -->
<ConfirmDialog
  open={showAliasPrompt}
  title="Model Has an Alias"
  message="This model belongs to the '{pendingModelAlias?.name}' alias. Using the alias will allow you to select from shared versions that apply to all {pendingModelAlias?.model_count || 0} models in the group. Would you like to use the alias instead?"
  confirmText="Use Alias"
  cancelText="Keep Model"
  confirmClass="btn-primary"
  onconfirm={confirmUseAlias}
  oncancel={skipUseAlias}
/>
