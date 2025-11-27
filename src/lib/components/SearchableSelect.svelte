<script>
  import { onMount } from 'svelte';

  let {
    value = $bindable(),
    options = [],
    labelField = 'name',
    valueField = 'id',
    placeholder = 'Search or select...',
    label = '',
    required = false,
    disabled = false,
    loading = false,
    onchange,
    displayFn = null
  } = $props();

  // Normalize undefined to null
  const normalizedValue = $derived(value === undefined ? null : value);

  let searchText = $state('');
  let isOpen = $state(false);
  let highlightedIndex = $state(-1);
  let inputRef = $state(null);
  let containerRef = $state(null);

  // Get display text for an option
  function getDisplayText(option) {
    if (displayFn) return displayFn(option);
    return option[labelField];
  }

  // Get the currently selected option
  const selectedOption = $derived(
    options.find(opt => opt[valueField] === normalizedValue) || null
  );

  // Filter options based on search text
  const filteredOptions = $derived(
    searchText.trim() === ''
      ? options
      : options.filter(opt =>
          getDisplayText(opt).toLowerCase().includes(searchText.toLowerCase())
        )
  );

  // Display text for the input
  const inputDisplayText = $derived(
    isOpen ? searchText : (selectedOption ? getDisplayText(selectedOption) : '')
  );

  function handleInputFocus() {
    isOpen = true;
    searchText = '';
    highlightedIndex = -1;
  }

  function handleInputChange(e) {
    searchText = e.target.value;
    isOpen = true;
    highlightedIndex = 0;
  }

  function selectOption(option) {
    const newValue = option ? option[valueField] : null;
    value = newValue;
    isOpen = false;
    searchText = '';
    inputRef?.blur();
    onchange?.(newValue);
  }

  function handleKeydown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        isOpen = true;
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        isOpen = false;
        searchText = '';
        inputRef?.blur();
        break;
    }
  }

  function clearSelection(e) {
    e.stopPropagation();
    e.preventDefault();
    selectOption(null);
  }

  function handleClickOutside(e) {
    if (containerRef && !containerRef.contains(e.target)) {
      isOpen = false;
      searchText = '';
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });
</script>

<div class="form-control w-full" bind:this={containerRef}>
  {#if label}
    <label class="label">
      <span class="label-text">{label} {required ? '*' : ''}</span>
    </label>
  {/if}

  <div class="relative">
    <div class="relative">
      <input
        bind:this={inputRef}
        type="text"
        class="input input-bordered w-full pr-16"
        class:input-disabled={disabled}
        {placeholder}
        value={inputDisplayText}
        onfocus={handleInputFocus}
        oninput={handleInputChange}
        onkeydown={handleKeydown}
        {disabled}
        autocomplete="off"
      />

      <div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
        {#if normalizedValue && !disabled}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            onclick={clearSelection}
            tabindex="-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle"
          onclick={() => { inputRef?.focus(); }}
          tabindex="-1"
          {disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" class:rotate-180={isOpen} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    {#if isOpen && !disabled}
      <div
        class="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        {#if loading}
          <div class="p-3 text-center text-base-content/50">
            <span class="loading loading-spinner loading-sm"></span>
            <span class="ml-2">Loading...</span>
          </div>
        {:else if filteredOptions.length === 0}
          <div class="p-3 text-center text-base-content/50">
            {searchText ? 'No matches found' : 'No options available'}
          </div>
        {:else}
          {#each filteredOptions as option, index}
            <button
              type="button"
              class="w-full px-3 py-2 text-left hover:bg-base-200 flex items-center gap-2"
              class:bg-base-200={highlightedIndex === index}
              class:bg-primary={option[valueField] === normalizedValue}
              class:text-primary-content={option[valueField] === normalizedValue}
              onmouseenter={() => highlightedIndex = index}
              onclick={() => selectOption(option)}
            >
              {#if option[valueField] === normalizedValue}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              {:else}
                <span class="w-4"></span>
              {/if}
              <span class="truncate">{getDisplayText(option)}</span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>
