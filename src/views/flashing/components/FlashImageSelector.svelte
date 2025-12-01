<script>
  let {
    selectedImage = null,
    imageInfo = null,
    onSelect = () => {},
    onClear = () => {}
  } = $props();

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getExtensionBadge(ext) {
    const badges = {
      '.img': 'badge-info',
      '.iso': 'badge-primary',
      '.bin': 'badge-secondary',
      '.raw': 'badge-secondary',
      '.zip': 'badge-warning',
      '.gz': 'badge-warning',
      '.xz': 'badge-warning',
      '.bz2': 'badge-warning'
    };
    return badges[ext] || 'badge-ghost';
  }

  function getExtensionLabel(ext) {
    const labels = {
      '.img': 'Raw Image',
      '.iso': 'ISO Image',
      '.bin': 'Binary',
      '.raw': 'Raw Image',
      '.zip': 'ZIP Archive',
      '.gz': 'GZip',
      '.xz': 'XZ Archive',
      '.bz2': 'BZip2'
    };
    return labels[ext] || ext.replace('.', '').toUpperCase();
  }
</script>

<div class="card bg-base-100 shadow-lg">
  <div class="card-body">
    <h2 class="card-title gap-2 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Source Image
    </h2>

    {#if !selectedImage}
      <!-- No image selected -->
      <div class="border-2 border-dashed border-base-300 rounded-lg p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-base-content/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-base-content/50 mb-3">Select a disk image to flash</p>
        <button class="btn btn-primary btn-sm gap-2" onclick={onSelect}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Browse...
        </button>
        <p class="text-xs text-base-content/40 mt-3">
          Supported: .img, .iso, .bin, .raw, .zip, .gz, .xz, .bz2
        </p>
      </div>
    {:else}
      <!-- Image selected -->
      <div class="bg-base-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <!-- File icon -->
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <!-- File info -->
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate" title={imageInfo?.name}>
              {imageInfo?.name || 'Unknown'}
            </div>
            <div class="flex flex-wrap gap-2 mt-1">
              {#if imageInfo?.extension}
                <span class="badge {getExtensionBadge(imageInfo.extension)} badge-sm">
                  {getExtensionLabel(imageInfo.extension)}
                </span>
              {/if}
              {#if imageInfo?.isCompressed}
                <span class="badge badge-warning badge-sm gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Compressed
                </span>
              {/if}
            </div>
            <div class="text-sm text-base-content/60 mt-2">
              <span class="font-mono">{formatFileSize(imageInfo?.size || 0)}</span>
              {#if imageInfo?.isCompressed}
                <span class="text-xs text-base-content/40 ml-1">(compressed)</span>
              {/if}
            </div>
          </div>

          <!-- Clear button -->
          <button
            class="btn btn-ghost btn-sm btn-circle text-error"
            onclick={onClear}
            title="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Change image button -->
        <div class="mt-3 pt-3 border-t border-base-300">
          <button class="btn btn-ghost btn-sm gap-2" onclick={onSelect}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Change Image
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
