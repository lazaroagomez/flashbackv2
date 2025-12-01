<script>
  let { status } = $props();

  const statusConfig = {
    // USB Drive statuses
    assigned: { label: 'Assigned', class: 'badge-success' },
    pending_update: { label: 'Pending Update', class: 'badge-warning' },
    on_hold: { label: 'On Hold', class: 'badge-info' },
    lost: { label: 'Lost', class: 'badge-error' },
    retired: { label: 'Retired', class: 'badge-neutral' },
    // Technician/Model statuses
    active: { label: 'Active', class: 'badge-success' },
    inactive: { label: 'Inactive', class: 'badge-neutral' },
    // Event types
    created: { label: 'Created', class: 'badge-success' },
    reassigned: { label: 'Reassigned', class: 'badge-info' },
    updated: { label: 'Updated', class: 'badge-ghost' },
    marked_pending: { label: 'Marked Pending', class: 'badge-warning' },
    repurpose: { label: 'Repurposed', class: 'badge-secondary' },
    damaged: { label: 'Damaged', class: 'badge-error' },
    reactivated: { label: 'Reactivated', class: 'badge-success' },
    formatted: { label: 'Formatted', class: 'badge-warning' },
    flash: { label: 'Flashed', class: 'badge-primary' }
  };

  const config = $derived(statusConfig[status] || { label: status, class: 'badge-ghost' });
</script>

<span class="badge {config.class}">{config.label}</span>
