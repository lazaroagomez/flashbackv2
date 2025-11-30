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

  let models = $state([]);
  let loading = $state(true);

  async function loadModels() {
    loading = true;
    try {
      models = await api.getModels(activeOnly);
    } catch (e) {
      console.error('Failed to load models:', e);
      showError('Failed to load models');
    } finally {
      loading = false;
    }
  }

  // Custom display function for models
  function displayModel(model) {
    return model.name + (model.model_number ? ` (${model.model_number})` : '');
  }

  $effect(() => {
    loadModels();
  });
</script>

<SearchableSelect
  bind:value
  options={models}
  label="Model"
  placeholder="Search models..."
  displayFn={displayModel}
  {loading}
  {disabled}
  {required}
  {onchange}
/>
