<script>
  import { api } from '../../api.js';
  import { showError } from '../../stores/toast.svelte.js';
  import SearchableSelect from '../SearchableSelect.svelte';

  let {
    value = $bindable(null),
    activeOnly = true,
    disabled = false,
    required = false,
    onchange
  } = $props();

  let platforms = $state([]);
  let loading = $state(true);

  async function loadPlatforms() {
    loading = true;
    try {
      platforms = await api.getPlatforms(activeOnly);
    } catch (e) {
      console.error('Failed to load platforms:', e);
      showError('Failed to load platforms');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadPlatforms();
  });
</script>

<SearchableSelect
  bind:value
  options={platforms}
  label="Platform"
  placeholder="Search platforms..."
  {loading}
  {disabled}
  {required}
  {onchange}
/>
