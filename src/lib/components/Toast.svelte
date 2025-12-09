<script>
  import { toasts, removeToast } from '../stores/toast.svelte.js';
</script>

<div class="toast toast-end toast-top z-50">
  {#each toasts as toast (toast.id)}
    <div
      class="alert shadow-lg"
      class:alert-success={toast.type === 'success'}
      class:alert-error={toast.type === 'error'}
      class:alert-warning={toast.type === 'warning'}
      class:alert-info={toast.type === 'info'}
    >
      <span>{toast.message}</span>
      <button class="btn btn-ghost btn-xs" onclick={() => removeToast(toast.id)} aria-label="Dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
