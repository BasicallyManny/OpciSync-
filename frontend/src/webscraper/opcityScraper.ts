import type { LeadStatus, Lead } from "../types/types";
import {
  findElement,
  findSelector,
  isInLeadView,
  selectors,
  setReactTextareaValue,
} from "../domUtils/opCityUtils";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function extractStatus(card: Element): LeadStatus {
  for (const sel of selectors.statuses) {
    const el = card.querySelector(sel);
    const text = el?.textContent?.toUpperCase() ?? "";
    if (text.includes("SPOKE")) return "SPOKE";
    if (text.includes("MET")) return "MET";
    if (text.includes("OFFER")) return "OFFER";
    if (text.includes("CONTRACT")) return "CONTRACT";
    if (text.includes("CLOSE")) return "CLOSE";
  }
  return "SPOKE";
}

export function scrapeVisible(selector: string): Lead[] {
  const results: Lead[] = [];

  document.querySelectorAll(selector).forEach((card) => {
    let name = "";
    for (const sel of selectors.names) {
      const el = card.querySelector(sel) as HTMLElement | null;
      if (el?.innerText.trim()) {
        name = el.innerText.trim();
        break;
      }
    }
    if (!name) return;

    let lastUpdated = "Unknown";
    for (const sel of selectors.times) {
      const el = card.querySelector(sel) as HTMLElement | null;
      if (el?.innerText.trim()) {
        lastUpdated = el.innerText.trim();
        break;
      }
    }

    results.push({
      name,
      status: extractStatus(card),
      lastUpdated,
    });
  });

  return results;
}

export async function clickFirstLead(): Promise<boolean> {
  if (isInLeadView()) return true;

  const sel = findSelector(selectors.leadCards);
  const card = sel ? (document.querySelector(sel) as HTMLElement) : null;
  if (!card) return false;

  card.click();
  await sleep(3000); // Increased to 3 seconds

  // Wait for update button to be available
  let retries = 0;
  while (!findElement(selectors.updateStatusButton) && retries < 3) {
    await sleep(1000);
    retries++;
  }

  return true;
}

export async function clickUpdateButton(): Promise<boolean> {
  await sleep(500);
  const btn = findElement(selectors.updateStatusButton) as HTMLElement | null;
  if (!btn) return false;
  btn.click();
  await sleep(1200);
  return true;
}

export async function selectStatusAndEnterDate(): Promise<boolean> {
  await sleep(800);

  const buttons = document.querySelectorAll(
    ".StatusUpdateDrawer__status-button, button.StatusUpdateDrawer__status-button",
  );
  if (!buttons.length) return false;

  (buttons[0] as HTMLElement).click();
  await sleep(1200);

  const textarea = document.querySelector(
    "textarea",
  ) as HTMLTextAreaElement | null;
  if (!textarea) return false;

  const currentDate = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = dayNames[currentDate.getDay()];
  const monthName = monthNames[currentDate.getMonth()];
  const dateNum = currentDate.getDate();
  const suffixMap = ["th", "st", "nd", "rd"];
  const suffix = dateNum % 10 > 3 ? suffixMap[0] : suffixMap[dateNum % 10];

  let hourNum = currentDate.getHours();
  const minStr = currentDate.getMinutes().toString().padStart(2, "0");
  const ampmStr = hourNum >= 12 ? "PM" : "AM";
  hourNum = hourNum % 12 || 12;

  const dateValue = `${dayName}, ${monthName} ${dateNum}${suffix} ${currentDate.getFullYear()} ${hourNum}:${minStr} ${ampmStr}`;

  textarea.focus();
  setReactTextareaValue(textarea, dateValue);
  textarea.blur();

  await sleep(2000);
  return true;
}

export async function clickSubmitButton(): Promise<boolean> {
  console.log("OpciSync: Clicking submit button");

  await sleep(1500);

  const drawer = document.querySelector(".StatusUpdateDrawer");
  if (!drawer) {
    console.error("❌ Drawer not found");
    return false;
  }

  // The .StatusSubmitButton is a wrapper div - find the actual button inside it!
  const buttonWrapper = drawer.querySelector(".StatusSubmitButton");
  if (!buttonWrapper) {
    console.error("❌ Button wrapper not found");
    return false;
  }

  const actualButton = buttonWrapper.querySelector(
    "button",
  ) as HTMLButtonElement | null;
  if (!actualButton) {
    console.error("❌ Actual button not found inside wrapper");
    return false;
  }

  if (actualButton.disabled) {
    console.error("❌ Button is disabled");
    return false;
  }

  console.log("✓ Found actual button, clicking...");
  actualButton.click();

  await sleep(2500);

  const stillOpen = document.querySelector(".StatusUpdateDrawer");
  if (!stillOpen) {
    console.log("✓✓✓ SUCCESS! ✓✓✓");
    return true;
  }

  console.error("❌ Click didn't work");
  return false;
}

export  async function scrapeAllLeads(): Promise<Lead[]> {
    const scrollSel = findSelector(selectors.scrollContainers);
    const cardSel = findSelector(selectors.leadCards);
    if (!scrollSel || !cardSel) return [];

    const scrollEl = document.querySelector(scrollSel) as HTMLElement;
    const map = new Map<string, Lead>();
    let stable = 0;

    while (stable < 3) {
      const before = map.size;
      scrapeVisible(cardSel).forEach(l => map.set(l.name, l));
      stable = map.size === before ? stable + 1 : 0;
      scrollEl.scrollTop = scrollEl.scrollHeight;
      await sleep(1200);
    }

    return [...map.values()];
  }
