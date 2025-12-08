<script>
  import { api } from '../../api.js';
  import { showError } from '../../stores/toast.svelte.js';
  import SearchableSelect from '../SearchableSelect.svelte';

  let {
    value = $bindable(null),
    activeOnly = true,
    disabled = false,
    required = false,
    label = 'Alias',
    placeholder = 'Search aliases...',
    onchange
  } = $props();

  let aliases = $state([]);
  let loading = $state(true);

  async function loadAliases() {
    loading = true;
    try {
      aliases = await api.getAliasesWithCount(activeOnly);
    } catch (e) {
      console.error('Failed to load aliases:', e);
      showError('Failed to load aliases');
    } finally {
      loading = false;
    }
  }

  // Custom display function for aliases showing model count
  function displayAlias(alias) {
    const count = alias.model_count || 0;
    return `${alias.name} (${count} model${count !== 1 ? 's' : ''})`;
  }

  $effect(() => {
    loadAliases();
  });
</script>

<SearchableSelect
  bind:value
  options={aliases}
  {label}
  {placeholder}
  displayFn={displayAlias}
  {loading}
  {disabled}
  {required}
  {onchange}
/>
