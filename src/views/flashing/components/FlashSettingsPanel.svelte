<script>
  let {
    settings = $bindable({
      verify: true,
      partitionStyle: 'MBR',
      fileSystem: 'exFAT'
    })
  } = $props();

  const partitionStyles = [
    { value: 'MBR', label: 'MBR', description: 'Legacy, max 2TB' },
    { value: 'GPT', label: 'GPT', description: 'Modern, large drives' }
  ];

  const fileSystems = [
    { value: 'exFAT', label: 'exFAT', description: 'Best compatibility' },
    { value: 'NTFS', label: 'NTFS', description: 'Windows only' },
    { value: 'FAT32', label: 'FAT32', description: '4GB file limit' }
  ];
</script>

<div class="card bg-base-100 shadow-lg">
  <div class="card-body">
    <h2 class="card-title gap-2 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Settings
    </h2>

    <div class="space-y-4">
      <!-- Verification Toggle -->
      <div class="form-control">
        <label class="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            class="checkbox checkbox-primary"
            bind:checked={settings.verify}
          />
          <div>
            <span class="label-text font-medium">Verify after writing</span>
            <p class="text-xs text-base-content/60 mt-0.5">
              Read back data to ensure integrity (slower but safer)
            </p>
          </div>
        </label>
      </div>

      <!-- Partition Style (for format operations) -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">Partition Style</span>
          <span class="label-text-alt text-base-content/60">For format</span>
        </label>
        <select
          class="select select-bordered select-sm w-full"
          bind:value={settings.partitionStyle}
        >
          {#each partitionStyles as ps}
            <option value={ps.value}>{ps.label} - {ps.description}</option>
          {/each}
        </select>
      </div>

      <!-- File System (for format operations) -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">File System</span>
          <span class="label-text-alt text-base-content/60">For format</span>
        </label>
        <select
          class="select select-bordered select-sm w-full"
          bind:value={settings.fileSystem}
        >
          {#each fileSystems as fs}
            <option value={fs.value}>{fs.label} - {fs.description}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Info box -->
    <div class="alert mt-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-xs">
        Partition style and file system settings only apply to format operations.
        Flashing an image overwrites the entire disk.
      </span>
    </div>
  </div>
</div>
