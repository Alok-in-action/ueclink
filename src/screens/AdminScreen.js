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
    <div style="padding:0 4px; margin-bottom:12px;">
      <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; background:linear-gradient(135deg, var(--bg-card-2) 0%, #1e1b4b 100%); border:1px solid var(--accent-glow); box-shadow:0 8px 32px rgba(0,0,0,0.4);">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px; font-weight:700;">Live Community Pulse</div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div id="active-chats-count" style="font-size:42px; font-weight:900; color:var(--accent-bright); line-height:1; text-shadow:0 0 20px var(--accent-glow);">0</div>
          <div style="text-align:left;">
            <div style="font-size:16px; font-weight:700; color:var(--text-primary);">Total Sessions</div>
            <div style="font-size:12px; color:var(--success); border-top:1px solid rgba(255,255,255,0.05); margin-top:4px; padding-top:4px;">● Live Monitoring</div>
          </div>
        </div>
      </div>
    </div>

    <div id="active-section">
      <h2 style="font-size:15px; font-weight:700; margin:0 0 12px 4px; display:flex; align-items:center; gap:8px; color:var(--success);">
        <span style="width:8px;height:8px;background:var(--success);border-radius:50%;box-shadow:0 0 8px var(--success);"></span>
        Currently Live
      </h2>
      <div id="active-sessions-list" style="display:flex; flex-direction:column; gap:12px;">
        <div style="padding:30px; text-align:center; color:var(--text-muted); font-size:13px;">No active matches right now.</div>
      </div>
    </div>

    <div id="ended-section" style="margin-top:8px;">
      <h2 style="font-size:15px; font-weight:700; margin:0 0 12px 4px; display:flex; align-items:center; gap:8px; opacity:0.6;">
        <span style="width:8px;height:8px;background:var(--text-muted);border-radius:50%;"></span>
        Recently Ended
      </h2>
      <div id="ended-sessions-list" style="display:flex; flex-direction:column; gap:12px;">
        <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px; opacity:0.6;">No ended sessions in view.</div>
      </div>
    </div>
  `;

  // Live Preview Overlay
  const chatPreview = document.createElement('div');
  chatPreview.id = 'chat-preview';
  chatPreview.style.cssText = 'display:none; position:fixed; top:120px; left:0; right:0; bottom:0; background:rgba(0,0,0,0.95); z-index:1000; backdrop-filter:blur(12px); padding:var(--space-md); flex-direction:column; gap:16px; border-top:1px solid var(--accent-glow);';
  chatPreview.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3 id="preview-title" style="font-size:16px; font-weight:700;">Chat Preview</h3>
      <button id="close-preview" class="btn btn-ghost btn-sm">Close</button>
    </div>
    <div id="preview-messages" style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.05); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; gap:8px;">
    </div>
  `;
  el.appendChild(main);
  el.appendChild(chatPreview);

  const activeList   = el.querySelector('#active-sessions-list');
  const endedList    = el.querySelector('#ended-sessions-list');
  const countEl      = el.querySelector('#active-chats-count');
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

    activeList.innerHTML = '';
    endedList.innerHTML = '';

    if (sessionIds.length === 0) {
      activeList.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:13px;">No active matches right now.</div>`;
      return;
    }

    // Sort by createdAt descending
    const sorted = sessionIds.sort((a,b) => (data[b].createdAt || 0) - (data[a].createdAt || 0));

    let activeCount = 0;
    let endedCount = 0;

    for (const sid of sorted) {
      const sess = data[sid];
      const isEnded = sess.status === 'ended';
      
      const card = createSessionCard(sid, sess, isEnded);
      if (isEnded) {
        endedList.appendChild(card);
        endedCount++;
      } else {
        activeList.appendChild(card);
        activeCount++;
      }
    }

    if (activeCount === 0) activeList.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:13px;">No active matches right now.</div>`;
    if (endedCount === 0) endedList.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px; opacity:0.6;">No ended sessions in view.</div>`;

  }, (err) => {
    console.error('[Admin] Database error:', err);
    activeList.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger);">Permission Denied</div>`;
  });

  function createSessionCard(sid, sess, isEnded) {
    const uids = Object.keys(sess.users || {});
    const userA = uids[0] || 'Unknown';
    const userB = uids[1] || 'Unknown';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = `padding:14px; display:flex; flex-direction:column; gap:8px; border:1px solid var(--border); transition:opacity 0.3s; ${isEnded ? 'opacity:0.6; background:rgba(255,255,255,0.02);' : ''}`;
    
    const timeStr = sess.createdAt ? new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="font-size:13px; font-weight:500;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:${isEnded ? 'var(--text-muted)' : 'var(--accent-bright)'}; font-size:8px;">●</span>
            <span class="name-label" data-uid="${userA}">${userA}</span>
          </div>
          <div style="margin:4px 0; opacity:0.3; font-size:9px;">MATCHED WITH</div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:${isEnded ? 'var(--text-muted)' : 'var(--accent-bright)'}; font-size:8px;">●</span>
            <span class="name-label" data-uid="${userB}">${userB}</span>
          </div>
        </div>
        <div style="font-size:10px; color:var(--text-muted);">${timeStr}</div>
      </div>
      <div style="display:flex; gap:8px; margin-top:4px;">
        <button class="btn btn-primary btn-sm view-chat" data-sid="${sid}" style="min-height:36px; padding:0 12px; font-size:12px;">Moderate</button>
        ${!isEnded ? `<button class="btn btn-ghost btn-sm end-chat" data-sid="${sid}" style="min-height:36px; padding:0 12px; font-size:12px; color:var(--danger); border-color:rgba(255,77,109,0.2);">Kill</button>` : ''}
      </div>
    `;

    card.querySelector('.view-chat').addEventListener('click', () => {
      const labels = card.querySelectorAll('.name-label');
      openPreview(sid, labels[0].textContent, labels[1].textContent);
    });
    
    const killBtn = card.querySelector('.end-chat');
    if (killBtn) killBtn.addEventListener('click', () => doEndSession(sid));

    // Lazy resolve names
    resolveName(userA).then(name => {
      const label = card.querySelector(`[data-uid="${userA}"]`);
      if (label) label.textContent = name;
    });
    resolveName(userB).then(name => {
      const label = card.querySelector(`[data-uid="${userB}"]`);
      if (label) label.textContent = name;
    });

    return card;
  }

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
    el.querySelector('#preview-title').textContent = `Peeking: ${nameA} & ${nameB}`;

    const msgRef = ref(rtdb, `sessions/${sid}/messages`);
    msgsUnsub = onValue(msgRef, (snap) => {
      const msgs = snap.val() || {};
      previewMsgs.innerHTML = '';
      Object.keys(msgs).forEach(mid => {
        const m = msgs[mid];
        const row = document.createElement('div');
        const sname = m.senderId === Object.keys(msgs)[0] ? 'A' : 'B';
        row.style.cssText = 'padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); font-size:12px;';
        row.innerHTML = `<span style="font-size:9px; color:var(--accent-bright); font-weight:700; margin-right:6px;">USER ${sname}:</span> ${escapeHtml(m.text)}`;
        previewMsgs.appendChild(row);
      });
      previewMsgs.scrollTo(0, previewMsgs.scrollHeight);
    });
  }

  async function doEndSession(sid) {
    if (!confirm('Abort this conversation immediately?')) return;
    try {
      await update(ref(rtdb, `sessions/${sid}`), { status: 'ended' });
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

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
