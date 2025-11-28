<script>
  import Modal from './Modal.svelte';

  let { open = $bindable(false) } = $props();

  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['/', 'Ctrl+K'], action: 'Focus scanner input' },
      { keys: ['Escape'], action: 'Clear input / Close modal / Clear selection' },
      { keys: ['?'], action: 'Show this help dialog' },
    ]},
    { category: 'Selection', items: [
      { keys: ['Ctrl+A'], action: 'Select all visible drives' },
      { keys: ['Ctrl+Shift+A'], action: 'Clear selection' },
      { keys: ['Space'], action: 'Toggle row selection (when focused)' },
    ]},
    { category: 'Scanner Input', items: [
      { keys: ['Enter'], action: 'Add search term as chip' },
      { keys: ['Backspace'], action: 'Remove last chip (when input empty)' },
    ]},
    { category: 'Bulk Actions', items: [
      { keys: ['Ctrl+E'], action: 'Bulk edit selected drives' },
      { keys: ['Ctrl+P'], action: 'Print stickers for selected drives' },
    ]},
  ];
</script>

<Modal bind:open title="Keyboard Shortcuts">
  <div class="space-y-6">
    {#each shortcuts as section}
      <div>
        <h3 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-3">
          {section.category}
        </h3>
        <div class="space-y-2">
          {#each section.items as shortcut}
            <div class="flex items-center justify-between py-1">
              <span class="text-base-content">{shortcut.action}</span>
              <div class="flex gap-1">
                {#each shortcut.keys as key, i}
                  {#if i > 0}
                    <span class="text-base-content/40">or</span>
                  {/if}
                  <kbd class="kbd kbd-sm">{key}</kbd>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}

    <div class="pt-4 border-t border-base-300">
      <p class="text-sm text-base-content/60">
        Press <kbd class="kbd kbd-xs">?</kbd> anytime to show this dialog
      </p>
    </div>
  </div>
</Modal>
