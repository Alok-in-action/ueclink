// ============================================================
// Chat Screen — full real-time chat interface
// ============================================================

import {
  sendMessage, listenMessages, setTyping, listenTyping,
  listenSessionStatus, endSession, markDelivered,
  setReveal, listenReveal,
} from '../chat/session.js';
import { submitReport } from '../reports/report.js';
import { showToast } from '../ui/toast.js';
import { showModal, hideModal } from '../ui/modal.js';

export function ChatScreen({ sessionId, myUserId, partnerYearLabel, onEnd }) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--bg-base);">

      <!-- Header -->
      <div style="
        padding: calc(var(--safe-top) + 14px) var(--space-md) 14px;
        background:var(--bg-card);
        border-bottom:1px solid var(--border);
        display:flex;align-items:center;gap:12px;
        position:sticky;top:0;z-index:10;">

        <div style="width:40px;height:40px;border-radius:50%;
          background:var(--accent-dim);border:2px solid var(--border-glow);
          display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
          👤
        </div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;">Stranger</div>
          <div style="font-size:12px;color:var(--success);">● Connected · ${partnerYearLabel || 'UEC Student'}</div>
        </div>
        <button id="report-btn" style="background:none;border:none;cursor:pointer;padding:6px;
          color:var(--text-muted);border-radius:var(--radius-sm);transition:color 0.15s;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div id="messages-area" style="flex:1;overflow-y:auto;padding:16px 12px;
        display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;">
        <!-- intro tip -->
        <div style="text-align:center;margin:8px 0 16px;">
          <span style="font-size:12px;color:var(--text-muted);
            background:var(--bg-card);padding:6px 14px;border-radius:var(--radius-full);
            border:1px solid var(--border);">
            You're anonymously connected. Say hi! 👋
          </span>
        </div>
      </div>

      <!-- Typing indicator slot -->
      <div id="typing-slot" style="padding:0 12px 4px;min-height:32px;"></div>

      <!-- Action bar -->
      <div style="display:flex;gap:8px;padding:8px 12px 0;border-top:1px solid var(--border);
        background:var(--bg-base);">
        <button class="btn btn-ghost btn-sm" id="skip-btn" style="flex:1;min-height:38px;font-size:13px;">
          Skip
        </button>
        <button class="btn btn-danger btn-sm" id="end-btn" style="flex:1;min-height:38px;font-size:13px;">
          End Chat
        </button>
      </div>

      <!-- Input bar -->
      <div class="input-bar" id="input-bar">
        <textarea class="input-field" id="msg-input" rows="1"
          placeholder="Type a message…" style="min-height:44px;"></textarea>
        <button class="send-btn" id="send-btn">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  const messagesArea = el.querySelector('#messages-area');
  const msgInput     = el.querySelector('#msg-input');
  const sendBtn      = el.querySelector('#send-btn');
  const typingSlot   = el.querySelector('#typing-slot');
  const inputBar     = el.querySelector('#input-bar');

  let userScrolledUp = false;
  let typingTimer    = null;
  let cleanups       = [];
  let sessionEnded   = false;
  let seenKeys       = new Set();

  // --- Auto-scroll logic ---
  messagesArea.addEventListener('scroll', () => {
    const atBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < 60;
    userScrolledUp = !atBottom;
  });
  const scrollToBottom = (force = false) => {
    if (!userScrolledUp || force) {
      messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
    }
  };

  // --- Render messages ---
  const renderMessages = (msgs) => {
    msgs.forEach(msg => {
      if (seenKeys.has(msg.key)) {
        // Update delivery ticks if already rendered
        const tick = el.querySelector(`[data-key="${msg.key}"] .bubble-tick`);
        if (tick && msg.delivered) tick.classList.add('delivered');
        return;
      }
      seenKeys.add(msg.key);
      const isMine = msg.senderId === myUserId;

      const wrapper = document.createElement('div');
      wrapper.dataset.key = msg.key;
      wrapper.style.cssText = `display:flex;flex-direction:column;${isMine ? 'align-items:flex-end;' : 'align-items:flex-start;'}`;

      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

      wrapper.innerHTML = `
        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
          ${escapeHtml(msg.text)}
          ${isMine ? `
            <div class="bubble-meta">
              <span class="bubble-time">${time}</span>
              <span class="bubble-tick ${msg.delivered ? 'delivered' : ''}">✓✓</span>
            </div>
          ` : `<div class="bubble-meta"><span class="bubble-time" style="color:var(--text-muted);">${time}</span></div>`}
        </div>
      `;
      messagesArea.appendChild(wrapper);

      // Mark as delivered if it's from partner
      if (!isMine && msg.key && !msg.delivered) {
        markDelivered(sessionId, msg.key);
      }
    });
    scrollToBottom();
  };

  // --- Listen messages ---
  cleanups.push(listenMessages(sessionId, renderMessages));

  // --- Listen typing ---
  cleanups.push(listenTyping(sessionId, myUserId, (isTyping) => {
    typingSlot.innerHTML = isTyping
      ? `<div class="typing-indicator" style="margin-left:12px;">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>`
      : '';
  }));

  // --- Listen session status ---
  cleanups.push(listenSessionStatus(sessionId, (status) => {
    if (status === 'ended' && !sessionEnded) {
      sessionEnded = true;
      showPartnerLeft();
    }
  }));

  // --- Send message ---
  const doSend = async () => {
    const text = msgInput.value.trim();
    if (!text || sessionEnded) return;
    msgInput.value = '';
    msgInput.style.height = 'auto';
    setTyping(sessionId, myUserId, false);
    await sendMessage(sessionId, myUserId, text);
    try { navigator.vibrate(10); } catch (_) {}
  };

  sendBtn.addEventListener('click', doSend);
  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });

  // --- Typing indicator ---
  msgInput.addEventListener('input', () => {
    // Auto-grow
    msgInput.style.height = 'auto';
    msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';

    setTyping(sessionId, myUserId, true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => setTyping(sessionId, myUserId, false), 1500);
  });

  // --- Skip ---
  el.querySelector('#skip-btn').addEventListener('click', () => {
    doEndSession(true);
  });

  // --- End Chat ---
  el.querySelector('#end-btn').addEventListener('click', () => {
    doEndSession(false);
  });

  // --- Report ---
  el.querySelector('#report-btn').addEventListener('click', () => {
    showReportModal();
  });

  const doEndSession = async (isSkip) => {
    if (sessionEnded) return;
    sessionEnded = true;
    cleanup();
    await endSession(sessionId);
    onEnd({ sessionId, partnerYearLabel });
  };

  const showPartnerLeft = () => {
    msgInput.disabled = true;
    sendBtn.disabled = true;
    const banner = document.createElement('div');
    banner.style.cssText = `text-align:center;padding:10px;`;
    banner.innerHTML = `
      <span style="font-size:13px;color:var(--text-muted);
        background:var(--bg-card);padding:6px 14px;border-radius:var(--radius-full);
        border:1px solid var(--border);">
        Stranger has left the chat.
      </span>`;
    messagesArea.appendChild(banner);
    scrollToBottom(true);

    // Show end options
    setTimeout(() => onEnd({ sessionId, partnerYearLabel }), 2500);
  };

  const showReportModal = () => {
    const reasons = ['Spam', 'Inappropriate Content', 'Harassment', 'Other'];
    const content = `
      <div class="modal-handle"></div>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:6px;">Report User</h2>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-lg);">
        Select a reason for the report:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${reasons.map(r => `
          <button class="btn btn-ghost btn-sm report-reason" data-reason="${r}"
            style="justify-content:flex-start;border-radius:var(--radius-md);">${r}</button>
        `).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" id="cancel-report" style="margin-top:12px;">Cancel</button>
    `;
    showModal(content, (modalEl) => {
      modalEl.querySelectorAll('.report-reason').forEach(btn => {
        btn.addEventListener('click', async () => {
          hideModal();
          await submitReport(myUserId, 'partner', sessionId, btn.dataset.reason);
          showToast('Report submitted. Thank you.', 'success');
        });
      });
      modalEl.querySelector('#cancel-report').addEventListener('click', hideModal);
    });
  };

  const cleanup = () => {
    cleanups.forEach(fn => fn());
    clearTimeout(typingTimer);
    setTyping(sessionId, myUserId, false);
  };

  // Keyboard viewport fix for mobile
  if (window.visualViewport) {
    const onResize = () => {
      const offset = window.innerHeight - window.visualViewport.height;
      inputBar.style.paddingBottom = `${Math.max(offset, 0) + 16}px`;
      scrollToBottom();
    };
    window.visualViewport.addEventListener('resize', onResize);
    cleanups.push(() => window.visualViewport.removeEventListener('resize', onResize));
  }

  el._cleanup = cleanup;
  return el;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
