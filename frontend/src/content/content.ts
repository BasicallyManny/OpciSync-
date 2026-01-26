// Unique ID so we never inject twice
const SPINNER_ID = "opcisync-loading-overlay";

/**
 * Injects a full-screen loading spinner and blocks interaction
 */
function showSpinner(message = "Syncing leads...") {
  if (document.getElementById(SPINNER_ID)) return;

  const overlay = document.createElement("div");
  overlay.id = SPINNER_ID;

  overlay.innerHTML = `
    <div class="opcisync-backdrop">
      <div class="opcisync-card">
        <div class="opcisync-spinner"></div>
        <p>${message}</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * Removes the spinner overlay
 */
function hideSpinner() {
  const overlay = document.getElementById(SPINNER_ID);
  if (overlay) overlay.remove();
}

/**
 * Inject minimal CSS (Tailwind-style but self-contained)
 */
function injectSpinnerStyles() {
  if (document.getElementById("opcisync-spinner-styles")) return;

  const style = document.createElement("style");
  style.id = "opcisync-spinner-styles";

  style.textContent = `
    .opcisync-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    }

    .opcisync-card {
      background: white;
      padding: 24px 32px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
      font-family: system-ui, -apple-system, BlinkMacSystemFont;
    }

    .opcisync-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 9999px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  document.head.appendChild(style);
}

// Listen for spinner command from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_SPINNER") {
    injectSpinnerStyles();
    showSpinner();

    // Simulate work for 3 seconds, then hide and notify
    setTimeout(() => {
      hideSpinner();
      
      // Send completion message back to background
      chrome.runtime.sendMessage({
        type: "SPINNER_COMPLETE",
        payload: [] // Empty array for now, will be leads later
      });
    }, 3000);
  }
});

// Boot message
console.log("Opcisync content script loaded");

export {};