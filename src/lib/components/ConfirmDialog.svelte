<script>
  let {
    open = false,
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmClass = 'btn-primary',
    onconfirm,
    oncancel
  } = $props();
</script>

<dialog class="modal" class:modal-open={open}>
  <div class="modal-box">
    <h3 class="font-bold text-lg">{title}</h3>
    <p class="py-4">{message}</p>
    <div class="modal-action">
      <button class="btn" onclick={oncancel}>{cancelText}</button>
      <button class="btn {confirmClass}" onclick={onconfirm}>{confirmText}</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button onclick={oncancel}>close</button>
  </form>
</dialog>
