import type { Lead, LeadStatus } from "../types/types";

const SPINNER_ID = "opcisync-loading-overlay";

/* ---------------- Spinner ---------------- */

function injectSpinnerStyles(): void {
  if (document.getElementById("opcisync-styles")) return;

  const style = document.createElement("style");
  style.id = "opcisync-styles";
  style.textContent = `
    .opcisync-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
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
      text-align: center;
      font-size: 14px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

function showSpinner(message: string = "Syncing leads…"): void {
  if (document.getElementById(SPINNER_ID)) {
    updateSpinnerMessage(message);
    return;
  }
  injectSpinnerStyles();

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

function updateSpinnerMessage(message: string): void {
  const messageEl = document.querySelector(`#${SPINNER_ID} .opcisync-message`);
  if (messageEl) {
    messageEl.textContent = message;
  }
}

function hideSpinner(): void {
  document.getElementById(SPINNER_ID)?.remove();
}

/* ---------------- Utils ---------------- */

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/* ---------------- Selectors ---------------- */

const SELECTOR_VARIANTS = {
  scrollContainers: [
    ".ReferralList__scrollingwindow",
    ".ReferralList_scrollingwindow", 
    "[class*='scrollingwindow']",
    "[class*='ReferralList']"
  ],
  leadCards: [
    ".clickable.ReferralItem",
    ".ReferralItem",
    "[class*='ReferralItem']"
  ],
  names: [
    ".ReferralItem__name",
    ".ReferralItem_name",
    "[class*='ReferralItem'][class*='name']"
  ],
  statuses: [
    ".ReferralItem__status",
    ".ReferralItem_status",
    "[class*='status']"
  ],
  times: [
    ".ReferralItem__time-since",
    ".ReferralItem_time-since",
    "[class*='time']",
    "[class*='Updated']"
  ],
  updateStatusButton: [
    ".StatusButton_primary",
    "button.StatusButton_primary",
    "[class*='StatusButton'][class*='primary']",
    "button[class*='Update']"
  ],
  backButton: [
    "[class*='back']",
    "button[aria-label*='back']",
    "a[class*='back']"
  ]
};

/* ---------------- Helper to find working selector ---------------- */

function findWorkingSelector(selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return selector;
    }
  }
  return null;
}

function findElement(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) {
      return element;
    }
  }
  return null;
}

/* ---------------- Extraction ---------------- */

function extractStatus(card: Element): LeadStatus {
  // Try to find status element
  for (const selector of SELECTOR_VARIANTS.statuses) {
    const statusEl = card.querySelector(selector);
    if (statusEl) {
      const statusText = statusEl.textContent?.trim().toUpperCase() || "";
      
      if (statusText.includes("SPOKE")) return "SPOKE";
      if (statusText.includes("MET")) return "MET";
      if (statusText.includes("OFFER")) return "OFFER";
      if (statusText.includes("CONTRACT")) return "CONTRACT";
      if (statusText.includes("CLOSE") || statusText.includes("SUCCESS")) return "CLOSE";
    }
  }
  
  // Fallback: check card classes
  const className = card.className;
  
  if (className.includes("success")) return "CLOSE";
  if (className.includes("contract")) return "CONTRACT";
  if (className.includes("offer")) return "OFFER";
  if (className.includes("met")) return "MET";
  if (className.includes("spoke")) return "SPOKE";
  
  return "SPOKE";
}

function scrapeVisibleLeads(cardSelector: string): Lead[] {
  const cards = document.querySelectorAll(cardSelector);
  const leads: Lead[] = [];

  cards.forEach((card) => {
    // Try to find name
    let name = "";
    for (const selector of SELECTOR_VARIANTS.names) {
      const nameEl = card.querySelector(selector) as HTMLElement | null;
      if (nameEl && nameEl.innerText.trim()) {
        name = nameEl.innerText.trim();
        break;
      }
    }
    
    if (!name) return;

    // Try to find time/last updated
    let lastUpdated = "Unknown";
    for (const selector of SELECTOR_VARIANTS.times) {
      const timeEl = card.querySelector(selector) as HTMLElement | null;
      if (timeEl && timeEl.innerText.trim()) {
        lastUpdated = timeEl.innerText.trim();
        break;
      }
    }

    const status = extractStatus(card);

    leads.push({
      name,
      status,
      lastUpdated
    });
  });

  return leads;
}

