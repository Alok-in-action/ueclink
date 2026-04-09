// ============================================================
// Matching Preferences Screen
// ============================================================

import { NavHeader } from '../ui/NavHeader.js';

export function PreferencesScreen({ profile, onStart, onBack }) {
  // targetYear: 'any', 1, 2, 3, 4, 5
  const prefs = { targetYear: 'any', oppositeGender: false };

  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;background:var(--bg-base);';

  el.appendChild(NavHeader({
    title: 'Preferences',
    onBack,
  }));

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="gap:0;padding-top:var(--space-xl);">

      <div style="animation:fadeUp 0.4s 0.1s var(--ease-out) both;">
        <p style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--accent-bright);
          text-transform:uppercase;margin-bottom:6px;">Step 2 of 2</p>
        <h1 style="font-size:24px;font-weight:800;margin-bottom:6px;">Your Preferences</h1>
        <p style="font-size:14px;color:var(--text-secondary);">
          Customize who you want to talk to.
        </p>
      </div>

      <!-- Year Selector -->
      <div style="margin-top:var(--space-xl);animation:fadeUp 0.4s 0.2s var(--ease-out) both;">
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <span>Connect with which year?</span>
          <span style="font-size:11px;font-weight:400;color:var(--text-muted);">(Priority)</span>
        </div>
        
        <div class="year-selector-grid" style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        ">
          <div class="year-chip selected" data-value="any">Any</div>
          <div class="year-chip" data-value="1">1st Year</div>
          <div class="year-chip" data-value="2">2nd Year</div>
          <div class="year-chip" data-value="3">3rd Year</div>
          <div class="year-chip" data-value="4">4th Year</div>
          <div class="year-chip" data-value="5">5th Year</div>
        </div>
      </div>

      <div class="card" style="margin-top:var(--space-xl);animation:fadeUp 0.4s 0.3s var(--ease-out) both;">
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Prefer opposite gender</div>
            <div class="toggle-sub">Match across genders when available</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="pref-opp-gender" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Info note -->
      <div style="margin-top:var(--space-md);padding:12px 14px;
        background:var(--accent-dim);border:1px solid var(--border-glow);border-radius:var(--radius-md);
        animation:fadeUp 0.4s 0.4s var(--ease-out) both;">
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;">
          🔒 All chats are 100% anonymous and private by default.
        </p>
      </div>

      <div style="flex:1;min-height:var(--space-xl);"></div>

      <div style="animation:fadeUp 0.4s 0.5s var(--ease-out) both;">
        <button class="btn btn-primary" id="start-btn">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          Find a Match
        </button>
      </div>
    </div>
  `;
  el.appendChild(body);

  // Selector logic
  el.querySelectorAll('.year-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      try { navigator.vibrate(8); } catch (_) {}
      el.querySelectorAll('.year-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      prefs.targetYear = chip.dataset.value === 'any' ? 'any' : parseInt(chip.dataset.value);
    });
  });

  el.querySelector('#pref-opp-gender').addEventListener('change', e => {
    prefs.oppositeGender = e.target.checked;
  });

  el.querySelector('#start-btn').addEventListener('click', () => {
    onStart(prefs);
  });

  return el;
}
