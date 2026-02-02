export const selectors = {
  scrollContainers: [
    ".ReferralList__scrollingwindow",
    ".ReferralList_scrollingwindow",
    "[class*='scrollingwindow']",
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
