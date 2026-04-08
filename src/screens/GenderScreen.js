// ============================================================
// Gender Selection Screen
// ============================================================

import { NavHeader } from '../ui/NavHeader.js';

export function GenderScreen({ profile, onSelect, onBack }) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;background:var(--bg-base);';

  // Nav
  el.appendChild(NavHeader({
    title: 'About You',
    onBack,
  }));

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="gap:0;padding-top:var(--space-xl);">

      <!-- Profile chip -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);
        padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:var(--space-xl);
        animation:fadeIn 0.4s var(--ease-out);">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-dim);
          border:1px solid var(--border-glow);display:flex;align-items:center;justify-content:center;
          font-size:16px;flex-shrink:0;">🎓</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${profile.branch}</div>
          <div style="font-size:12px;color:var(--text-muted);">${profile.yearLabel} · Verified Student</div>
        </div>
        <div class="chip chip-online" style="margin-left:auto;flex-shrink:0;font-size:11px;">✓ Verified</div>
      </div>

      <!-- Step -->
      <div style="animation:fadeUp 0.4s 0.1s var(--ease-out) both;">
        <p style="font-size:11px;font-weight:600;letter-spacing:1px;color:var(--accent-bright);
          text-transform:uppercase;margin-bottom:6px;">Step 1 of 2</p>
        <h1 style="font-size:24px;font-weight:800;margin-bottom:6px;">You are…</h1>
        <p style="font-size:14px;color:var(--text-secondary);">Helps us find you better matches.</p>
      </div>

      <!-- Options -->
      <div style="display:flex;gap:12px;margin-top:var(--space-xl);
                  animation:fadeUp 0.4s 0.2s var(--ease-out) both;">
        <div class="pill-option" id="gender-male" data-gender="male">
          <span class="emoji">💪</span>
          <span class="label">Male</span>
        </div>
        <div class="pill-option" id="gender-female" data-gender="female">
          <span class="emoji">💃</span>
          <span class="label">Female</span>
        </div>
      </div>

      <div style="margin-top:var(--space-xl);animation:fadeUp 0.4s 0.3s var(--ease-out) both;">
        <button class="btn btn-primary" id="continue-btn" disabled>Continue →</button>
      </div>
    </div>
  `;
  el.appendChild(body);

  let selected = null;
  const continueBtn = el.querySelector('#continue-btn');

  el.querySelectorAll('.pill-option').forEach(opt => {
    opt.addEventListener('click', () => {
      try { navigator.vibrate(10); } catch (_) {}
      el.querySelectorAll('.pill-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selected = opt.dataset.gender;
      continueBtn.disabled = false;
    });
  });

  continueBtn.addEventListener('click', () => {
    if (selected) onSelect(selected);
  });

  return el;
}
