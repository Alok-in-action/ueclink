// ============================================================
// Post-Chat Screen — Simplified (Reveal disabled)
// ============================================================

export function PostChatScreen({ onFindNew }) {
  const el = document.createElement('div');
  el.style.cssText = 'height:100%; display:flex; flex-direction:column; background:var(--bg-base);';

  el.innerHTML = `
    <div class="gradient-bg"></div>
    <div class="page-inner" style="justify-content:center;align-items:center;text-align:center;gap:32px;">

      <!-- Ended icon -->
      <div style="width:90px;height:90px;border-radius:50%;
        background:var(--bg-card-2);border:2px solid var(--border);
        display:flex;align-items:center;justify-content:center;font-size:36px;
        animation:fadeIn 0.5s var(--ease-out);">
        💬
      </div>

      <div style="animation:fadeUp 0.5s 0.1s var(--ease-out) both;">
        <h1 style="font-size:24px;font-weight:800;margin-bottom:12px;">Chat Ended</h1>
        <p style="font-size:15px;color:var(--text-secondary);line-height:1.6;max-width:280px;">
          That conversation has vanished. Every chat is a fresh start.
        </p>
      </div>

      <!-- Actions -->
      <div style="width:100%;max-width:280px;display:flex;flex-direction:column;gap:12px;
                  animation:fadeUp 0.5s 0.2s var(--ease-out) both;">

        <button class="btn btn-primary" id="find-new-btn">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
          Find New Chat
        </button>
      </div>

      <p style="font-size:12px;color:var(--text-muted);margin-top:20px;">
        All messages were deleted for your privacy.
      </p>
    </div>
  `;

  el.querySelector('#find-new-btn').addEventListener('click', () => {
    onFindNew();
  });

  return el;
}
