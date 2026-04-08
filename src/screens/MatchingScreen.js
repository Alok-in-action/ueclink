// ============================================================
// Matching Screen — staged feedback + live queue
// ============================================================

import { enterQueue, listenForMatch, tryMatch, leaveQueue } from '../matching/queue.js';
import { getOnlineCount } from '../presence/counter.js';

const MESSAGES = [
  'Finding someone from your year…',
  'Trying nearby matches…',
  'Almost there…',
  'Taking a bit longer than usual…',
  'Hang tight, someone will appear…',
];

export function MatchingScreen({ profile, prefs, onMatched, onCancel }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="justify-content:center;align-items:center;text-align:center;gap:32px;">

      <!-- Animated orb -->
      <div style="position:relative;width:140px;height:140px;">
        <div style="position:absolute;inset:0;border-radius:50%;
          background:linear-gradient(135deg,var(--accent) 0%,#5b21b6 100%);
          animation:breathe 2.5s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:-20px;border-radius:50%;
          border:2px solid rgba(124,58,237,0.3);animation:pulse-ring 2s ease-out infinite;"></div>
        <div style="position:absolute;inset:-44px;border-radius:50%;
          border:1px solid rgba(124,58,237,0.12);animation:pulse-ring 2s ease-out infinite 0.5s;"></div>
        <div style="position:absolute;inset:-68px;border-radius:50%;
          border:1px solid rgba(124,58,237,0.06);animation:pulse-ring 2s ease-out infinite 1s;"></div>

        <!-- Orbiting dot -->
        <div style="position:absolute;inset:0;animation:orbit 3s linear infinite;">
          <div style="width:10px;height:10px;border-radius:50%;
            background:var(--accent-bright);box-shadow:0 0 12px var(--accent-bright);"></div>
        </div>

        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <svg width="36" height="36" fill="none" stroke="#fff" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
        </div>
      </div>

      <div>
        <h1 id="match-msg" style="font-size:20px;font-weight:700;
          min-height:60px;transition:opacity 0.3s ease;">
          Finding someone from your year…
        </h1>
        <p style="font-size:13px;color:var(--text-muted);margin-top:8px;" id="online-count-txt">
          —
        </p>
      </div>

      <!-- Prefs badge -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        ${prefs.sameYear ? `<div class="chip" style="background:var(--accent-dim);border:1px solid var(--border-glow);color:var(--accent-bright);">Same Year</div>` : ''}
        ${prefs.oppositeGender ? `<div class="chip" style="background:var(--accent-dim);border:1px solid var(--border-glow);color:var(--accent-bright);">Opposite Gender</div>` : ''}
      </div>

      <button class="btn btn-ghost btn-sm" id="cancel-btn" style="max-width:160px;">Cancel</button>
    </div>
  `;

  // Online count
  getOnlineCount().then(n => {
    const txt = el.querySelector('#online-count-txt');
    if (txt) txt.textContent = `${n} people online right now`;
  });

  // Staged messages
  let msgIdx = 0;
  const msgEl = el.querySelector('#match-msg');
  const cycleMsg = () => {
    msgEl.style.opacity = '0';
    setTimeout(() => {
      msgIdx = Math.min(msgIdx + 1, MESSAGES.length - 1);
      msgEl.textContent = MESSAGES[msgIdx];
      msgEl.style.opacity = '1';
    }, 300);
  };
  const msgTimer = setInterval(cycleMsg, 2500);

  // Enter queue + try to match
  let unsubscribeMatch = null;
  let cancelled = false;

  const startMatching = async () => {
    await enterQueue(profile, prefs);
    if (cancelled) return;

    unsubscribeMatch = listenForMatch(profile.userId, ({ sessionId, partnerId }) => {
      if (cancelled) return;
      clearInterval(msgTimer);
      if (unsubscribeMatch) unsubscribeMatch();
      onMatched({ sessionId, partnerId });
    });

    // Attempt match every 3s
    const matchInterval = setInterval(async () => {
      if (cancelled) { clearInterval(matchInterval); return; }
      await tryMatch(profile.userId, profile, prefs);
    }, 3000);

    // Store for cleanup
    el._cleanup = () => {
      clearInterval(matchInterval);
      clearInterval(msgTimer);
      if (unsubscribeMatch) unsubscribeMatch();
      leaveQueue(profile.userId);
    };
  };

  startMatching();

  el.querySelector('#cancel-btn').addEventListener('click', () => {
    cancelled = true;
    if (el._cleanup) el._cleanup();
    onCancel();
  });

  return el;
}
