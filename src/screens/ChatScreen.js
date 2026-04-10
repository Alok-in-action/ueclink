// ============================================================
// Chat Screen — Optimized for Perfect Keyboard Stability
// & Dynamic Curiosity-Driven Headers
// ============================================================

import {
  sendMessage, listenMessages, setTyping, listenTyping,
  listenSessionStatus, endSession, markDelivered,
} from '../chat/session.js';
import { submitReport } from '../reports/report.js';
import { showToast } from '../ui/toast.js';
import { showModal, hideModal } from '../ui/modal.js';

const HEADER_VARIATIONS = [
  "someone from your college 👀",
  "you might know them…",
  "you’ve seen them before 👀",
  "same campus, different story",
  "they’re closer than you think",
  "maybe from your class… 👀",
  "same building maybe…",
  "you crossed paths today",
  "what if it’s your classmate…",
  "a familiar stranger 👀",
  "someone from your circle…",
  "you might guess who this is",
  "just one chat away…",
  "someone interesting is here 👀",
  "this could get interesting…",
  "a random… but not really",
  "you might regret skipping this 👀",
  "someone is waiting for you…",
  "this chat might surprise you 👀",
  "not as random as you think",
];

export function ChatScreen({ sessionId, myUserId, partnerId, partnerYearLabel, onEnd }) {

  const el = document.createElement('div');
  el.className = 'screen';
  el.style.cssText = 'height:100dvh; display:flex; flex-direction:column; overflow:hidden; position:relative;';

  // State
  let sessionEnded = false;
  let seenKeys    = new Set();
  let typingTimer = null;
  let cleanups    = [];

  // Random initial header index
  let headerIdx = Math.floor(Math.random() * HEADER_VARIATIONS.length);

  el.innerHTML = `
    <div id="chat-container" style="display:flex;flex-direction:column;height:100%;width:100%;position:relative;overflow:hidden;">
      <div class="gradient-bg"></div>

      <!-- Mysterious Header -->
      <div class="chat-header" id="chat-header">
        <div style="position:relative;">
          <div style="width:42px;height:42px;border-radius:50%;
            background:var(--bg-card-2);border:1.5px solid var(--border-glow);
            display:flex;align-items:center;justify-content:center;font-size:20px;
            box-shadow: 0 0 15px var(--accent-glow);">
            👤
          </div>
          <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;
            background:var(--success);border:2px solid var(--bg-card);border-radius:50%;
            box-shadow:0 0 8px var(--success);"></div>
        </div>
        
        <div style="flex:1;">
          <div id="header-dynamic-text" style="font-size:15px;font-weight:700;color:var(--text-primary);transition:opacity 0.5s ease;">
            ${HEADER_VARIATIONS[headerIdx]}
          </div>
          <div class="chat-hint">
            ● Online now <span style="margin:0 4px;opacity:0.4;">·</span> stay curious 👀
          </div>
        </div>

        <button id="report-btn" style="background:none;border:none;cursor:pointer;padding:8px;
          color:var(--text-muted);border-radius:var(--radius-sm);">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </button>
      </div>

      <!-- Messages Area -->
      <div id="messages-area" style="flex:1;overflow-y:auto;padding:20px 16px;
        display:flex;flex-direction:column;gap:12px;overscroll-behavior:none;
        -webkit-overflow-scrolling:touch;z-index:1;">
        
        <div style="text-align:center;margin:10px 0 24px;">
          <div style="display:inline-block;max-width:280px;background:rgba(26,26,46,0.6);
            backdrop-filter:blur(4px);border:1px solid var(--border);
            padding:12px 18px;border-radius:var(--radius-lg);">
            <p style="font-size:13px;color:var(--text-primary);line-height:1.5;margin-bottom:4px;">
              ✨ You both are ${partnerYearLabel || 'matching'}.
            </p>
            <p style="font-size:12px;color:var(--text-secondary);">
              Try asking about internals 😄
            </p>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div id="typing-slot" style="padding:0 16px 8px;min-height:36px;z-index:2;"></div>

      <!-- Footer -->
      <div class="chat-footer" id="chat-footer">
        <div style="display:flex;gap:12px;padding:8px 16px 4px;opacity:0.7;">
          <button id="skip-btn" style="background:none;border:none;color:var(--text-secondary);
            font-size:12px;font-weight:600;padding:4px 8px;cursor:pointer;
            display:flex;align-items:center;gap:4px;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8.25V18a2.25 2.25 0 002.25 2.25H15m-10.5-15h10.5a2.25 2.25 0 012.25 2.25v6.75" />
            </svg>
            Skip
          </button>
          <div style="flex:1;"></div>
          <button id="end-btn" style="background:none;border:none;color:var(--danger);
            font-size:12px;font-weight:600;padding:4px 8px;cursor:pointer;">
            End Chat
          </button>
        </div>

        <div class="input-bar" style="padding-bottom:12px;">
          <textarea class="input-field" id="msg-input" rows="1"
            placeholder="Type a message..." style="min-height:48px;"></textarea>
          <button class="send-btn" id="send-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const chatContainer = el.querySelector('#chat-container');
  const messagesArea  = el.querySelector('#messages-area');
  const msgInput      = el.querySelector('#msg-input');
  const sendBtn       = el.querySelector('#send-btn');
  const typingSlot    = el.querySelector('#typing-slot');
  const headerText    = el.querySelector('#header-dynamic-text');

  let userScrolledUp = false;

  // --- Header Rotation Logic ---
  const rotateHeader = () => {
    headerText.style.opacity = '0';
    setTimeout(() => {
      headerIdx = (headerIdx + 1) % HEADER_VARIATIONS.length;
      headerText.textContent = HEADER_VARIATIONS[headerIdx];
      headerText.style.opacity = '1';
    }, 500);
  };
  const headerTimer = setInterval(rotateHeader, 6500);
  cleanups.push(() => clearInterval(headerTimer));

  // --- Scroll Logic ---
  const scrollToBottom = (behavior = 'smooth') => {
    if (!userScrolledUp) {
      messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior });
    }
  };

  messagesArea.addEventListener('scroll', () => {
    const atBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < 120;
    userScrolledUp = !atBottom;
  });

  // --- Message Rendering ---
  const renderMessages = (msgs) => {
    msgs.forEach(msg => {
      const isMine = msg.senderId === myUserId;

      if (seenKeys.has(msg.key)) {
        // Update existing bubble if status changed (e.g., delivered)
        const bubble = messagesArea.querySelector(`[data-key="${msg.key}"]`);
        if (bubble) {
          const tick = bubble.querySelector('.bubble-tick');
          if (tick && msg.delivered) tick.classList.add('delivered');
        }
        return;
      }

      seenKeys.add(msg.key);

      const wrapper = document.createElement('div');
      wrapper.dataset.key = msg.key;
      wrapper.style.cssText = `display:flex;flex-direction:column;${isMine ? 'align-items:flex-end;' : 'align-items:flex-start;'}`;

      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

      wrapper.innerHTML = `
        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
          ${escapeHtml(msg.text)}
          <div class="bubble-meta">
            <span class="bubble-time">${time}</span>
            ${isMine ? `<span class="bubble-tick ${msg.delivered ? 'delivered' : ''}">✓✓</span>` : ''}
          </div>
        </div>
      `;
      messagesArea.appendChild(wrapper);

      // Auto-mark as delivered if it's from the partner and not yet delivered
      if (!isMine && !msg.delivered) {
        markDelivered(sessionId, msg.key);
      }
    });
    scrollToBottom();
  };


  // --- Viewport / Keyboard Sync ---
  const handleViewportChange = () => {
    if (!window.visualViewport) return;
    const vh = window.visualViewport.height;
    chatContainer.style.height = `${vh}px`;
    window.scrollTo(0, 0);
    scrollToBottom('auto');
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    handleViewportChange();
    cleanups.push(() => {
      window.visualViewport.removeEventListener('resize', handleViewportChange);
      window.visualViewport.removeEventListener('scroll', handleViewportChange);
    });
  }

  // Body Scroll Lock
  document.body.classList.add('chat-active');
  cleanups.push(() => document.body.classList.remove('chat-active'));

  // --- Real-time Logic ---
  cleanups.push(listenMessages(sessionId, renderMessages));
  
  cleanups.push(listenTyping(sessionId, myUserId, (isPartnerTyping) => {
    typingSlot.innerHTML = isPartnerTyping
      ? `<div class="typing-indicator" style="margin-left:12px;">
           <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
         </div>`
      : '';
  }));


  cleanups.push(listenSessionStatus(sessionId, (status) => {
    if (status === 'ended' && !sessionEnded) {
      sessionEnded = true;
      showPartnerLeft();
    }
  }));

  // --- Handlers ---
  const doSend = async () => {
    const text = msgInput.value.trim();
    if (!text || sessionEnded) return;
    msgInput.value = '';
    msgInput.style.height = 'auto';
    setTyping(sessionId, myUserId, false);
    msgInput.focus();
    await sendMessage(sessionId, myUserId, text);
    scrollToBottom('smooth');
  };

  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    doSend();
  });

  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  msgInput.addEventListener('input', () => {
    msgInput.style.height = 'auto';
    msgInput.style.height = Math.min(msgInput.scrollHeight, 140) + 'px';
    setTyping(sessionId, myUserId, true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => setTyping(sessionId, myUserId, false), 1500);
  });

  el.querySelector('#skip-btn').addEventListener('click', () => doEndSession(true));
  el.querySelector('#end-btn').addEventListener('click', () => doEndSession(false));
  el.querySelector('#report-btn').addEventListener('click', () => showReportModal());

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
    banner.style.cssText = 'text-align:center;margin:16px 0;animation:fadeIn 0.4s;';
    banner.innerHTML = `
      <span style="font-size:12px;color:var(--text-muted);background:var(--bg-card);
        padding:8px 16px;border-radius:var(--radius-full);border:1px solid var(--border);">
        Stranger has left the conversation.
      </span>`;
    messagesArea.appendChild(banner);
    scrollToBottom('auto');
    setTimeout(() => onEnd({ sessionId, partnerYearLabel }), 2500);
  };

  const showReportModal = () => {
    const reasons = ['Spam / Ads', 'Harassment', 'Explicit Content', 'Other'];
    const content = `
      <div class="modal-handle"></div>
      <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">Report User</h2>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
        ${reasons.map(r => `<button class="btn btn-ghost btn-sm report-reason" data-reason="${r}">${r}</button>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" id="cancel-report" style="margin-top:16px;border:none;">Cancel</button>
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

  el._cleanup = cleanup;
  return el;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
