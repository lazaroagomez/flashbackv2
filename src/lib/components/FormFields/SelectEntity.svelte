<script>
  import { showError } from '../../stores/toast.svelte.js';
  import SearchableSelect from '../SearchableSelect.svelte';

  /**
   * Generic entity select component that handles loading and displaying options
   *
   * @prop {any} value - Bound value (selected ID)
   * @prop {Function} loadFn - Async function to load options, receives (parentId, activeOnly)
   * @prop {string} label - Label for the select
   * @prop {string} placeholder - Placeholder text
   * @prop {any} parentId - Optional parent ID for dependent selects (null/undefined = no dependency)
   * @prop {boolean} activeOnly - Whether to filter by active status
   * @prop {boolean} disabled - Whether the select is disabled
   * @prop {boolean} required - Whether the field is required
   * @prop {Function} displayFn - Optional function to customize option display
   * @prop {Function} onchange - Optional change handler
   * @prop {string} valueField - Field to use for option value (default: 'id')
   * @prop {string} labelField - Field to use for option label (default: 'name')
   * @prop {boolean} resetOnParentChange - Whether to reset value when parent changes (default: true)
   * @prop {boolean} requireParent - Whether parent ID is required before loading (default: false)
   */
  let {
    value = $bindable(null),
    loadFn,
    label,
    placeholder = `Search ${label?.toLowerCase() || 'options'}...`,
    parentId = undefined,
    activeOnly = true,
    disabled = false,
    required = false,
    displayFn = undefined,
    onchange = undefined,
    valueField = 'id',
    labelField = 'name',
    resetOnParentChange = true,
    requireParent = false
  } = $props();

  let options = $state([]);
  let loading = $state(false);
  let lastParentId = $state(undefined);

  async function loadOptions() {
    // If parent is required but not provided, clear options
    if (requireParent && (parentId === null || parentId === undefined)) {
      options = [];
      return;
    }

    loading = true;
    try {
      // Call loadFn with appropriate arguments based on whether it's a dependent select
      if (parentId !== undefined) {
        options = await loadFn(parentId, activeOnly);
      } else {
        options = await loadFn(activeOnly);
      }
    } catch (e) {
      console.error(`Failed to load ${label}:`, e);
      showError(`Failed to load ${label?.toLowerCase() || 'options'}`);
      options = [];
    } finally {
      loading = false;
    }
  }

  function handleChange(newValue) {
    const selected = options.find(opt => opt[valueField] === newValue);
    onchange?.(newValue, selected);
  }

  // Load options when component mounts or when parentId/activeOnly changes
  $effect(() => {
    loadOptions();
  });

  // Reset value when parent changes (for cascading selects)
  $effect(() => {
    if (resetOnParentChange && parentId !== undefined && parentId !== lastParentId) {
      if (lastParentId !== undefined) {
        // Only reset if this isn't the initial load
        value = null;
      }
      lastParentId = parentId;
    }
  });

  // Compute disabled state
  const isDisabled = $derived(disabled || (requireParent && (parentId === null || parentId === undefined)));
</script>

<SearchableSelect
  bind:value
  {options}
  {label}
  {placeholder}
  {loading}
  disabled={isDisabled}
  {required}
  {valueField}
  {labelField}
  displayFn={displayFn}
  onchange={handleChange}
/>
