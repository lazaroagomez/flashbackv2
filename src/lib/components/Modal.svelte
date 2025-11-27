<script>
  let { open = false, title = '', children, onclose } = $props();
</script>

<dialog class="modal" class:modal-open={open}>
  <div class="modal-box">
    {#if title}
      <h3 class="font-bold text-lg">{title}</h3>
    {/if}
    <button
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      onclick={onclose}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <div class="py-4">
      {@render children()}
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button onclick={onclose}>close</button>
  </form>
</dialog>
