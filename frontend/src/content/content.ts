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
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

function showSpinner(): void {
  if (document.getElementById(SPINNER_ID)) return;
  injectSpinnerStyles();

  const overlay = document.createElement("div");
  overlay.id = SPINNER_ID;
  overlay.innerHTML = `
    <div class="opcisync-backdrop">
      <div class="opcisync-box">
        <div class="opcisync-spinner"></div>
        <div>Syncing leads…</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function hideSpinner(): void {
  document.getElementById(SPINNER_ID)?.remove();
}

/* ---------------- Utils ---------------- */

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/* ---------------- Selectors ---------------- */

// Try multiple possible selectors
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
  ]
};

/* ---------------- Helper to find working selector ---------------- */

function findWorkingSelector(selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✓ Found working selector: ${selector}`);
      return selector;
    }
  }
  console.log(`✗ None of these selectors worked:`, selectors);
  return null;
}

/* ---------------- Extraction ---------------- */

function extractStatus(card: Element): LeadStatus {
  // Try to find status element
  for (const selector of SELECTOR_VARIANTS.statuses) {
    const statusEl = card.querySelector(selector);
    if (statusEl) {
      const statusText = statusEl.textContent?.trim().toUpperCase() || "";
      console.log(`Found status text: "${statusText}"`);
      
      if (statusText.includes("SPOKE")) return "SPOKE";
      if (statusText.includes("MET")) return "MET";
      if (statusText.includes("OFFER")) return "OFFER";
      if (statusText.includes("CONTRACT")) return "CONTRACT";
      if (statusText.includes("CLOSE") || statusText.includes("SUCCESS")) return "CLOSE";
    }
  }
  
  // Fallback: check card classes
  const className = card.className;
  console.log(`Card classes: ${className}`);
  
  if (className.includes("success")) return "CLOSE";
  if (className.includes("contract")) return "CONTRACT";
  if (className.includes("offer")) return "OFFER";
  if (className.includes("met")) return "MET";
  if (className.includes("spoke")) return "SPOKE";
  
  return "SPOKE";
}

function scrapeVisibleLeads(cardSelector: string): Lead[] {
  const cards = document.querySelectorAll(cardSelector);
  console.log(`Found ${cards.length} lead cards with selector: ${cardSelector}`);
  
  const leads: Lead[] = [];

  cards.forEach((card, index) => {
    console.log(`\nProcessing card ${index + 1}:`);
    
    // Try to find name
    let name = "";
    for (const selector of SELECTOR_VARIANTS.names) {
      const nameEl = card.querySelector(selector) as HTMLElement | null;
      if (nameEl && nameEl.innerText.trim()) {
        name = nameEl.innerText.trim();
        console.log(`  Name (${selector}): "${name}"`);
        break;
      }
    }
    
    if (!name) {
      console.log(`  ✗ No name found, skipping card`);
      return;
    }

    // Try to find time/last updated
    let lastUpdated = "Unknown";
    for (const selector of SELECTOR_VARIANTS.times) {
      const timeEl = card.querySelector(selector) as HTMLElement | null;
      if (timeEl && timeEl.innerText.trim()) {
        lastUpdated = timeEl.innerText.trim();
        console.log(`  Time (${selector}): "${lastUpdated}"`);
        break;
      }
    }

    const status = extractStatus(card);
    console.log(`  Status: ${status}`);

    leads.push({
      name,
      status,
      lastUpdated
    });
  });

  return leads;
}

async function scrapeAllLeads(): Promise<Lead[]> {
  console.log("\n=== Starting scrape ===");
  
  // Find working scroll container
  const scrollSelector = findWorkingSelector(SELECTOR_VARIANTS.scrollContainers);
  if (!scrollSelector) {
    console.error("❌ Could not find scroll container!");
    console.log("Available elements with 'scroll' in class:", 
      Array.from(document.querySelectorAll("[class*='scroll']")).map(el => el.className)
    );
    return [];
  }
  
  const container = document.querySelector(scrollSelector) as HTMLElement;
  console.log(`Using scroll container: ${scrollSelector}`);
  
  // Find working lead card selector
  const cardSelector = findWorkingSelector(SELECTOR_VARIANTS.leadCards);
  if (!cardSelector) {
    console.error("❌ Could not find any lead cards!");
    console.log("Available elements with 'Referral' in class:", 
      Array.from(document.querySelectorAll("[class*='Referral']")).map(el => el.className)
    );
    return [];
  }
  
  console.log(`Using card selector: ${cardSelector}`);

  const collected = new Map<string, Lead>();
  let stagnant = 0;

  while (stagnant < 3) {
    const before = collected.size;

    scrapeVisibleLeads(cardSelector).forEach(lead => {
      collected.set(lead.name, lead);
    });

    const afterSize = collected.size;
    console.log(`\n--- Scroll ${stagnant + 1}: ${afterSize} unique leads (${afterSize - before} new) ---`);

    stagnant = afterSize === before ? stagnant + 1 : 0;

    container.scrollTop = container.scrollHeight;
    await sleep(1200);
  }

  const finalLeads = Array.from(collected.values());
  console.log(`\n=== Scrape complete: ${finalLeads.length} total leads ===`);
  return finalLeads;
}

/* ---------------- Message Bridge ---------------- */

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type !== "SCRAPE_LEADS") return;

  console.log("🚀 Starting lead scrape...");
  
  // Debug: Show all elements with common class patterns
  console.log("\n--- Page Analysis ---");
  console.log("Elements with 'Referral':", document.querySelectorAll("[class*='Referral']").length);
  console.log("Elements with 'scroll':", document.querySelectorAll("[class*='scroll']").length);
  console.log("Elements with 'List':", document.querySelectorAll("[class*='List']").length);
  
  showSpinner();

  const leads = await scrapeAllLeads();

  hideSpinner();

  console.log(`📤 Sending ${leads.length} leads back to extension`);
  chrome.runtime.sendMessage({
    type: "LEADS_SCRAPED",
    payload: leads
  });
});

console.log("✅ OpciSync content script loaded");