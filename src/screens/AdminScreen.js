// ============================================================
// Admin Screen — Real-time monitoring, moderation & maintenance
// ============================================================

import { db, rtdb } from '../firebase.js';
import { ref, onValue, off, update, remove, get } from 'firebase/database';
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
  main.style.cssText = 'flex:1;overflow-y:auto;padding:var(--space-md);display:flex;flex-direction:column;gap:32px;';
  
  main.innerHTML = `
    <!-- Top Stats Card -->
    <div style="padding:0 4px; margin-bottom:12px;">
      <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; background:linear-gradient(135deg, var(--bg-card-2) 0%, #1e1b4b 100%); border:1px solid var(--accent-glow); box-shadow:0 8px 32px rgba(0,0,0,0.4); position:relative; overflow:hidden;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:8px; font-weight:700;">Live Community Pulse</div>
        <div style="display:flex; align-items:center; gap:24px;">
          <div style="text-align:center;">
            <div id="active-chats-count" style="font-size:42px; font-weight:900; color:var(--accent-bright); line-height:1; text-shadow:0 0 20px var(--accent-glow);">0</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Active Chats</div>
          </div>
          <div style="width:1px; height:40px; background:rgba(255,255,255,0.1);"></div>
          <div style="text-align:center;">
             <div id="online-users-count" style="font-size:42px; font-weight:900; color:var(--success); line-height:1; text-shadow:0 0 20px rgba(34,211,160,0.3);">0</div>
             <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Users Online</div>
          </div>
        </div>
        
        <button id="purge-btn" class="btn btn-ghost btn-sm" style="margin-top:20px; min-height:32px; font-size:11px; color:var(--text-muted); border-color:rgba(255,255,255,0.1); width:auto; padding:0 16px;">
          🛡️ Purge 24h+ Old Data
        </button>
      </div>
    </div>

    <!-- Analytics Section -->
    <div id="analytics-section">
      <h2 style="font-size:15px; font-weight:700; margin:0 0 16px 4px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">📊</span> Community Insights
      </h2>
      <div class="card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; color:var(--text-muted);">Branch Popularity</span>
          <div id="branch-stats" style="font-size:12px; font-weight:600; color:var(--accent-bright); text-align:right;">Loading...</div>
        </div>
        <div style="height:1px; background:rgba(255,255,255,0.05);"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; color:var(--text-muted);">Golden Activity Hours</span>
          <div id="peak-hours" style="font-size:12px; font-weight:600; color:var(--text-primary);">Analysing timeframes...</div>
        </div>
      </div>
    </div>

    <!-- Live Radar (Who's Online) -->
    <div id="radar-section">
       <h2 style="font-size:15px; font-weight:700; margin:0 0 16px 4px; display:flex; align-items:center; gap:8px; color:var(--success);">
        <span style="width:8px;height:8px;background:var(--success);border-radius:50%;box-shadow:0 0 8px var(--success);"></span>
        Who's Online (Radar)
      </h2>
      <div id="online-users-list" style="display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; scroll-snap-type:x mandatory;">
        <div style="padding:16px; color:var(--text-muted); font-size:12px;">Scanning for live users...</div>
      </div>
    </div>

    <!-- Sessions Section -->
    <div id="active-section">
      <h2 style="font-size:15px; font-weight:700; margin:0 0 16px 4px; display:flex; align-items:center; gap:8px; color:var(--success);">
        <span style="width:8px;height:8px;background:var(--success);border-radius:50%;box-shadow:0 0 8px var(--success);"></span>
        Currently Live <span id="active-count-badge" style="opacity:0.6; font-weight:400; font-size:14px;">(0)</span>
      </h2>
      <div id="active-sessions-list" style="display:flex; flex-direction:column; gap:12px;">
        <div style="padding:30px; text-align:center; color:var(--text-muted); font-size:13px;">No active matches right now.</div>
      </div>
    </div>

    <div id="ended-section" style="margin-top:8px; opacity:0.8;">
      <h2 style="font-size:14px; font-weight:600; margin:0 0 12px 4px; display:flex; align-items:center; gap:8px; opacity:0.6;">
        <span style="width:6px;height:6px;background:var(--text-muted);border-radius:50%;"></span>
        Recently Ended <span id="ended-count-badge" style="opacity:0.6; font-weight:400; font-size:13px;">(0)</span>
      </h2>
      <div id="ended-sessions-list" style="display:flex; flex-direction:column; gap:12px;">
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
  const onlineList   = el.querySelector('#online-users-list');
  const countEl      = el.querySelector('#active-chats-count');
  const onlineCountEl = el.querySelector('#online-users-count');
  const branchStatsEl = el.querySelector('#branch-stats');
  const peakHoursEl   = el.querySelector('#peak-hours');
  const purgeBtn     = el.querySelector('#purge-btn');

  const nameCache = new Map();
  let currentPreviewSessionId = null;

  // --- Session Monitor ---
  const sessionsRef = ref(rtdb, 'sessions');
  const sessionUnsub = onValue(sessionsRef, (snap) => {
    const data = snap.val() || {};
    const sessionIds = Object.keys(data);
    
    activeList.innerHTML = '';
    endedList.innerHTML = '';

    if (sessionIds.length === 0) {
      countEl.textContent = '0';
      activeList.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:13px;">No active matches right now.</div>`;
      el.querySelector('#active-count-badge').textContent = ' (0)';
      el.querySelector('#ended-count-badge').textContent = ' (0)';
      peakHoursEl.textContent = 'Insufficient data';
      return;
    }

    const sorted = sessionIds.sort((a,b) => (data[b].createdAt || 0) - (data[a].createdAt || 0));

    let activeCount = 0;
    let endedCount = 0;
    const hourTally = {};

    for (const sid of sorted) {
      const sess = data[sid];
      const isEnded = sess.status === 'ended';
      
      // Calculate Peak Hours
      if (sess.createdAt) {
        const hour = new Date(sess.createdAt).getHours();
        hourTally[hour] = (hourTally[hour] || 0) + 1;
      }

      const card = createSessionCard(sid, sess, isEnded);
      if (isEnded) {
        endedList.appendChild(card);
        endedCount++;
      } else {
        activeList.appendChild(card);
        activeCount++;
      }
    }

    countEl.textContent = activeCount;
    el.querySelector('#active-count-badge').textContent = ` (${activeCount})`;
    el.querySelector('#ended-count-badge').textContent = ` (${endedCount})`;

    // Process Peak Hour
    const peakHour = Object.entries(hourTally).sort((a,b) => b[1] - a[1])[0];
    if (peakHour) {
      const h = parseInt(peakHour[0]);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      peakHoursEl.textContent = `${displayHour}${ampm} - ${displayHour + 1}${ampm} is your peak time`;
    }

    if (activeCount === 0) activeList.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:13px;">No active matches right now.</div>`;
  });

  // --- Online Presence Radar ---
  const presenceRef = ref(rtdb, 'presence');
  const presenceUnsub = onValue(presenceRef, (snap) => {
    const data = snap.val() || {};
    const uids = Object.keys(data);
    onlineCountEl.textContent = uids.length;

    if (uids.length === 0) {
      onlineList.innerHTML = `<div style="padding:16px; color:var(--text-muted); font-size:12px;">Everyone is offline.</div>`;
      branchStatsEl.textContent = 'No one online';
      return;
    }

    onlineList.innerHTML = '';
    const branches = {};

    uids.forEach(uid => {
      const user = data[uid];
      if (user.branch) {
        branches[user.branch] = (branches[user.branch] || 0) + 1;
      }

      const avatar = document.createElement('div');
      avatar.style.cssText = 'flex:0 0 100px; padding:12px; background:var(--bg-card-2); border:1px solid var(--border); border-radius:var(--radius-md); text-align:center; scroll-snap-align:start;';
      avatar.innerHTML = `
        <div style="width:36px; height:36px; background:var(--accent); border-radius:50%; margin:0 auto 8px; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:12px; color:white;">
          ${(user.name || '?')[0].toUpperCase()}
        </div>
        <div style="font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.name || 'Anonymous'}</div>
        <div style="font-size:9px; color:var(--accent-bright); margin-top:2px;">${user.branch || 'UID: ' + uid.slice(0,4)}</div>
      `;
      onlineList.appendChild(avatar);
    });

    // Update Branch Popularity
    const sortedBranches = Object.entries(branches).sort((a,b) => b[1] - a[1]);
    const topText = sortedBranches.slice(0, 3).map(([b, c]) => `${b}(${c})`).join(' • ');
    branchStatsEl.textContent = topText || 'Calculating hits...';
  });

  // --- Maintenance logic ---
  async function cleanOldSessions(silent = true) {
    try {
      const snap = await get(sessionsRef);
      if (!snap.exists()) return;
      const data = snap.val();
      const now = Date.now();
      const cutoff = now - (24 * 60 * 60 * 1000);
      let deletedCount = 0;
      const tasks = [];
      Object.keys(data).forEach(sid => {
        const sess = data[sid];
        if (sess.createdAt && sess.createdAt < cutoff) {
          tasks.push(remove(ref(rtdb, `sessions/${sid}`)));
          deletedCount++;
        }
      });
      if (tasks.length > 0) {
        await Promise.all(tasks);
        if (!silent) showToast(`Cleaned ${deletedCount} old sessions.`, 'success');
      } else if (!silent) showToast('No data to purge.', 'success');
    } catch (err) { console.error('[Cleanup] error:', err); }
  }
  setTimeout(() => cleanOldSessions(true), 1500);
  purgeBtn.addEventListener('click', () => {
    purgeBtn.disabled = true;
    cleanOldSessions(false).finally(() => purgeBtn.disabled = false);
  });

  function createSessionCard(sid, sess, isEnded) {
    const uids = Object.keys(sess.users || {});
    const userA = uids[0] || 'Unknown';
    const userB = uids[1] || 'Unknown';
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = `padding:14px; display:flex; flex-direction:column; gap:10px; border:1px solid var(--border); transition:opacity 0.3s; ${isEnded ? 'opacity:0.6; grayscale(100%); pointer-events:none;' : ''}`;
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
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary btn-sm view-chat" data-sid="${sid}" style="min-height:34px; font-size:11px;">Moderate</button>
        ${!isEnded ? `<button class="btn btn-ghost btn-sm end-chat" style="min-height:34px; font-size:11px; color:var(--danger);">Kill</button>` : ''}
      </div>
    `;
    card.querySelector('.view-chat').addEventListener('click', () => {
      const labels = card.querySelectorAll('.name-label');
      openPreview(sid, labels[0].textContent, labels[1].textContent);
    });
    const killBtn = card.querySelector('.end-chat');
    if (killBtn) killBtn.addEventListener('click', () => doEndSession(sid));
    resolveName(userA).then(name => { const l = card.querySelector(`[data-uid="${userA}"]`); if(l) l.textContent = name; });
    resolveName(userB).then(name => { const l = card.querySelector(`[data-uid="${userB}"]`); if(l) l.textContent = name; });
    return card;
  }

  async function resolveName(uid) {
    if (!uid || uid === 'Unknown') return uid;
    if (nameCache.has(uid)) return nameCache.get(uid);
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const name = snap.exists() ? (snap.data().displayName || uid) : uid;
      nameCache.set(uid, name); return name;
    } catch (_) { return uid; }
  }

  let msgsUnsub = null;
  function openPreview(sid, nameA, nameB) {
    if (msgsUnsub) msgsUnsub();
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
        const s = m.senderId === Object.keys(msgs)[0] ? 'A' : 'B';
        row.style.cssText = 'padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:4px; font-size:12px;';
        row.innerHTML = `<span style="font-size:9px; color:var(--accent-bright); font-weight:700;">USER ${s}:</span> ${m.text}`;
        previewMsgs.appendChild(row);
      });
      previewMsgs.scrollTo(0, previewMsgs.scrollHeight);
    });
  }

  async function doEndSession(sid) {
    if (!confirm('Abort immediately?')) return;
    try { await update(ref(rtdb, `sessions/${sid}`), { status: 'ended' }); showToast('Killed.', 'success'); }
    catch(_) { showToast('Error', 'error'); }
  }

  closePreview.onclick = () => { if (msgsUnsub) msgsUnsub(); chatPreview.style.display = 'none'; };
  el._cleanup = () => { off(sessionsRef); off(presenceRef); if (msgsUnsub) msgsUnsub(); };

  return el;
}
