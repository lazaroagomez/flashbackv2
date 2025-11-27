// Toast notification store using Svelte 5 runes

export const toasts = $state([]);

let toastId = 0;

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  toasts.push({ id, message, type });

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id) {
  const index = toasts.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
  }
}

export function showSuccess(message) {
  return showToast(message, 'success');
}

export function showError(message) {
  return showToast(message, 'error', 6000);
}

export function showWarning(message) {
  return showToast(message, 'warning');
}

export function showInfo(message) {
  return showToast(message, 'info');
}
