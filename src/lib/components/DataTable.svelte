<script>
  let {
    data = [],
    columns = [],
    loading = false,
    selectable = false,
    selected = $bindable([]),
    onrowclick,
    emptyMessage = 'No data found'
  } = $props();

  function toggleAll(e) {
    if (e.target.checked) {
      selected = data.map(row => row.id);
    } else {
      selected = [];
    }
  }

  function toggleRow(id) {
    if (selected.includes(id)) {
      selected = selected.filter(s => s !== id);
    } else {
      selected = [...selected, id];
    }
  }

  const allSelected = $derived(data.length > 0 && selected.length === data.length);
</script>

<div class="overflow-x-auto">
  <table class="table table-zebra">
    <thead>
      <tr>
        {#if selectable}
          <th>
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={allSelected}
              onchange={toggleAll}
            />
          </th>
        {/if}
        {#each columns as col}
          <th class={col.class || ''}>{col.header}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if loading}
        <tr>
          <td colspan={columns.length + (selectable ? 1 : 0)} class="text-center py-8">
            <span class="loading loading-spinner loading-md"></span>
            <span class="ml-2">Loading...</span>
          </td>
        </tr>
      {:else if data.length === 0}
        <tr>
          <td colspan={columns.length + (selectable ? 1 : 0)} class="text-center py-8 text-base-content/50">
            {emptyMessage}
          </td>
        </tr>
      {:else}
        {#each data as row (row.id)}
          <tr
            class="hover cursor-pointer"
            onclick={() => onrowclick?.(row)}
          >
            {#if selectable}
              <td onclick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  checked={selected.includes(row.id)}
                  onchange={() => toggleRow(row.id)}
                />
              </td>
            {/if}
            {#each columns as col}
              <td class={col.cellClass || ''}>
                {#if col.render}
                  {@html col.render(row)}
                {:else if col.component}
                  <svelte:component this={col.component} {...col.props?.(row)} />
                {:else}
                  {row[col.key] ?? '-'}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
