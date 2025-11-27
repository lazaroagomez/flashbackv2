<script>
  import { api } from '../../api.js';
  import SearchableSelect from '../SearchableSelect.svelte';

  let {
    value = $bindable(null),
    platformId = null,
    activeOnly = true,
    disabled = false,
    required = false,
    onchange
  } = $props();

  let usbTypes = $state([]);
  let loading = $state(false);

  async function loadUsbTypes() {
    if (!platformId) {
      usbTypes = [];
      return;
    }
    loading = true;
    try {
      usbTypes = await api.getUsbTypes(platformId, activeOnly);
    } catch (e) {
      console.error('Failed to load USB types:', e);
    } finally {
      loading = false;
    }
  }

  function handleChange(newValue) {
    const selected = usbTypes.find(t => t.id === newValue);
    onchange?.(newValue, selected);
  }

  $effect(() => {
    loadUsbTypes();
  });

  // Reset value when platform changes
  $effect(() => {
    if (platformId !== undefined) {
      value = null;
    }
  });
</script>

<SearchableSelect
  bind:value
  options={usbTypes}
  label="USB Type"
  placeholder="Search USB types..."
  {loading}
  disabled={disabled || !platformId}
  {required}
  onchange={handleChange}
/>
