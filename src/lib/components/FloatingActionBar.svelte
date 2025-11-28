<script>
  let {
    selectedCount = 0,
    onEdit,
    onPrint,
    onMarkUpdated,
    onClear
  } = $props();

  let showMoreMenu = $state(false);
</script>

{#if selectedCount > 0}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
    <div class="bg-base-100 shadow-xl rounded-xl border border-base-300 px-4 py-3 flex items-center gap-4">
      <span class="font-medium text-base-content">
        {selectedCount} selected
      </span>

      <div class="h-6 w-px bg-base-300"></div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-primary gap-1"
          onclick={() => onEdit?.()}
          title="Bulk Edit (Ctrl+E)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline gap-1"
          onclick={() => onPrint?.()}
          title="Print Stickers (Ctrl+P)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline btn-success gap-1"
          onclick={() => onMarkUpdated?.()}
          title="Mark as Updated"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Mark Updated
        </button>

        <div class="relative">
          <button
            type="button"
            class="btn btn-sm btn-ghost gap-1"
            onclick={() => showMoreMenu = !showMoreMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            More
          </button>

          {#if showMoreMenu}
            <div class="absolute bottom-full right-0 mb-2 w-48 bg-base-100 rounded-lg shadow-xl border border-base-300 py-1">
              <button
                type="button"
                class="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 text-error"
                onclick={() => { showMoreMenu = false; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mark as Lost
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div class="h-6 w-px bg-base-300"></div>

      <button
        type="button"
        class="btn btn-sm btn-ghost btn-circle"
        onclick={() => onClear?.()}
        title="Clear selection (Escape)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  .animate-slide-up {
    animation: slideUp 0.2s ease-out;
  }
</style>
