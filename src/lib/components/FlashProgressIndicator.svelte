<script>
  import { flashingState, getOverallProgress, resetFlashing } from '../stores/flashing.svelte.js';
  import { api } from '../api.js';
  import { showWarning, showError } from '../stores/toast.svelte.js';

  let { navigate } = $props();

  let expanded = $state(false);

  const overallProgress = $derived(getOverallProgress());

  const activeDeviceCount = $derived(
    Object.values(flashingState.deviceProgress).filter(
      dp => dp.type !== 'finished' && dp.type !== 'failed'
    ).length
  );

  const completedCount = $derived(
    Object.values(flashingState.deviceProgress).filter(
      dp => dp.type === 'finished' || dp.percentage >= 100
    ).length
  );

  const failedCount = $derived(
    Object.values(flashingState.deviceProgress).filter(
      dp => dp.type === 'failed'
    ).length
  );

  function getPhaseLabel(type) {
    const labels = {
      'starting': 'Starting...',
      'decompressing': 'Decompressing...',
      'flashing': 'Writing...',
      'verifying': 'Verifying...',
      'finished': 'Complete',
      'failed': 'Failed'
    };
    return labels[type] || type || 'Processing...';
  }

  function formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '--';
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps.toFixed(1)} MB/s`;
  }

  function formatEta(seconds) {
    if (!seconds || seconds === 0 || seconds === Infinity) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function handleCancel() {
    try {
      await api.cancelFlash();
      showWarning('Flash operation cancelled');
      resetFlashing();
    } catch (e) {
      showError(`Cancel failed: ${e.message}`);
    }
  }

  function goToFlashing() {
    navigate('flashing');
  }

  const isComplete = $derived(
    flashingState.devices.length > 0 &&
    flashingState.devices.every(d => {
      const dp = flashingState.deviceProgress[d.diskIndex];
      return dp?.type === 'finished' || dp?.percentage >= 100;
    })
  );
</script>

{#if flashingState.isFlashing}
  <div class="fixed bottom-4 right-4 z-50 w-80">
    <div class="card bg-base-100 shadow-2xl border border-base-300">
      <!-- Compact Header (always visible) -->
      <div
        class="card-body p-3 cursor-pointer"
        onclick={() => expanded = !expanded}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && (expanded = !expanded)}
      >
        <div class="flex items-center gap-3">
          <!-- Spinner / Status icon -->
          <div class="flex-shrink-0">
            {#if isComplete}
              <div class="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            {:else}
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span class="loading loading-spinner loading-sm text-primary"></span>
              </div>
            {/if}
          </div>

          <!-- Status text -->
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate">
              {#if isComplete}
                Flash Complete
              {:else}
                Flashing {flashingState.devices.length} device{flashingState.devices.length !== 1 ? 's' : ''}
              {/if}
            </div>
            <div class="text-xs text-base-content/60">
              {flashingState.imageInfo?.name || 'Image'}
            </div>
          </div>

          <!-- Progress percentage -->
          <div class="flex-shrink-0 text-right">
            <div class="text-lg font-bold font-mono" class:text-success={isComplete}>
              {overallProgress}%
            </div>
          </div>

          <!-- Expand/collapse indicator -->
          <div class="flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 transition-transform"
              class:rotate-180={expanded}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </div>

        <!-- Progress bar -->
        <progress
          class="progress w-full h-2 mt-2"
          class:progress-primary={!isComplete}
          class:progress-success={isComplete}
          value={overallProgress}
          max="100"
        ></progress>
      </div>

      <!-- Expanded details -->
      {#if expanded}
        <div class="border-t border-base-300 p-3 space-y-3">
          <!-- Device status summary -->
          <div class="flex gap-2 text-xs">
            {#if completedCount > 0}
              <span class="badge badge-success badge-sm gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {completedCount} done
              </span>
            {/if}
            {#if activeDeviceCount > 0}
              <span class="badge badge-primary badge-sm gap-1">
                <span class="loading loading-spinner loading-xs"></span>
                {activeDeviceCount} active
              </span>
            {/if}
            {#if failedCount > 0}
              <span class="badge badge-error badge-sm gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {failedCount} failed
              </span>
            {/if}
          </div>

          <!-- Per-device mini progress -->
          <div class="space-y-2 max-h-40 overflow-y-auto">
            {#each flashingState.devices as device (device.diskIndex)}
              {@const dp = flashingState.deviceProgress[device.diskIndex] || { type: 'starting', percentage: 0 }}
              {@const pct = Math.round(dp.percentage || 0)}
              {@const isDone = dp.type === 'finished' || pct >= 100}
              {@const isFailed = dp.type === 'failed'}

              <div class="flex items-center gap-2 text-xs">
                <!-- Status indicator -->
                {#if isDone}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                {:else if isFailed}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                {:else}
                  <span class="loading loading-spinner loading-xs text-primary flex-shrink-0"></span>
                {/if}

                <!-- Device ID/Model -->
                <span class="flex-1 truncate">
                  {#if device.usbId}
                    <span class="font-mono text-success">{device.usbId}</span>
                  {:else}
                    <span>{device.model}</span>
                  {/if}
                </span>

                <!-- Phase label or percentage -->
                <span class="flex-shrink-0 tabular-nums" class:text-success={isDone} class:text-error={isFailed}>
                  {#if isDone}
                    Done
                  {:else if isFailed}
                    Error
                  {:else}
                    {pct}%
                  {/if}
                </span>
              </div>
            {/each}
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2 pt-2 border-t border-base-300">
            <button
              class="btn btn-sm btn-ghost flex-1 gap-1"
              onclick={goToFlashing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              View Details
            </button>
            {#if !isComplete}
              <button
                class="btn btn-sm btn-error flex-1 gap-1"
                onclick={handleCancel}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            {:else}
              <button
                class="btn btn-sm btn-success flex-1 gap-1"
                onclick={() => resetFlashing()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Dismiss
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
