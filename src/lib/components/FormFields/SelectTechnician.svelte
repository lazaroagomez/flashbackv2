<script>
  import { api } from '../../api.js';
  import SearchableSelect from '../SearchableSelect.svelte';

  let {
    value = $bindable(null),
    activeOnly = true,
    disabled = false,
    required = false,
    onchange
  } = $props();

  let technicians = $state([]);
  let loading = $state(true);

  async function loadTechnicians() {
    loading = true;
    try {
      technicians = await api.getTechnicians(activeOnly);
    } catch (e) {
      console.error('Failed to load technicians:', e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadTechnicians();
  });
</script>

<SearchableSelect
  bind:value
  options={technicians}
  label="Technician"
  placeholder="Search technicians..."
  {loading}
  {disabled}
  {required}
  {onchange}
/>
