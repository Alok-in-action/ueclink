// ============================================================
// Auth Error Screen — non-college email
// ============================================================

export function AuthErrorScreen({ onRetry }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="justify-content:center;align-items:center;text-align:center;gap:28px;">

      <div style="width:88px;height:88px;border-radius:50%;
        background:rgba(255,77,109,0.1);border:2px solid rgba(255,77,109,0.3);
        display:flex;align-items:center;justify-content:center;
        animation:fadeIn 0.4s var(--ease-out);">
        <svg width="40" height="40" fill="none" stroke="var(--danger)" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
        </svg>
      </div>

      <div style="animation:fadeUp 0.4s 0.1s var(--ease-out) both;">
        <h1 style="font-size:22px;font-weight:800;color:var(--danger);margin-bottom:10px;">
          Access Restricted
        </h1>
        <p style="font-size:15px;color:var(--text-secondary);line-height:1.6;max-width:280px;margin:0 auto;">
          Only <strong style="color:#fff;">@uecu.ac.in</strong> email addresses are allowed to access UEC Link.
        </p>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border);
        border-radius:var(--radius-md);padding:14px 18px;
        animation:fadeUp 0.4s 0.2s var(--ease-out) both;">
        <p style="font-size:13px;color:var(--text-muted);line-height:1.5;">
          Make sure you're signing in with your college email, not a personal Gmail account.
        </p>
      </div>

      <div style="width:100%;animation:fadeUp 0.4s 0.3s var(--ease-out) both;">
        <button class="btn btn-ghost" id="retry-btn">Try Again</button>
      </div>
    </div>
  `;

  el.querySelector('#retry-btn').addEventListener('click', onRetry);
  return el;
}