async function scrapeAllLeads(): Promise<Lead[]> {
  // Find working scroll container
  const scrollSelector = findWorkingSelector(SELECTOR_VARIANTS.scrollContainers);
  if (!scrollSelector) {
    console.error("OpciSync: Could not find scroll container");
    return [];
  }
  
  const container = document.querySelector(scrollSelector) as HTMLElement;
  
  // Find working lead card selector
  const cardSelector = findWorkingSelector(SELECTOR_VARIANTS.leadCards);
  if (!cardSelector) {
    console.error("OpciSync: Could not find any lead cards");
    return [];
  }

  const collected = new Map<string, Lead>();
  let stagnant = 0;

  while (stagnant < 3) {
    const before = collected.size;

    scrapeVisibleLeads(cardSelector).forEach(lead => {
      collected.set(lead.name, lead);
    });

    const afterSize = collected.size;
    stagnant = afterSize === before ? stagnant + 1 : 0;

    container.scrollTop = container.scrollHeight;
    await sleep(1200);
  }

  const finalLeads = Array.from(collected.values());
  console.log(`OpciSync: Scraped ${finalLeads.length} leads`);
  return finalLeads;
}

/* ---------------- Auto Update Functions ---------------- */

async function clickFirstLead(): Promise<boolean> {
  console.log("OpciSync: Attempting to click first lead...");
  
  // Find the first lead card
  const cardSelector = findWorkingSelector(SELECTOR_VARIANTS.leadCards);
  if (!cardSelector) {
    console.error("OpciSync: Could not find lead card selector");
    return false;
  }

  const firstCard = document.querySelector(cardSelector) as HTMLElement;
  if (!firstCard) {
    console.error("OpciSync: No lead cards found");
    return false;
  }

  // Get the lead name for logging
  const nameEl = firstCard.querySelector("[class*='name']") as HTMLElement;
  const leadName = nameEl?.innerText.trim() || "Unknown";
  
  console.log(`OpciSync: Clicking lead: ${leadName}`);
  firstCard.click();
  
  // Wait for detail page to load
  await sleep(1500);
  
  return true;
}

async function clickUpdateStatusButton(): Promise<boolean> {
  console.log("OpciSync: Looking for Update Status button...");
  
  // Wait a bit to ensure the page has loaded
  await sleep(500);
  
  // Find the Update Status button
  const updateButton = findElement(SELECTOR_VARIANTS.updateStatusButton);
  
  if (!updateButton) {
    console.error("OpciSync: Update Status button not found");
    console.log("Available buttons:", 
      Array.from(document.querySelectorAll("button")).map(b => ({
        class: b.className,
        text: b.textContent?.trim()
      }))
    );
    return false;
  }

  console.log(`OpciSync: Found Update Status button: ${updateButton.className}`);
  updateButton.click();
  
  // Wait for action to complete
  await sleep(1000);
  
  return true;
}

async function navigateBack(): Promise<void> {
  console.log("OpciSync: Navigating back...");
  
  // Try to find back button
  const backButton = findElement(SELECTOR_VARIANTS.backButton);
  
  if (backButton) {
    console.log("OpciSync: Found back button, clicking...");
    backButton.click();
  } else {
    // Fallback: use browser back
    console.log("OpciSync: Back button not found, using history.back()");
    window.history.back();
  }
  
  // Wait for navigation
  await sleep(1500);
}

async function testAutoUpdate(): Promise<void> {
  showSpinner("Opening first lead...");
  
  try {
    // Step 1: Click into the first lead
    const leadClicked = await clickFirstLead();
    if (!leadClicked) {
      throw new Error("Failed to click lead");
    }
    
    updateSpinnerMessage("Clicking Update Status...");
    
    // Step 2: Click the Update Status button
    const buttonClicked = await clickUpdateStatusButton();
    if (!buttonClicked) {
      throw new Error("Failed to click Update Status button");
    }
    
    updateSpinnerMessage("Success! Navigating back...");
    
    // Step 3: Navigate back to the list
    await navigateBack();
    
    hideSpinner();
    
    chrome.runtime.sendMessage({
      type: "UPDATE_COMPLETE",
      payload: { success: true, message: "Successfully updated first lead" }
    });
    
  } catch (error) {
    console.error("OpciSync: Auto-update failed:", error);
    hideSpinner();
    
    chrome.runtime.sendMessage({
      type: "UPDATE_COMPLETE",
      payload: { 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error" 
      }
    });
  }
}

/* ---------------- Message Bridge ---------------- */

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "SCRAPE_LEADS") {
    showSpinner("Syncing leads…");

    const leads = await scrapeAllLeads();

    hideSpinner();

    chrome.runtime.sendMessage({
      type: "LEADS_SCRAPED",
      payload: leads
    });
  }
  
  if (msg.type === "TEST_AUTO_UPDATE") {
    await testAutoUpdate();
  }
});

console.log("OpciSync content script loaded");