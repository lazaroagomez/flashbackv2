<script>
  /**
   * Pagination Component
   * Reusable pagination UI with DaisyUI styling
   */
  let {
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {}
  } = $props();
</script>

{#if totalPages > 1}
  <div class="join">
    <button
      class="join-item btn btn-sm"
      disabled={currentPage === 1}
      onclick={() => onPageChange(1)}
    >
      &laquo;
    </button>
    <button
      class="join-item btn btn-sm"
      disabled={currentPage === 1}
      onclick={() => onPageChange(currentPage - 1)}
    >
      &lsaquo;
    </button>
    <button class="join-item btn btn-sm btn-disabled">
      Page {currentPage} of {totalPages}
    </button>
    <button
      class="join-item btn btn-sm"
      disabled={currentPage === totalPages}
      onclick={() => onPageChange(currentPage + 1)}
    >
      &rsaquo;
    </button>
    <button
      class="join-item btn btn-sm"
      disabled={currentPage === totalPages}
      onclick={() => onPageChange(totalPages)}
    >
      &raquo;
    </button>
  </div>
{/if}
