// ============================================================
// Landing Screen
// ============================================================

import { getOnlineCount, getMatchesRecentText } from '../presence/counter.js';
import { showToast } from '../ui/toast.js';

export function LandingScreen({ onGoogleLogin }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="justify-content:space-between;padding-top:0;">

      <!-- Orbs -->
      <div style="position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;">
        <div style="position:absolute;width:340px;height:340px;border-radius:50%;
          background:radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%);
          top:-80px;left:50%;transform:translateX(-50%);filter:blur(20px);"></div>
        <div style="position:absolute;width:200px;height:200px;border-radius:50%;
          background:radial-gradient(circle,rgba(79,70,229,0.12) 0%,transparent 70%);
          bottom:80px;right:-40px;filter:blur(24px);animation:float 6s ease-in-out infinite;"></div>
      </div>

      <!-- Top wordmark -->
      <div style="padding-top:calc(var(--safe-top) + 28px);text-align:center;position:relative;z-index:1;">
        <div class="wordmark">UEC<span>Link</span></div>
      </div>

      <!-- Hero -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
                  text-align:center;gap:20px;position:relative;z-index:1;padding:var(--space-xl) 0;">

        <!-- pulse orb -->
        <div style="position:relative;width:110px;height:110px;margin-bottom:8px;">
          <div style="position:absolute;inset:0;border-radius:50%;
            background:linear-gradient(135deg,var(--accent),#5b21b6);
            animation:breathe 3s ease-in-out infinite;"></div>
          <div style="position:absolute;inset:-18px;border-radius:50%;
            border:1.5px solid rgba(124,58,237,0.25);animation:pulse-ring 2.5s ease-out infinite;"></div>
          <div style="position:absolute;inset:-36px;border-radius:50%;
            border:1px solid rgba(124,58,237,0.12);animation:pulse-ring 2.5s ease-out infinite 0.6s;"></div>
          <svg style="position:absolute;inset:0;margin:auto;width:44px;height:44px;color:#fff;"
            fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227
                 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14
                 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626
                 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0
                 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
          </svg>
        </div>

        <h1 style="font-size:26px;font-weight:800;line-height:1.25;letter-spacing:-0.5px;max-width:280px;">
          Someone from your college<br/>
          <span style="background:linear-gradient(135deg,var(--accent-bright),#c084fc);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
            is waiting…
          </span>
        </h1>

        <p style="font-size:15px;color:var(--text-secondary);max-width:260px;line-height:1.6;">
          Anonymous conversations with verified UEC students only.
        </p>

        <!-- presence chip -->
        <div id="presence-chip" class="chip chip-online" style="margin-top:4px;">
          — people online
        </div>
        <div id="matches-text" style="font-size:12px;color:var(--text-muted);">
          —
        </div>
      </div>

      <!-- CTA -->
      <div style="position:relative;z-index:1;width:100%;display:flex;flex-direction:column;gap:12px;
                  padding-bottom:calc(var(--space-xl) + var(--safe-bottom));">

        <button class="btn btn-google" id="google-login-btn" style="font-size:15px;">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style="text-align:center;font-size:11px;color:var(--text-muted);line-height:1.5;">
          Only <strong style="color:var(--text-secondary);">@uecu.ac.in</strong> email addresses are accepted.<br/>
          All chats are anonymous by default.
        </p>
      </div>
    </div>
  `;

  // Fetch presence count
  getOnlineCount().then(count => {
    const chip = el.querySelector('#presence-chip');
    const matchText = el.querySelector('#matches-text');
    if (chip) chip.textContent = `${count} people online`;
    if (matchText) matchText.textContent = getMatchesRecentText();
  });

  el.querySelector('#google-login-btn').addEventListener('click', () => {
    onGoogleLogin();
  });

  return el;
}
