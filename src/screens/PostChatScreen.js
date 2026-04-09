// ============================================================
// Post-Chat Screen — with mutual reveal
// ============================================================

import { setReveal, listenReveal } from '../chat/session.js';
import { showToast } from '../ui/toast.js';

export function PostChatScreen({ myUserId, sessionId, myProfile, onFindNew }) {
  let revealRequested = false;
  let revealUnsub = null;

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="justify-content:center;align-items:center;text-align:center;gap:28px;">

      <!-- Ended icon -->
      <div style="width:80px;height:80px;border-radius:50%;
        background:var(--bg-card-2);border:2px solid var(--border);
        display:flex;align-items:center;justify-content:center;font-size:32px;
        animation:fadeIn 0.4s var(--ease-out);">
        💬
      </div>

      <div style="animation:fadeUp 0.4s 0.1s var(--ease-out) both;">
        <h1 style="font-size:22px;font-weight:800;margin-bottom:8px;">Chat Ended</h1>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">
          That conversation is now gone. Every chat is a clean slate.
        </p>
      </div>

      <!-- Reveal card (initially hidden) -->
      <div id="reveal-card" style="display:none;width:100%;
        background:var(--bg-card);border:1px solid var(--border-glow);
        border-radius:var(--radius-lg);padding:var(--space-lg);
        animation:fadeUp 0.4s var(--ease-out);">
        <div style="font-size:22px;margin-bottom:8px;">🎉</div>
        <h2 style="font-size:17px;font-weight:700;margin-bottom:4px;" id="reveal-name">—</h2>
        <p style="font-size:13px;color:var(--text-muted);" id="reveal-meta">—</p>
      </div>

      <!-- Reveal waiting (my request sent) -->
      <div id="reveal-waiting" style="display:none;width:100%;
        background:var(--accent-dim);border:1px solid var(--border-glow);
        border-radius:var(--radius-md);padding:14px;
        animation:fadeUp 0.4s var(--ease-out);">
        <p style="font-size:13px;color:var(--accent-bright);">
          ⏳ Curiosity is building... waiting for them to agree!
        </p>
      </div>

      <!-- Partner reveal request -->
      <div id="partner-reveal-request" style="display:none;width:100%;
        background:var(--accent-dim);border:1px solid var(--border-glow);
        border-radius:var(--radius-md);padding:14px;
        animation:fadeUp 0.4s var(--ease-out);">
        <p style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">
          🎉 They want to reveal! Ready to see who you were talking to?
        </p>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" id="accept-reveal-btn" style="flex:1;">Yes, Reveal!</button>
          <button class="btn btn-ghost btn-sm" id="decline-reveal-btn" style="flex:1;">Stay Hidden</button>
        </div>
      </div>

      <!-- Actions -->
      <div style="width:100%;display:flex;flex-direction:column;gap:10px;
                  animation:fadeUp 0.4s 0.2s var(--ease-out) both;">

        <button class="btn btn-primary" id="find-new-btn">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
          Find New Chat
        </button>

        <button class="btn btn-ghost" id="reveal-btn">
          🕵️ Who was this?
        </button>
      </div>

      <p style="font-size:11px;color:var(--text-muted);">
        You only see their name if you <em>both</em> agree to reveal.
      </p>
    </div>
  `;

  const revealBtn         = el.querySelector('#reveal-btn');
  const revealWaiting     = el.querySelector('#reveal-waiting');
  const partnerReqDiv     = el.querySelector('#partner-reveal-request');
  const revealCard        = el.querySelector('#reveal-card');
  let partnerRevealedData = null;

  // Listen for reveal changes
  if (sessionId) {
    revealUnsub = listenReveal(sessionId, (data) => {
      const myFlag       = data[myUserId];
      const partnerEntries = Object.entries(data).filter(([uid]) => uid !== myUserId);
      const partnerFlag  = partnerEntries.length > 0 ? partnerEntries[0][1] : null;
      const partnerUid   = partnerEntries.length > 0 ? partnerEntries[0][0] : null;

      if (typeof partnerFlag === 'object' && partnerFlag !== null) {
        // Partner revealed their info
        partnerRevealedData = partnerFlag;
        if (myFlag === true) {
          showRevealCard(partnerRevealedData);
        } else {
          // Show partner reveal request
          partnerReqDiv.style.display = 'block';
        }
      }

      if (myFlag === true && partnerRevealedData) {
        showRevealCard(partnerRevealedData);
      }

      if (partnerFlag === 'declined') {
        showToast('They chose to stay anonymous.', '');
      }
    });
  }

  const showRevealCard = (data) => {
    revealCard.style.display = 'block';
    revealWaiting.style.display = 'none';
    partnerReqDiv.style.display = 'none';
    revealBtn.style.display = 'none';
    el.querySelector('#reveal-name').textContent = data.name || 'Anonymous';
    el.querySelector('#reveal-meta').textContent = `${data.branch} · ${data.yearLabel}`;
  };

  revealBtn.addEventListener('click', () => {
    if (revealRequested) return;
    revealRequested = true;
    revealBtn.disabled = true;
    revealBtn.textContent = 'Request sent…';
    revealWaiting.style.display = 'block';

    // Send own identity (without roll number to partner)
    const myRevealData = {
      name:      myProfile.displayName || 'UEC Student',
      branch:    myProfile.branch,
      yearLabel: myProfile.yearLabel,
    };
    setReveal(sessionId, myUserId, myRevealData);
  });

  el.querySelector('#accept-reveal-btn').addEventListener('click', () => {
    partnerReqDiv.style.display = 'none';
    revealRequested = true;
    const myRevealData = {
      name:      myProfile.displayName || 'UEC Student',
      branch:    myProfile.branch,
      yearLabel: myProfile.yearLabel,
    };
    setReveal(sessionId, myUserId, myRevealData);
    if (partnerRevealedData) showRevealCard(partnerRevealedData);
  });

  el.querySelector('#decline-reveal-btn').addEventListener('click', () => {
    partnerReqDiv.style.display = 'none';
    setReveal(sessionId, myUserId, 'declined');
    showToast('You chose to stay anonymous.', '');
  });

  el.querySelector('#find-new-btn').addEventListener('click', () => {
    if (revealUnsub) revealUnsub();
    onFindNew();
  });

  el._cleanup = () => { if (revealUnsub) revealUnsub(); };
  return el;
}
