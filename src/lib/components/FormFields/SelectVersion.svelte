<script>
  import { api } from '../../api.js';
  import { showError } from '../../stores/toast.svelte.js';
  import SearchableSelect from '../SearchableSelect.svelte';

  let {
    value = $bindable(null),
    usbTypeId = null,
    modelId = null,
    disabled = false,
    required = false,
    onchange
  } = $props();

  let versions = $state([]);
  let loading = $state(false);

  async function loadVersions() {
    if (!usbTypeId) {
      versions = [];
      return;
    }
    loading = true;
    try {
      // Pass modelId as 'null' string if null, to filter for general versions
      // Only show active versions in dropdowns
      versions = await api.getVersions(usbTypeId, modelId === null ? 'null' : modelId, true);
    } catch (e) {
      console.error('Failed to load versions:', e);
      showError('Failed to load versions');
    } finally {
      loading = false;
    }
  }

  // Custom display function for versions
  function displayVersion(version) {
    let text = version.version_code;
    if (version.is_current) text += ' (current)';
    if (version.is_legacy_valid) text += ' (legacy)';
    return text;
  }

  $effect(() => {
    loadVersions();
  });

  // Reset value when dependencies change
  $effect(() => {
    if (usbTypeId !== undefined || modelId !== undefined) {
      value = null;
    }
  });
</script>

<SearchableSelect
  bind:value
  options={versions}
  label="Version"
  placeholder="Search versions..."
  displayFn={displayVersion}
  {loading}
  disabled={disabled || !usbTypeId}
  {required}
  {onchange}
/>
