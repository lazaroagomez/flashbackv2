<script>
  let { term, found = true, onRemove } = $props();
</script>

<span
  class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium transition-colors"
  class:bg-success={found}
  class:text-success-content={found}
  class:bg-error={!found}
  class:text-error-content={!found}
  class:bg-opacity-20={true}
>
  <span class="font-mono">{term}</span>
  <button
    type="button"
    class="ml-1 hover:bg-base-content/20 rounded-full p-0.5 transition-colors"
    onclick={() => onRemove?.(term)}
    aria-label="Remove {term}"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</span>
