<script>
  let {
    devices = [],
    selectedDevices = [],
    loading = false,
    onToggle = () => {},
    onFormat = () => {},
    onSelectAll = () => {},
    onClearAll = () => {}
  } = $props();

  const registeredDevices = $derived(devices.filter(d => d.isRegistered));
  const unregisteredDevices = $derived(devices.filter(d => !d.isRegistered));
  const allSelected = $derived(
    devices.length > 0 && selectedDevices.length === devices.length
  );

  function formatSize(sizeGB) {
    if (sizeGB >= 1000) {
      return `${(sizeGB / 1000).toFixed(1)} TB`;
    }
    return `${sizeGB} GB`;
  }

  function getHealthBadge(healthStatus) {
    if (healthStatus === 'Healthy') return 'badge-success';
    if (healthStatus === 'Warning') return 'badge-warning';
    return 'badge-error';
  }
</script>

<div class="card bg-base-100 shadow-lg">
  <div class="card-body">
    <div class="flex justify-between items-center mb-4">
      <h2 class="card-title gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
        Select Devices
        <span class="badge badge-neutral">{selectedDevices.length}/{devices.length}</span>
      </h2>
      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-xs"
          onclick={allSelected ? onClearAll : onSelectAll}
          disabled={devices.length === 0}
        >
          {allSelected ? 'Clear All' : 'Select All'}
        </button>
      </div>
    </div>

    {#if loading}
      <div class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:else if devices.length === 0}
      <div class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-base-content/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
        <p class="text-base-content/50">No USB drives detected</p>
        <p class="text-sm text-base-content/40 mt-1">Connect USB devices and click Refresh</p>
      </div>
    {:else}
      <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        <!-- Registered Devices Section -->
        {#if registeredDevices.length > 0}
          <div>
            <h3 class="text-sm font-semibold text-success flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Registered Devices ({registeredDevices.length})
            </h3>
            <div class="space-y-2">
              {#each registeredDevices as device (device.diskIndex)}
                {@const isSelected = selectedDevices.includes(device.diskIndex)}
                <div
                  class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md {isSelected ? 'border-primary bg-primary/10' : 'border-base-300'}"
                  onclick={() => onToggle(device.diskIndex)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && onToggle(device.diskIndex)}
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    checked={selectedDevices.includes(device.diskIndex)}
                    onclick={(e) => e.stopPropagation()}
                    onchange={() => onToggle(device.diskIndex)}
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-mono font-bold text-success">{device.usbId}</span>
                      <span class="badge {getHealthBadge(device.healthStatus)} badge-xs">{device.healthStatus}</span>
                    </div>
                    <div class="text-sm text-base-content/70 truncate">{device.model}</div>
                    {#if device.serial}
                      <div class="text-xs font-mono text-base-content/50 truncate">{device.serial}</div>
                    {/if}
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="font-mono font-semibold">{formatSize(device.sizeGB)}</div>
                    <div class="text-xs text-base-content/50">Disk {device.diskIndex}</div>
                    <div class="text-xs badge badge-ghost badge-sm mt-1">{device.partitionStyle}</div>
                  </div>
                  <button
                    class="btn btn-ghost btn-sm text-warning"
                    onclick={(e) => { e.stopPropagation(); onFormat(device); }}
                    title="Format this drive"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Unregistered Devices Section -->
        {#if unregisteredDevices.length > 0}
          <div>
            <h3 class="text-sm font-semibold text-warning flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Unregistered Devices ({unregisteredDevices.length})
            </h3>
            <div class="space-y-2">
              {#each unregisteredDevices as device (device.diskIndex)}
                {@const isSelected = selectedDevices.includes(device.diskIndex)}
                <div
                  class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md {isSelected ? 'border-primary bg-primary/10' : 'border-base-300'}"
                  onclick={() => onToggle(device.diskIndex)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && onToggle(device.diskIndex)}
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    checked={selectedDevices.includes(device.diskIndex)}
                    onclick={(e) => e.stopPropagation()}
                    onchange={() => onToggle(device.diskIndex)}
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold">{device.model}</span>
                      <span class="badge {getHealthBadge(device.healthStatus)} badge-xs">{device.healthStatus}</span>
                    </div>
                    {#if device.serial}
                      <div class="text-xs font-mono text-base-content/50 truncate">{device.serial}</div>
                    {:else}
                      <div class="text-xs text-base-content/40 italic">No serial number</div>
                    {/if}
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="font-mono font-semibold">{formatSize(device.sizeGB)}</div>
                    <div class="text-xs text-base-content/50">Disk {device.diskIndex}</div>
                    <div class="text-xs badge badge-ghost badge-sm mt-1">{device.partitionStyle}</div>
                  </div>
                  <button
                    class="btn btn-ghost btn-sm text-warning"
                    onclick={(e) => { e.stopPropagation(); onFormat(device); }}
                    title="Format this drive"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
