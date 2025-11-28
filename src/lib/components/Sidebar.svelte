<script>
  import { session, logout } from '../stores/session.svelte.js';
  import { theme, setTheme, availableThemes } from '../stores/theme.svelte.js';
  import { api } from '../api.js';

  let { currentView, navigate } = $props();

  let pendingCount = $state(0);

  // Main menu items
  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'usb-drives', label: 'USB Drives', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { id: 'pending-updates', label: 'Pending Updates', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', showBadge: true },
    { id: 'technicians', label: 'Technicians', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
  ];

  // Settings submenu items
  const settingsItems = [
    { id: 'platforms', label: 'Platforms', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'usb-types', label: 'USB Types', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    { id: 'models', label: 'Models', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'versions', label: 'Versions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' }
  ];

  // Check if current view is a settings page
  const isSettingsView = $derived(settingsItems.some(item => item.id === currentView));

  // Format badge count (max 99)
  const badgeCount = $derived(pendingCount > 99 ? '99+' : pendingCount);

  async function loadPendingCount() {
    try {
      const pending = await api.getPendingUpdates();
      pendingCount = pending.length;
    } catch (e) {
      pendingCount = 0;
    }
  }

  // Load count once on app start
  $effect(() => {
    loadPendingCount();
  });
</script>

<aside class="bg-base-200 w-64 min-h-screen flex flex-col">
  <!-- Logo -->
  <div class="p-4 border-b border-base-300">
    <h1 class="text-xl font-bold">FlashBack USB</h1>
    <p class="text-xs text-base-content/60">Inventory System</p>
  </div>

  <!-- User info -->
  <div class="p-4 border-b border-base-300 hidden lg:block">
    <div class="flex items-center gap-2">
      <div class="avatar placeholder">
        <div class="bg-primary text-primary-content rounded-full w-8">
          <span class="text-sm">{session.username.charAt(0).toUpperCase()}</span>
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">{session.username}</p>
      </div>
      <button class="btn btn-ghost btn-xs" onclick={logout} title="Logout">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-4">
    <ul class="menu menu-md gap-1">
      <!-- Main menu items -->
      {#each mainMenuItems as item}
        <li>
          <button
            class="flex items-center gap-3"
            class:active={currentView === item.id}
            onclick={() => navigate(item.id)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
            </svg>
            <span class="flex-1">{item.label}</span>
            {#if item.showBadge && pendingCount > 0}
              <span class="badge badge-warning badge-sm">{badgeCount}</span>
            {/if}
          </button>
        </li>
      {/each}

      <!-- Divider -->
      <li class="my-2">
        <hr class="border-base-300" />
      </li>

      <!-- Settings collapsible menu -->
      <li>
        <details open={isSettingsView}>
          <summary class="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </summary>
          <ul>
            {#each settingsItems as item}
              <li>
                <button
                  class="flex items-center gap-3"
                  class:active={currentView === item.id}
                  onclick={() => navigate(item.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              </li>
            {/each}
          </ul>
        </details>
      </li>
    </ul>
  </nav>

  <!-- Footer -->
  <div class="p-4 border-t border-base-300">
    <div class="flex items-center justify-between">
      <span class="text-xs text-base-content/50">v{__APP_VERSION__}</span>
      <div class="dropdown dropdown-top dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle" title="Change Theme">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
          </svg>
        </div>
        <ul tabindex="0" class="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52 max-h-80 overflow-y-auto flex-nowrap">
          <li class="menu-title"><span>Light Themes</span></li>
          {#each availableThemes.filter(t => t.type === 'light') as t}
            <li>
              <button
                class:active={theme.current === t.id}
                onclick={() => setTheme(t.id)}
              >
                {t.name}
              </button>
            </li>
          {/each}
          <li class="menu-title mt-2"><span>Dark Themes</span></li>
          {#each availableThemes.filter(t => t.type === 'dark') as t}
            <li>
              <button
                class:active={theme.current === t.id}
                onclick={() => setTheme(t.id)}
              >
                {t.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</aside>
