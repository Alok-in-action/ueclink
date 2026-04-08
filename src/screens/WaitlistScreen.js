// ============================================================
// Waitlist Screen — year not yet opened for access
// ============================================================

export function WaitlistScreen({ yearLabel }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="justify-content:center;align-items:center;text-align:center;gap:28px;">

      <div style="width:88px;height:88px;border-radius:50%;
        background:var(--accent-dim);border:2px solid var(--border-glow);
        display:flex;align-items:center;justify-content:center;
        animation:breathe 3s ease-in-out infinite;">
        <svg width="40" height="40" fill="none" stroke="var(--accent-bright)" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>

      <div style="animation:fadeUp 0.4s 0.1s var(--ease-out) both;">
        <h1 style="font-size:22px;font-weight:800;margin-bottom:10px;">Coming Soon</h1>
        <p style="font-size:15px;color:var(--text-secondary);line-height:1.6;max-width:280px;margin:0 auto;">
          UEC Link is currently rolling out to <strong style="color:#fff;">2nd Year</strong> students first.
          Access for <strong style="color:#fff;">${yearLabel}</strong> students is coming soon.
        </p>
      </div>

      <div class="card" style="animation:fadeUp 0.4s 0.2s var(--ease-out) both;">
        <p style="font-size:13px;color:var(--text-muted);line-height:1.5;text-align:center;">
          We're rolling out year by year to ensure the best matching experience.
          Stay tuned — you'll be the next batch.
        </p>
      </div>

      <div style="width:100%;animation:fadeUp 0.4s 0.3s var(--ease-out) both;">
        <div class="chip chip-online" style="width:fit-content;margin:0 auto;">
          Waitlist active
        </div>
      </div>
    </div>
  `;
  return el;
}
