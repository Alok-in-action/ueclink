// ============================================================
// Toast utility
// ============================================================

const container = document.getElementById('toast-container');

export function showToast(message, type = '', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast${type ? ' ' + type : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = `toastOut 0.3s var(--ease-out) forwards`;
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}
