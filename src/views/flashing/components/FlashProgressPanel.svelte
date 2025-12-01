<script>
  let {
    progress = {},
    devices = [],
    imageName = '',
    onCancel = () => {}
  } = $props();

  function formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 MB/s';
    const mbps = bytesPerSecond / (1024 * 1024);
    if (mbps >= 1000) {
      return `${(mbps / 1000).toFixed(1)} GB/s`;
    }
    return `${mbps.toFixed(1)} MB/s`;
  }

  function formatEta(seconds) {
    if (!seconds || seconds === 0 || seconds === Infinity) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getPhaseLabel(type) {
    const labels = {
      'starting': 'Starting...',
      'decompressing': 'Decompressing...',
      'flashing': 'Writing to disk...',
      'verifying': 'Verifying...',
      'finished': 'Complete'
    };
    return labels[type] || type || 'Processing...';
  }

  function getPhaseIcon(type) {
    if (type === 'verifying') {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
    if (type === 'finished') {
      return 'M5 13l4 4L19 7';
    }
    return 'M13 10V3L4 14h7v7l9-11h-7z';
  }

  const percentage = $derived(Math.round(progress.percentage || 0));
  const isComplete = $derived(progress.type === 'finished' || percentage >= 100);
</script>

<div class="card bg-base-100 shadow-lg">
  <div class="card-body">
    <!-- Header -->
    <div class="flex justify-between items-start mb-4">
      <div>
        <h2 class="card-title gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getPhaseIcon(progress.type)} />
          </svg>
          {getPhaseLabel(progress.type)}
        </h2>
        <p class="text-sm text-base-content/60 mt-1">{imageName}</p>
      </div>
      {#if !isComplete}
        <button class="btn btn-error btn-sm gap-2" onclick={onCancel}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      {/if}
    </div>

    <!-- Overall Progress -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium">Overall Progress</span>
        <span class="text-lg font-bold font-mono">{percentage}%</span>
      </div>
      <progress
        class="progress progress-primary w-full h-4"
        value={percentage}
        max="100"
      ></progress>
      <div class="flex justify-between text-xs text-base-content/60 mt-2">
        <span>Speed: {formatSpeed(progress.speed)}</span>
        <span>ETA: {formatEta(progress.eta)}</span>
      </div>
    </div>

    <!-- Device Status -->
    {#if devices.length > 0}
      <div>
        <h3 class="text-sm font-semibold mb-3">Device Status ({devices.length})</h3>
        <div class="space-y-3">
          {#each devices as device (device.diskIndex)}
            <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
              <!-- Status icon -->
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

              <!-- Device info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  {#if device.usbId}
                    <span class="font-mono font-bold text-success">{device.usbId}</span>
                  {/if}
                  <span class="text-sm truncate">{device.model}</span>
                </div>
                <div class="text-xs text-base-content/50">
                  Disk {device.diskIndex} - {device.sizeGB} GB
                </div>
              </div>

              <!-- Individual progress -->
              <div class="w-24 text-right">
                <div class="text-sm font-mono font-semibold">
                  {isComplete ? '100%' : `${percentage}%`}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Warning -->
    <div class="alert alert-warning mt-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span class="text-sm">Do not remove USB devices during this operation</span>
    </div>
  </div>
</div>
