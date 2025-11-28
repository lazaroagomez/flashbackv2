<script>
  import { session } from './lib/stores/session.svelte.js';
  import { navigation, navigate } from './lib/stores/navigation.svelte.js';
  import { applyTheme } from './lib/stores/theme.svelte.js';
  import Layout from './lib/components/Layout.svelte';
  import Login from './views/Login.svelte';
  import Dashboard from './views/Dashboard.svelte';
  import UsbDriveList from './views/usb-drives/UsbDriveList.svelte';
  import UsbDriveDetail from './views/usb-drives/UsbDriveDetail.svelte';
  import UsbDriveCreate from './views/usb-drives/UsbDriveCreate.svelte';
  import UsbDriveCreateSeries from './views/usb-drives/UsbDriveCreateSeries.svelte';
  import TechnicianList from './views/technicians/TechnicianList.svelte';
  import TechnicianDetail from './views/technicians/TechnicianDetail.svelte';
  import PlatformList from './views/platforms/PlatformList.svelte';
  import UsbTypeList from './views/usb-types/UsbTypeList.svelte';
  import ModelList from './views/models/ModelList.svelte';
  import ModelDetail from './views/models/ModelDetail.svelte';
  import VersionList from './views/versions/VersionList.svelte';
  import PendingUpdatesList from './views/pending-updates/PendingUpdatesList.svelte';

  // Make navigate globally available
  if (typeof window !== 'undefined') {
    window.navigate = navigate;
  }
</script>

{#if !session.isAuthenticated}
  <Login />
{:else}
  <Layout currentView={navigation.currentView} {navigate}>
    {#if navigation.currentView === 'dashboard'}
      <Dashboard {navigate} />
    {:else if navigation.currentView === 'usb-drives'}
      <UsbDriveList {navigate} />
    {:else if navigation.currentView === 'usb-drive-detail'}
      <UsbDriveDetail id={navigation.viewParams.id} {navigate} />
    {:else if navigation.currentView === 'usb-drive-create'}
      <UsbDriveCreate {navigate} />
    {:else if navigation.currentView === 'usb-drive-create-series'}
      <UsbDriveCreateSeries {navigate} />
    {:else if navigation.currentView === 'technicians'}
      <TechnicianList {navigate} />
    {:else if navigation.currentView === 'technician-detail'}
      <TechnicianDetail id={navigation.viewParams.id} {navigate} />
    {:else if navigation.currentView === 'platforms'}
      <PlatformList />
    {:else if navigation.currentView === 'usb-types'}
      <UsbTypeList />
    {:else if navigation.currentView === 'models'}
      <ModelList {navigate} />
    {:else if navigation.currentView === 'model-detail'}
      <ModelDetail id={navigation.viewParams.id} {navigate} />
    {:else if navigation.currentView === 'versions'}
      <VersionList />
    {:else if navigation.currentView === 'pending-updates'}
      <PendingUpdatesList {navigate} />
    {:else}
      <Dashboard {navigate} />
    {/if}
  </Layout>
{/if}
