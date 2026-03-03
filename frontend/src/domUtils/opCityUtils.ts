export const selectors = {
  scrollContainers: [
    ".ReferralList__scrollwindow", 
    "[class*='scrollwindow']",
    "[class*='ReferralList']",
  ],
  leadCards: [
    ".clickable.ReferralItem",
    ".ReferralItem",
    "[class*='ReferralItem']",
  ],
  names: [".ReferralItem__name", ".ReferralItem_name", "[class*='name']"],
  statuses: [
    ".ReferralItem__status",
    ".ReferralItem_status",
    "[class*='status']",
  ],
  times: [
    ".ReferralItem__time-since",
    ".ReferralItem_time-since",
    "[class*='Updated']",
  ],
  updateStatusButton: [
    ".StatusButton_primary",
    "button.StatusButton_primary",
    "[class*='StatusButton'][class*='primary']",
    "button[class*='Update']",
  ],
};

/**
 * Finds the ReferralList__section__content that belongs to the "Needs Action" section.
 * The DOM structure is:
 *   .ReferralList__section
 *     .ReferralList__section__header  ← contains "Needs Action" text
 *     .ReferralList__section__content ← contains the lead cards we want
 */
export function getNeedsActionContainer(): Element | null {
  const headers = document.querySelectorAll(".ReferralList__section__header");
  for (const header of Array.from(headers)) {
    if (header.textContent?.trim() === "Needs Action") {
      // The content div is the next sibling element
      const content = header.nextElementSibling;
      if (content?.classList.contains("ReferralList__section__content")) {
        return content;
      }
    }
  }
  return null;
}

export function setReactTextareaValue(
  textarea: HTMLTextAreaElement,
  value: string,
) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

export function findSelector(list: string[]) {
  return list.find((sel) => document.querySelector(sel)) ?? null;
}

export function findElement(list: string[]) {
  for (const sel of list) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export function isInLeadView(): boolean {
  return !!findElement(selectors.updateStatusButton);
}
