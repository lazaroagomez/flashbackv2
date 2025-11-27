<script>
  let { status } = $props();

  const statusConfig = {
    assigned: { label: 'Assigned', class: 'badge-success' },
    pending_update: { label: 'Pending Update', class: 'badge-warning' },
    damaged: { label: 'Damaged', class: 'badge-error' },
    lost: { label: 'Lost', class: 'badge-error' },
    retired: { label: 'Retired', class: 'badge-neutral' },
    active: { label: 'Active', class: 'badge-success' },
    inactive: { label: 'Inactive', class: 'badge-neutral' }
  };

  const config = $derived(statusConfig[status] || { label: status, class: 'badge-ghost' });
</script>

<span class="badge {config.class}">{config.label}</span>
