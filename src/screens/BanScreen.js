// ============================================================
// Ban Screen — shown when user is actively banned
// ============================================================

export function BanScreen({ until }) {
  const el = document.createElement('div');

  function formatCountdown(date) {
    const diff = Math.max(0, date - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    if (h > 10000) return 'Permanently banned. Contact admin.';
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  el.innerHTML = `
    <div class="gradient-bg" style="background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(255,77,109,0.15) 0%,transparent 70%),var(--bg-deep);"></div>
    <div class="page-inner" style="justify-content:center;align-items:center;text-align:center;gap:28px;">

      <div style="width:88px;height:88px;border-radius:50%;
        background:rgba(255,77,109,0.1);border:2px solid rgba(255,77,109,0.3);
        display:flex;align-items:center;justify-content:center;">
        <svg width="40" height="40" fill="none" stroke="var(--danger)" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
        </svg>
      </div>

      <div>
        <h1 style="font-size:22px;font-weight:800;color:var(--danger);margin-bottom:10px;">
          Temporarily Banned
        </h1>
        <p style="font-size:15px;color:var(--text-secondary);line-height:1.6;max-width:280px;margin:0 auto;">
          Your account has been reported multiple times. Access is temporarily suspended.
        </p>
      </div>

      <div style="background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.2);
        border-radius:var(--radius-lg);padding:20px 28px;">
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">Access restored in</p>
        <div id="ban-countdown" style="font-size:32px;font-weight:800;font-variant-numeric:tabular-nums;
          color:var(--danger);letter-spacing:2px;"></div>
      </div>

      <p style="font-size:12px;color:var(--text-muted);max-width:240px;line-height:1.5;">
        Repeated violations may result in a permanent ban.
        Please be respectful to other users.
      </p>
    </div>
  `;

  const countdownEl = el.querySelector('#ban-countdown');
  const tick = () => {
    countdownEl.textContent = formatCountdown(until);
    if (until > Date.now()) requestAnimationFrame(tick);
  };
  tick();

  return el;
}
