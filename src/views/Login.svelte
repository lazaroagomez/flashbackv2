<script>
  import { api } from '../lib/api.js';
  import { login, getLastUsername, getSessionHours } from '../lib/stores/session.svelte.js';
  import { showError } from '../lib/stores/toast.svelte.js';

  let password = $state('');
  let username = $state(getLastUsername());
  let rememberMe = $state(true);
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';

    if (!password) {
      error = 'Password is required';
      return;
    }
    if (!username.trim()) {
      error = 'Your name is required';
      return;
    }

    loading = true;
    try {
      const valid = await api.validatePassword(password);
      if (valid) {
        login(username.trim(), rememberMe);
      } else {
        error = 'Invalid password';
        showError('Invalid password');
      }
    } catch (e) {
      error = 'Connection error. Please check database connection.';
      showError(e.message || 'Connection error');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body">
      <div class="text-center mb-4">
        <h1 class="text-2xl font-bold">FlashBack USB</h1>
        <p class="text-base-content/60">Inventory Management System</p>
      </div>

      <form onsubmit={handleSubmit}>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Your Name</span>
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            class="input input-bordered"
            bind:value={username}
            disabled={loading}
          />
          <label class="label">
            <span class="label-text-alt text-base-content/50">This will be used for audit logs</span>
          </label>
        </div>

        <div class="form-control mt-2">
          <label class="label">
            <span class="label-text">Password</span>
          </label>
          <input
            type="password"
            placeholder="Enter password"
            class="input input-bordered"
            bind:value={password}
            disabled={loading}
          />
        </div>

        <div class="form-control mt-4">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              bind:checked={rememberMe}
              disabled={loading}
            />
            <span class="label-text">Remember me for {getSessionHours()} hours</span>
          </label>
        </div>

        {#if error}
          <div class="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        {/if}

        <div class="form-control mt-6">
          <button class="btn btn-primary" type="submit" disabled={loading}>
            {#if loading}
              <span class="loading loading-spinner loading-sm"></span>
            {/if}
            Login
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
