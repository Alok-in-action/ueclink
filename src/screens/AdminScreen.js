// ============================================================
// Admin Screen — Real-time monitoring & moderation
// ============================================================

import { db, rtdb } from '../firebase.js';
import { ref, onValue, off, update, remove } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { NavHeader } from '../ui/NavHeader.js';
import { showToast } from '../ui/toast.js';

export function AdminScreen({ onBack }) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;background:var(--bg-base);';

  el.appendChild(NavHeader({
    title: 'Admin Dashboard',
    onBack,
  }));

  const main = document.createElement('div');
  main.style.cssText = 'flex:1;overflow-y:auto;padding:var(--space-md);display:flex;flex-direction:column;gap:24px;';
  
  main.innerHTML = `
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;">
      <div class="card" style="flex:1;min-width:140px;padding:16px;text-align:center;">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Active Chats</div>
        <div id="active-chats-count" style="font-size:24px;font-weight:800;color:var(--accent-bright);">0</div>
      </div>
    </div>

    <div>
      <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
        <span style="width:8px;height:8px;background:var(--success);border-radius:50%;box-shadow:0 0 8px var(--success);"></span>
        Live Sessions
      </h2>
      <div id="sessions-list" style="display:flex;flex-direction:column;gap:12px;">
        <div style="padding:40px;text-align:center;color:var(--text-muted);">Monitoring for streams...</div>
      </div>
    </div>

    <!-- Live Preview Overlay (hidden by default) -->
    <div id="chat-preview" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;
                  backdrop-filter:blur(8px);padding:var(--space-md);flex-direction:column;gap:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3 id="preview-title" style="font-size:16px;font-weight:700;">Chat Preview</h3>
        <button id="close-preview" class="btn btn-ghost btn-sm">Close</button>
      </div>
      <div id="preview-messages" style="flex:1;overflow-y:auto;background:rgba(255,255,255,0.05);
                   border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:8px;">
      </div>
    </div>
  `;
  el.appendChild(main);

  const sessionsList = el.querySelector('#sessions-list');
  const countEl      = el.querySelector('#active-chats-count');
  const chatPreview  = el.querySelector('#chat-preview');
  const previewMsgs  = el.querySelector('#preview-messages');
  const closePreview = el.querySelector('#close-preview');

  const nameCache = new Map();
  let currentPreviewSessionId = null;

  // --- Session Monitor ---
  const sessionsRef = ref(rtdb, 'sessions');
  const sessionUnsub = onValue(sessionsRef, async (snap) => {
    const data = snap.val() || {};
    const sessionIds = Object.keys(data);
    countEl.textContent = sessionIds.length;

    if (sessionIds.length === 0) {
      sessionsList.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);">No active matches right now.</div>`;
      return;
    }

    sessionsList.innerHTML = '';

    
    // Sort by createdAt descending
    const sorted = sessionIds.sort((a,b) => (data[b].createdAt || 0) - (data[a].createdAt || 0));

    for (const sid of sorted) {
      const sess = data[sid];
      const uids = Object.keys(sess.users || {});
      const userA = uids[0] || 'Unknown';
      const userB = uids[1] || 'Unknown';

      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:8px;border:1px solid var(--border);';
      
      const timeStr = sess.createdAt ? new Date(sess.createdAt).toLocaleTimeString() : 'Recent';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="font-size:14px;font-weight:500;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="color:var(--accent-bright);">●</span> <span class="name-label" data-uid="${userA}">${userA}</span>
            </div>
            <div style="margin:4px 0;opacity:0.3;font-size:10px;">MATCHED WITH</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="color:var(--accent-bright);">●</span> <span class="name-label" data-uid="${userB}">${userB}</span>
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);">${timeStr}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-primary btn-sm view-chat" data-sid="${sid}">Moderate Chat</button>
          <button class="btn btn-ghost btn-sm end-chat" data-sid="${sid}" style="color:var(--danger);">Kill Session</button>
        </div>
      `;

      card.querySelector('.view-chat').addEventListener('click', () => {
        const labels = card.querySelectorAll('.name-label');
        openPreview(sid, labels[0].textContent, labels[1].textContent);
      });
      card.querySelector('.end-chat').addEventListener('click', () => doEndSession(sid));

      sessionsList.appendChild(card);

      // Lazy resolve names in background
      resolveName(userA).then(name => {
        const label = card.querySelector(`[data-uid="${userA}"]`);
        if (label) label.textContent = name;
      });
      resolveName(userB).then(name => {
        const label = card.querySelector(`[data-uid="${userB}"]`);
        if (label) label.textContent = name;
      });
    }

  }, (err) => {
    console.error('[Admin] Database error:', err);
    sessionsList.innerHTML = `
      <div style="padding:40px;text-align:center;color:var(--danger);">
        <div style="font-size:32px;margin-bottom:12px;">🚫</div>
        <div style="font-weight:700;margin-bottom:4px;">Permission Denied</div>
        <div style="font-size:12px;opacity:0.7;">Please update your Realtime Database Security Rules in the Firebase Console to allow the admin read access.</div>
      </div>
    `;
  });

  async function resolveName(uid) {
    if (!uid || uid === 'Unknown') return uid;
    if (nameCache.has(uid)) return nameCache.get(uid);
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const name = snap.exists() ? (snap.data().displayName || uid) : uid;
      nameCache.set(uid, name);
      return name;
    } catch (_) { return uid; }
  }

  // --- Moderation ---
  let msgsUnsub = null;
  function openPreview(sid, nameA, nameB) {
    if (msgsUnsub) msgsUnsub();
    currentPreviewSessionId = sid;
    chatPreview.style.display = 'flex';
    previewMsgs.innerHTML = '<div style="color:var(--text-muted);">Loading conversation...</div>';
    el.querySelector('#preview-title').textContent = `Moderating: ${nameA} & ${nameB}`;

    const msgRef = ref(rtdb, `sessions/${sid}/messages`);
    msgsUnsub = onValue(msgRef, (snap) => {
      const msgs = snap.val() || {};
      previewMsgs.innerHTML = '';
      Object.keys(msgs).forEach(mid => {
        const m = msgs[mid];
        const row = document.createElement('div');
        const sname = m.senderId === Object.keys(msgs)[0] ? 'User A' : 'User B'; // Precise mapping needs users list
        row.style.cssText = 'padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:var(--radius-sm);font-size:13px;';
        row.innerHTML = `<span style="font-size:10px;color:var(--accent-bright);font-weight:700;margin-right:8px;">${sname}:</span> ${m.text}`;
        previewMsgs.appendChild(row);
      });
      previewMsgs.scrollTo(0, previewMsgs.scrollHeight);
    });
  }

  async function doEndSession(sid) {
    if (!confirm('Kill this session immediately?')) return;
    try {
      await update(ref(rtdb, `sessions/${sid}`), { status: 'ended' });
      await remove(ref(rtdb, `sessions/${sid}`)); // Full delete
      showToast('Session terminated.', 'success');
    } catch (err) {
      showToast('Failed to end session.', 'error');
    }
  }

  closePreview.onclick = () => {
    if (msgsUnsub) msgsUnsub();
    chatPreview.style.display = 'none';
  };

  el._cleanup = () => {
    if (sessionUnsub) off(sessionsRef);
    if (msgsUnsub) msgsUnsub();
  };

  return el;
}
