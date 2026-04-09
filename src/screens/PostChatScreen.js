// ============================================================
// Post-Chat Screen — Minimal after-chat feedback
// ============================================================

export function PostChatScreen({ onFindNew }) {
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
          Your conversation has ended. For your safety, the chat history 
          has been permanently deleted.
        </p>
      </div>

      <!-- Actions -->
      <div style="width:100%;display:flex;flex-direction:column;gap:10px;
                  animation:fadeUp 0.4s 0.2s var(--ease-out) both;">

        <button class="btn btn-primary" id="find-new-btn" style="height:52px; font-weight:700;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
          Find a New Person
        </button>

        <p style="font-size:12px;color:var(--text-muted);margin-top:20px;">
          Connect with another verified UEC student.
        </p>
      </div>
    </div>
  `;

  el.querySelector('#find-new-btn').addEventListener('click', () => {
    onFindNew();
  });

  return el;
}
