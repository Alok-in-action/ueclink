// ============================================================
// Nav Header — back button + title for each screen
// ============================================================

/**
 * @param {object} opts
 * @param {string}   opts.title     - Screen title
 * @param {Function} [opts.onBack]  - If provided, shows back arrow
 * @param {string}   [opts.right]   - Optional right-side HTML
 */
export function NavHeader({ title = '', onBack = null, right = '' } = {}) {
  const el = document.createElement('div');
  el.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(var(--safe-top) + 14px) var(--space-md) 14px;
    background: var(--bg-base);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 10;
    width: 100%;
  `;

  el.innerHTML = `
    ${onBack ? `
      <button id="nav-back-btn" style="
        background: none; border: none; cursor: pointer;
        padding: 6px; margin-left: -4px;
        color: var(--text-secondary);
        display: flex; align-items: center; justify-content: center;
        border-radius: var(--radius-sm);
        transition: color var(--duration-fast) ease, background var(--duration-fast) ease;
        -webkit-tap-highlight-color: transparent;
      ">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
        </svg>
      </button>
    ` : `<div style="width:34px;"></div>`}
    
    <div style="flex:1; text-align:center;">
      <span style="font-size:15px; font-weight:700; color:var(--text-primary);">${title}</span>
    </div>

    <div style="min-width:34px; display:flex; justify-content:flex-end;">
      ${right}
    </div>
  `;

  if (onBack) {
    const btn = el.querySelector('#nav-back-btn');
    btn.addEventListener('mouseenter', () => {
      btn.style.color = 'var(--text-primary)';
      btn.style.background = 'var(--bg-card)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.color = 'var(--text-secondary)';
      btn.style.background = 'none';
    });
    btn.addEventListener('click', () => {
      try { navigator.vibrate(8); } catch (_) {}
      onBack();
    });
  }

  return el;
}
