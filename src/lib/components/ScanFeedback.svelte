<script>
  let { status = null, message = '' } = $props();

  const statusConfig = {
    success: {
      bgClass: 'bg-success',
      textClass: 'text-success-content',
      icon: 'M5 13l4 4L19 7'
    },
    notfound: {
      bgClass: 'bg-error',
      textClass: 'text-error-content',
      icon: 'M6 18L18 6M6 6l12 12'
    },
    duplicate: {
      bgClass: 'bg-warning',
      textClass: 'text-warning-content',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    }
  };

  const config = $derived(status ? statusConfig[status] : null);
</script>

{#if status && config}
  <div
    class="absolute top-full left-0 mt-2 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50 {config.bgClass} {config.textClass}"
    role="status"
    aria-live="polite"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={config.icon} />
    </svg>
    <span class="text-sm font-medium">{message}</span>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
</style>
