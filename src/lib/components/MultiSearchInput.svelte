<script>
  import SearchChip from './SearchChip.svelte';
  import ScanFeedback from './ScanFeedback.svelte';

  let {
    chips = $bindable([]),
    chipStatuses = [],
    mode = 'select',
    placeholder = 'Scan or type USB IDs...',
    onAdd,
    onRemove,
    onClear,
    onModeToggle,
    scanFeedback = null
  } = $props();

  let inputValue = $state('');
  let inputRef = $state(null);

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const term = inputValue.trim().toUpperCase();
      if (term) {
        onAdd?.(term);
        inputValue = '';
      }
    } else if (event.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      const lastChip = chips[chips.length - 1];
      onRemove?.(lastChip);
    }
  }

  function getChipStatus(term) {
    const status = chipStatuses.find(s => s.term === term);
    return status?.found ?? true;
  }

  export function focus() {
    inputRef?.focus();
  }
</script>

<div class="relative">
  <div class="flex flex-col gap-2">
    <div class="relative">
      <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-base-content/50">
        {#if mode === 'select'}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        {/if}
      </span>
      <input
        bind:this={inputRef}
        bind:value={inputValue}
        type="text"
        {placeholder}
        class="scanner-input input input-bordered w-full pl-10 pr-24 text-lg"
        onkeydown={handleKeydown}
        autocomplete="off"
        spellcheck="false"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          onclick={() => onModeToggle?.()}
          title={mode === 'select' ? 'Mode: Auto-Select (click to change to Find)' : 'Mode: Find (click to change to Auto-Select)'}
        >
          {mode === 'select' ? 'Select' : 'Find'}
        </button>
      </div>
      <ScanFeedback status={scanFeedback?.status} message={scanFeedback?.message} />
    </div>

    {#if chips.length > 0}
      <div class="flex flex-wrap items-center gap-2 p-2 bg-base-200 rounded-lg">
        {#each chips as chip}
          <SearchChip
            term={chip}
            found={getChipStatus(chip)}
            onRemove={onRemove}
          />
        {/each}
        <div class="flex-1"></div>
        <span class="text-sm text-base-content/60">{chips.length} ID{chips.length !== 1 ? 's' : ''}</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          onclick={() => onClear?.()}
        >
          Clear All
        </button>
      </div>
    {/if}
  </div>
</div>
