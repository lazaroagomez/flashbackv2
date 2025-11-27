<script>
  let { value = $bindable(''), placeholder = 'Search...', oninput } = $props();

  function handleInput(e) {
    value = e.target.value;
    oninput?.(value);
  }

  function clear() {
    value = '';
    oninput?.('');
  }
</script>

<div class="relative w-full">
  <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-base-content/50">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </span>
  <input
    type="text"
    {placeholder}
    class="input input-bordered w-full pl-10 pr-10"
    {value}
    oninput={handleInput}
  />
  {#if value}
    <button
      class="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/50 hover:text-base-content"
      onclick={clear}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  {/if}
</div>
