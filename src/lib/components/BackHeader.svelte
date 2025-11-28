<script>
  /**
   * BackHeader Component
   * Reusable back button with title header
   */
  let {
    title = '',
    onBack = () => {}
  } = $props();
</script>

<div class="flex items-center gap-4 mb-4">
  <button class="btn btn-ghost btn-sm" onclick={onBack}>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back
  </button>
  <h1 class="text-2xl font-bold">{title}</h1>
</div>
