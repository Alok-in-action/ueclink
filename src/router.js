// ============================================================
// Screen Router — simple push/pop with slide transitions
// ============================================================

const container = document.getElementById('screen-container');
let currentScreen = null;

/**
 * Navigate to a new screen
 * @param {HTMLElement} el - The new screen element to show
 * @param {boolean} back   - If true, slide back (right-to-left reversed)
 */
export function showScreen(el, back = false) {
  if (currentScreen === el) return;

  el.classList.add('screen');

  if (currentScreen) {
    const old = currentScreen;
    old.classList.add('slide-exit');
    old.addEventListener('animationend', () => old.remove(), { once: true });
  }

  container.appendChild(el);
  el.classList.add(back ? 'slide-back-enter' : 'slide-enter');
  el.addEventListener('animationend', () => {
    el.classList.remove('slide-enter', 'slide-back-enter');
  }, { once: true });

  currentScreen = el;
}
