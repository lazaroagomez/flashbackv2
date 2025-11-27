<script>
  import Sidebar from './Sidebar.svelte';
  import Toast from './Toast.svelte';
  import { session, logout } from '../stores/session.svelte.js';

  let { currentView, navigate, children } = $props();
</script>

<div class="drawer lg:drawer-open">
  <input id="main-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content flex flex-col">
    <!-- Top navbar for mobile -->
    <div class="navbar bg-base-200 lg:hidden">
      <div class="flex-none">
        <label for="main-drawer" class="btn btn-square btn-ghost">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </label>
      </div>
      <div class="flex-1">
        <span class="text-xl font-bold">FlashBack USB</span>
      </div>
      <div class="flex-none">
        <span class="text-sm mr-2">{session.username}</span>
        <button class="btn btn-ghost btn-sm" onclick={logout}>Logout</button>
      </div>
    </div>

    <!-- Main content area -->
    <main class="flex-1 p-6 bg-base-100 overflow-auto">
      {@render children()}
    </main>
  </div>

  <!-- Sidebar -->
  <div class="drawer-side">
    <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
    <Sidebar {currentView} {navigate} />
  </div>
</div>

<Toast />
