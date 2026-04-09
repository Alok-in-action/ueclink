// ============================================================
// Chat Screen — Immersive full-screen real-time chat
// ============================================================

import {
  sendMessage, listenMessages, setTyping, listenTyping,
  listenSessionStatus, endSession, markDelivered,
} from '../chat/session.js';
import { submitReport } from '../reports/report.js';
import { showToast } from '../ui/toast.js';
import { showModal, hideModal } from '../ui/modal.js';

export function ChatScreen({ sessionId, myUserId, partnerYearLabel, onEnd }) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg-base);overflow:hidden;';

  el.innerHTML = `
    <!-- Header -->
    <div style="
      padding: calc(var(--safe-top) + 12px) var(--space-md) 12px;
      background: rgba(10, 10, 12, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px;
      z-index: 50;">

      <div style="width:38px; height:38px; border-radius:50%;
        background: var(--accent-dim); border: 2px solid var(--border-glow);
        display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
        👤
      </div>
      <div style="flex: 1;">
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Stranger</div>
        <div style="font-size: 11px; color: var(--success); display: flex; align-items: center; gap: 4px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block;"></span>
          ${partnerYearLabel || 'Verified Student'}
        </div>
      </div>
      
      <button id="end-chat-top" style="
        background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm);
        padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--danger); cursor: pointer;">
        End
      </button>

      <button id="report-btn" style="background:none; border:none; cursor:pointer; padding:6px; color:var(--text-muted);">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div id="messages-area" style="
      flex: 1; overflow-y: auto; padding: 20px 16px;
      display: flex; flex-direction: column; gap: 12px;
      overscroll-behavior: contain; -webkit-overflow-scrolling: touch;">
      
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
          Start of private conversation
        </p>
      </div>
    </div>

    <!-- Typing & Input -->
    <div id="bottom-container" style="
      background: var(--bg-base); border-top: 1px solid var(--border);
      padding: 12px 14px 24px; transition: padding 0.2s ease;">
      
      <div id="typing-slot" style="min-height: 20px; margin-bottom: 8px;"></div>

      <div style="display: flex; align-items: flex-end; gap: 10px;">
        <div style="flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 4px 16px; display: flex; align-items: flex-end;">
          <textarea id="msg-input" 
            placeholder="Type a message..." 
            style="flex: 1; background: none; border: none; outline: none; padding: 10px 0; max-height: 120px; font-size: 15px; color: var(--text-primary); resize: none;"></textarea>
        </div>
        <button id="send-btn" style="
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--accent); border: none; color: #fff;
          display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
          transition: transform 0.1s; -webkit-tap-highlight-color: transparent;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  const messagesArea   = el.querySelector('#messages-area');
  const msgInput       = el.querySelector('#msg-input');
  const sendBtn        = el.querySelector('#send-btn');
  const typingSlot     = el.querySelector('#typing-slot');
  const bottomContainer = el.querySelector('#bottom-container');

  let userScrolledUp = false;
  let typingTimer    = null;
  let cleanups       = [];
  let sessionEnded   = false;
  let seenKeys       = new Set();

  // --- Auto-scroll ---
  messagesArea.addEventListener('scroll', () => {
    const atBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < 60;
    userScrolledUp = !atBottom;
  });
  const scrollToBottom = (force = false) => {
    if (!userScrolledUp || force) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  };

  // --- Render messages ---
  const renderMessages = (msgs) => {
    msgs.forEach(msg => {
      if (seenKeys.has(msg.key)) {
        const tick = el.querySelector(`[data-key="${msg.key}"] .bubble-tick`);
        if (tick && msg.delivered) tick.classList.add('delivered');
        return;
      }
      seenKeys.add(msg.key);
      const isMine = msg.senderId === myUserId;

      const wrapper = document.createElement('div');
      wrapper.dataset.key = msg.key;
      wrapper.style.cssText = `display:flex; flex-direction:column; ${isMine ? 'align-items:flex-end;' : 'align-items:flex-start;'}`;

      wrapper.innerHTML = `
        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}" style="margin-bottom: 2px;">
          ${escapeHtml(msg.text)}
          ${isMine ? `<div class="bubble-tick ${msg.delivered ? 'delivered' : ''}" style="font-size: 10px; opacity: 0.6; text-align: right; margin-top: 4px;">✓✓</div>` : ''}
        </div>
      `;
      messagesArea.appendChild(wrapper);

      if (!isMine && msg.key && !msg.delivered) {
        markDelivered(sessionId, msg.key);
      }
    });
    scrollToBottom();
  };

  cleanups.push(listenMessages(sessionId, renderMessages));

  cleanups.push(listenTyping(sessionId, myUserId, (isTyping) => {
    typingSlot.innerHTML = isTyping 
      ? `<div style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">Stranger is typing...</div>` 
      : '';
    if (isTyping) scrollToBottom();
  }));

  cleanups.push(listenSessionStatus(sessionId, (status) => {
    if (status === 'ended' && !sessionEnded) {
      sessionEnded = true;
      showPartnerLeft();
    }
  }));

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
  msgInput.addEventListener('input', () => {
    msgInput.style.height = 'auto';
    msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
    setTyping(sessionId, myUserId, true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => setTyping(sessionId, myUserId, false), 1500);
  });

  el.querySelector('#end-chat-top').addEventListener('click', () => {
    if (confirm('End this conversation?')) doEndSession();
  });

  const doEndSession = async () => {
    if (sessionEnded) return;
    sessionEnded = true;
    cleanup();
    await endSession(sessionId);
    onEnd({ sessionId, partnerYearLabel });
  };

  const showPartnerLeft = () => {
    msgInput.disabled = true;
    sendBtn.style.opacity = '0.5';
    const banner = document.createElement('div');
    banner.style.cssText = `text-align:center; padding: 20px;`;
    banner.innerHTML = `<span style="font-size:12px; color:var(--text-muted);">Stranger has left the chat.</span>`;
    messagesArea.appendChild(banner);
    scrollToBottom(true);
    setTimeout(() => onEnd({ sessionId, partnerYearLabel }), 2000);
  };

  el.querySelector('#report-btn').addEventListener('click', () => {
    const reasons = ['Harassment', 'Spam', 'Inappropriate', 'Underage'];
    const content = `
      <div class="modal-handle"></div>
      <h2 style="font-size:18px; font-weight:700; margin-bottom:12px;">Report Stranger</h2>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${reasons.map(r => `<button class="btn btn-ghost report-reason" data-reason="${r}" style="justify-content:flex-start;">${r}</button>`).join('')}
      </div>
    `;
    showModal(content, (modalEl) => {
      modalEl.querySelectorAll('.report-reason').forEach(btn => {
        btn.addEventListener('click', async () => {
          hideModal();
          await submitReport(myUserId, 'partner', sessionId, btn.dataset.reason);
          showToast('User reported.', 'success');
        });
      });
    });
  });

  const cleanup = () => {
    cleanups.forEach(fn => fn());
    clearTimeout(typingTimer);
  };

  if (window.visualViewport) {
    const onResize = () => {
      const offset = window.innerHeight - window.visualViewport.height;
      bottomContainer.style.paddingBottom = `${Math.max(offset, 0) + 12}px`;
      scrollToBottom();
    };
    window.visualViewport.addEventListener('resize', onResize);
    cleanups.push(() => window.visualViewport.removeEventListener('resize', onResize));
  }

  el._cleanup = cleanup;
  return el;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
