const SPINNER_ID = "opcisync-loading-overlay";
export function showSpinner(message = "Working…") {
  if (document.getElementById(SPINNER_ID)) return;

  const style = document.createElement("style");
  style.textContent = `
      .opcisync-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,.6);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .opcisync-box {
        background: white;
        padding: 24px 32px;
        border-radius: 12px;
        font-family: system-ui;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .opcisync-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      .opcisync-message {
        font-size: 14px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = SPINNER_ID;
  overlay.innerHTML = `
      <div class="opcisync-backdrop">
        <div class="opcisync-box">
          <div class="opcisync-spinner"></div>
          <div class="opcisync-message">${message}</div>
        </div>
      </div>
    `;
  document.body.appendChild(overlay);
}

export function updateSpinner(message: string) {
  const el = document.querySelector(`#${SPINNER_ID} .opcisync-message`);
  if (el) el.textContent = message;
}

export function hideSpinner() {
  document.getElementById(SPINNER_ID)?.remove();
}
