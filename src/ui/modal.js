// ============================================================
// Modal (bottom sheet) utility
// ============================================================

const container = document.getElementById('modal-container');

export function showModal(htmlContent, onMount) {
  container.innerHTML = `<div class="modal-sheet">${htmlContent}</div>`;
  container.classList.add('open');

  // Close on backdrop tap
  container.addEventListener('click', (e) => {
    if (e.target === container) hideModal();
  }, { once: true });

  if (onMount) onMount(container.querySelector('.modal-sheet'));
}

export function hideModal() {
  container.classList.remove('open');
  container.innerHTML = '';
}
