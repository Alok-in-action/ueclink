// ============================================================
// Debug Screen — hidden /debug route, live stats
// ============================================================

import { db } from '../firebase.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export function DebugScreen() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="gap:0;">
      <div style="padding-top:calc(var(--safe-top)+24px);margin-bottom:var(--space-xl);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <div class="wordmark">UEC<span>Link</span></div>
          <div class="chip" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
            color:var(--warning);">debug</div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);">Admin dashboard — hidden route</p>
      </div>

      <div id="stats-container" style="display:flex;flex-direction:column;gap:0;">
        <div class="debug-stat">
          <span style="color:var(--text-secondary);">Loading stats…</span>
          <span class="val">—</span>
        </div>
      </div>

      <div style="margin-top:var(--space-xl);">
        <h3 style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">
          Recent Reports
        </h3>
        <div id="reports-list" style="display:flex;flex-direction:column;gap:8px;">
          <p style="font-size:13px;color:var(--text-muted);">Loading…</p>
        </div>
      </div>

      <div style="margin-top:var(--space-xl);">
        <button class="btn btn-ghost btn-sm" id="refresh-btn">↻ Refresh</button>
      </div>
    </div>
  `;

  const load = async () => {
    const statsEl   = el.querySelector('#stats-container');
    const reportsEl = el.querySelector('#reports-list');

    try {
      // Presence
      const presenceSnap = await getDoc(doc(db, 'meta', 'presence'));
      const onlineCount  = presenceSnap.exists() ? presenceSnap.data().count : 0;

      // Queue size
      const queueSnap = await getDocs(
        query(collection(db, 'matchingQueue'), where('status', '==', 'waiting'))
      );

      // Total users
      const usersSnap = await getDocs(collection(db, 'users'));

      // Reports today
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const reportsSnap = await getDocs(
        query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(10))
      );

      const stats = [
        { label: 'Users Online (real)',   val: onlineCount },
        { label: 'In Queue (matching)',   val: queueSnap.size },
        { label: 'Total Users',           val: usersSnap.size },
        { label: 'Reports (last 10)',     val: reportsSnap.size },
      ];

      statsEl.innerHTML = stats.map(s => `
        <div class="debug-stat">
          <span style="color:var(--text-secondary);">${s.label}</span>
          <span class="val">${s.val}</span>
        </div>
      `).join('');

      const reports = [];
      reportsSnap.forEach(d => reports.push(d.data()));

      reportsEl.innerHTML = reports.length === 0
        ? '<p style="font-size:13px;color:var(--text-muted);">No recent reports.</p>'
        : reports.map(r => `
            <div class="card" style="padding:10px 14px;">
              <div style="font-size:13px;font-weight:500;">${r.reason || 'Unknown'}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                Session: ${r.sessionId || '—'}
              </div>
            </div>
          `).join('');

    } catch (err) {
      statsEl.innerHTML = `<p style="color:var(--danger);font-size:13px;">Error loading stats: ${err.message}</p>`;
    }
  };

  load();
  el.querySelector('#refresh-btn').addEventListener('click', load);

  return el;
}
