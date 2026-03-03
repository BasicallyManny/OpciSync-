import { showSpinner, updateSpinner, hideSpinner } from "../loaders/spinners";
import { selectors, findSelector, findElement, getNeedsActionContainer } from "../domUtils/opCityUtils";
import {
  clickSubmitButton,
  clickUpdateButton,
  selectStatusAndEnterDate,
  scrapeAllLeads,
  extractStatus,
} from "../webscraper/opcityScraper";

(() => {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const w = window as unknown as Record<string, unknown>;
  if (w.__opcisyncLoaded) return;
  w.__opcisyncLoaded = true;

  console.log("OpciSync content script loaded");

  let isRunning = false;

  async function runAutoUpdate() {
    if (isRunning) return;
    isRunning = true;

    try {
      showSpinner("Counting leads…");

      const cardSel = findSelector(selectors.leadCards);
      if (!cardSel) throw new Error("Cannot find leads");

      const container = getNeedsActionContainer();
      if (!container) throw new Error('Cannot find "Needs Action" section');

      // Scroll to load all cards before counting
      const scrollSel = findSelector(selectors.scrollContainers);
      const scrollEl = scrollSel
        ? (document.querySelector(scrollSel) as HTMLElement | null)
        : null;

      if (scrollEl) {
        let stableCount = 0;
        let lastCount = 0;
        while (stableCount < 3) {
          scrollEl.scrollTop = scrollEl.scrollHeight;
          await sleep(1200);
          const currentCount = container.querySelectorAll(cardSel).length;
          console.log(`Scroll loading: ${currentCount} cards found`);
          stableCount = currentCount === lastCount ? stableCount + 1 : 0;
          lastCount = currentCount;
        }
        scrollEl.scrollTop = 0; // scroll back to top before processing
        await sleep(500);
      }

      const totalLeads = container.querySelectorAll(cardSel).length;
      console.log(`Found ${totalLeads} leads to update`);
      if (totalLeads === 0) throw new Error("No leads found in Needs Action");

      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      let skipIndex = 0;

      while (true) {
        // Re-scope every iteration
        const freshContainer = getNeedsActionContainer();
        if (!freshContainer) {
          console.log("Needs Action section gone — all leads processed");
          break;
        }

        const currentCards = freshContainer.querySelectorAll(cardSel);

        // No more cards left
        if (skipIndex >= currentCards.length) {
          console.log("No more leads to process");
          break;
        }

        const currentCard = currentCards[skipIndex];
        const leadNum = successCount + skippedCount + failCount + 1;
        console.log(`\n=== Checking lead ${leadNum} (index ${skipIndex}/${currentCards.length}) ===`);
        updateSpinner(`Processing lead ${leadNum}…`);

        try {
          const status = extractStatus(currentCard);

          if (
            status === "OFFER" ||
            status === "We Received Offers" ||
            status === "Negotiating Lease" ||
            status === "Unknown" ||
            status === "We Met / Listed Home"
          ) {
            console.log(`⊘ Skipping lead ${leadNum} - status is ${status}`);
            skippedCount++;
            skipIndex++;
            continue;
          }

          // Click the lead
          (currentCard as HTMLElement).click();
          await sleep(3000);

          // Wait for update button
          let retries = 0;
          while (!findElement(selectors.updateStatusButton) && retries < 3) {
            await sleep(1000);
            retries++;
          }

          updateSpinner(`Lead ${leadNum}: Opening Update Status…`);

          if (!await clickUpdateButton()) {
            console.error(`Failed to click Update Status for lead ${leadNum}`);
            failCount++;
            skipIndex++;
            window.history.back();
            await sleep(1500);
            continue;
          }

          updateSpinner(`Lead ${leadNum}: Entering date…`);

          if (!await selectStatusAndEnterDate(status)) {
            console.error(`Failed to enter date for lead ${leadNum}`);
            failCount++;
            skipIndex++;
            const closeBtn = document.querySelector("[class*='close'], [aria-label*='close']");
            if (closeBtn) (closeBtn as HTMLElement).click();
            await sleep(1000);
            continue;
          }

          updateSpinner(`Lead ${leadNum}: Submitting…`);

          if (!await clickSubmitButton()) {
            console.error(`Failed to submit for lead ${leadNum}`);
            failCount++;
            skipIndex++;
            continue;
          }

          console.log(`Successfully updated lead ${leadNum}`);
          successCount++;
          // DON'T increment skipIndex — updated lead drops off the list
          // so cards[skipIndex] naturally points to the next lead

          // Poll until list is ready again
          console.log("Waiting for list to reload...");
          let backRetries = 0;
          while (backRetries < 20) {
            await sleep(3000);
            const freshCheck = getNeedsActionContainer();
            if (freshCheck && freshCheck.querySelectorAll(cardSel).length > 0) {
              console.log("List ready, continuing...");
              break;
            }
            console.log(`List not ready yet, retry ${backRetries + 1}/20...`);
            backRetries++;
          }

          // Scroll to trigger lazy loading of next batch
          if (scrollEl) {
            scrollEl.scrollTop = 0;
            await sleep(500);
            scrollEl.scrollTop = scrollEl.scrollHeight;
            await sleep(1500);
            console.log(`Scrolled list, cards now visible: ${getNeedsActionContainer()?.querySelectorAll(cardSel).length ?? 0}`);
          }

        } catch (error) {
          console.error(`Error processing lead ${leadNum}:`, error);
          failCount++;
          skipIndex++;

          if (window.location.href.includes('/referral/')) {
            window.history.back();
            await sleep(1500);
          }
        }
      }

      hideSpinner();

      const total = successCount + skippedCount + failCount;
      const message = `Updated ${successCount} of ${total} leads` +
        (skippedCount > 0 ? ` (${skippedCount} skipped)` : '') +
        (failCount > 0 ? ` (${failCount} failed)` : '');

      console.log(`\n=== COMPLETE ===`);
      console.log(message);

      chrome.runtime.sendMessage({
        type: "UPDATE_COMPLETE",
        payload: {
          success: true,
          message,
          stats: {
            total,
            success: successCount,
            skipped: skippedCount,
            failed: failCount
          }
        }
      });

    } catch (err) {
      hideSpinner();
      chrome.runtime.sendMessage({
        type: "UPDATE_COMPLETE",
        payload: {
          success: false,
          message: err instanceof Error ? err.message : "Unknown error"
        }
      });
    } finally {
      isRunning = false;
    }
  }

  /* Messages */

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SCRAPE_LEADS") {
      showSpinner("Syncing leads…");
      scrapeAllLeads().then((leads) => {
        hideSpinner();
        chrome.runtime.sendMessage({
          type: "LEADS_SCRAPED",
          payload: leads,
        });
      });
    }

    if (msg.type === "TEST_AUTO_UPDATE") {
      runAutoUpdate();
    }
  });
})();