<script>
  import SearchableSelect from '../SearchableSelect.svelte';

  let {
    value = $bindable(null),
    disabled = false,
    onchange
  } = $props();

  const statuses = [
    { id: 'assigned', label: 'Assigned' },
    { id: 'pending_update', label: 'Pending Update' },
    { id: 'lost', label: 'Lost' },
    { id: 'retired', label: 'Retired' }
  ];
</script>

<SearchableSelect
  bind:value
  options={statuses}
  valueField="id"
  labelField="label"
  label="Status"
  placeholder="Search status..."
  {disabled}
  {onchange}
/>
