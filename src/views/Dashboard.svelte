<script>
  import { api } from '../lib/api.js';
  import StatusBadge from '../lib/components/StatusBadge.svelte';

  let { navigate } = $props();

  let stats = $state(null);
  let loading = $state(true);
  let error = $state(null);

  async function loadStats() {
    loading = true;
    error = null;
    try {
      stats = await api.getDashboardStats();
    } catch (e) {
      error = e.message || 'Failed to load dashboard';
    } finally {
      loading = false;
    }
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  $effect(() => {
    loadStats();
  });

  const pendingCount = $derived(stats?.byStatus?.pending_update || 0);
  const totalUsb = $derived(stats?.totalUsb || 0);
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <button class="btn btn-ghost btn-sm" onclick={loadStats}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">
      <span>{error}</span>
      <button class="btn btn-sm" onclick={loadStats}>Retry</button>
    </div>
  {:else if stats}
    <!-- Status Stats -->
    <div class="stats shadow w-full">
      <div class="stat">
        <div class="stat-figure text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <div class="stat-title">Total USB Drives</div>
        <div class="stat-value text-primary">{totalUsb}</div>
      </div>

      <div class="stat cursor-pointer hover:bg-base-200" onclick={() => navigate('usb-drives')}>
        <div class="stat-figure text-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="stat-title">Assigned</div>
        <div class="stat-value text-success">{stats.byStatus?.assigned || 0}</div>
      </div>

      <div class="stat cursor-pointer hover:bg-base-200" onclick={() => navigate('pending-updates')}>
        <div class="stat-figure text-warning">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="stat-title">Pending Update</div>
        <div class="stat-value text-warning">{pendingCount}</div>
        {#if pendingCount > 0}
          <div class="stat-desc text-warning">Click to view</div>
        {/if}
      </div>

      <div class="stat">
        <div class="stat-figure text-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="stat-title">Issues</div>
        <div class="stat-value text-error">
          {(stats.byStatus?.damaged || 0) + (stats.byStatus?.lost || 0)}
        </div>
        <div class="stat-desc">
          {stats.byStatus?.damaged || 0} damaged, {stats.byStatus?.lost || 0} lost
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- USB per Technician -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">USB Drives by Technician</h2>
          {#if stats.byTechnician?.length > 0}
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th class="text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {#each stats.byTechnician as item}
                    <tr class="hover">
                      <td>{item.name}</td>
                      <td class="text-right">{item.count}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-base-content/50">No technicians with assigned USBs</p>
          {/if}
        </div>
      </div>

      <!-- USB per Platform -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">USB Drives by Platform</h2>
          {#if stats.byPlatform?.length > 0}
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th class="text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {#each stats.byPlatform as item}
                    <tr class="hover">
                      <td>{item.name}</td>
                      <td class="text-right">{item.count}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-base-content/50">No platforms configured</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Warnings -->
    {#if stats.inactiveTechnicianWarnings?.length > 0}
      <div class="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 class="font-bold">USBs assigned to inactive technicians</h3>
          <div class="text-sm">
            {stats.inactiveTechnicianWarnings.map(w => `${w.usb_id} (${w.technician_name})`).join(', ')}
          </div>
        </div>
      </div>
    {/if}

    <!-- Recent Activity -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title">Recent Activity</h2>
        {#if stats.recentEvents?.length > 0}
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>USB</th>
                  <th>Event</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {#each stats.recentEvents as event}
                  <tr class="hover cursor-pointer" onclick={() => navigate('usb-drive-detail', { id: event.drive_id })}>
                    <td class="whitespace-nowrap">{formatDate(event.timestamp)}</td>
                    <td class="font-mono">{event.usb_id}</td>
                    <td>
                      <StatusBadge status={event.event_type} />
                    </td>
                    <td>{event.username}</td>
                    <td class="max-w-xs truncate">{event.details}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-base-content/50">No recent activity</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
