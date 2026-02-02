
import { showSpinner, updateSpinner, hideSpinner } from "../loaders/spinners";
import {selectors, findSelector} from "../domUtils/opCityUtils";
import { clickFirstLead, clickSubmitButton, clickUpdateButton, selectStatusAndEnterDate, scrapeAllLeads } from "../webscraper/opcityScraper";

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
      // First, get all leads
      showSpinner("Counting leads…");
      
      const cardSel = findSelector(selectors.leadCards);
      if (!cardSel) {
        throw new Error("Cannot find leads");
      }
      
      const leadCards = document.querySelectorAll(cardSel);
      const totalLeads = leadCards.length;
      
      console.log(`Found ${totalLeads} leads to update`);
      
      if (totalLeads === 0) {
        throw new Error("No leads found");
      }

      let successCount = 0;
      let failCount = 0;

      // Process each lead
      for (let i = 0; i < totalLeads; i++) {
        const leadNum = i + 1;
        console.log(`\n=== Processing lead ${leadNum}/${totalLeads} ===`);
        
        updateSpinner(`Processing lead ${leadNum} of ${totalLeads}…`);

        try {
          // Click the lead (will be at index 0 since we navigate back each time)
          if (!await clickFirstLead()) {
            console.error(`Failed to click lead ${leadNum}`);
            failCount++;
            continue;
          }

          updateSpinner(`Lead ${leadNum}/${totalLeads}: Opening Update Status…`);
          
          if (!await clickUpdateButton()) {
            console.error(`Failed to click Update Status for lead ${leadNum}`);
            failCount++;
            // Navigate back and continue
            window.history.back();
            await sleep(1500);
            continue;
          }

          updateSpinner(`Lead ${leadNum}/${totalLeads}: Entering date…`);
          
          if (!await selectStatusAndEnterDate()) {
            console.error(`Failed to enter date for lead ${leadNum}`);
            failCount++;
            // Try to close drawer and continue
            const closeBtn = document.querySelector("[class*='close'], [aria-label*='close']");
            if (closeBtn) (closeBtn as HTMLElement).click();
            await sleep(1000);
            continue;
          }

          updateSpinner(`Lead ${leadNum}/${totalLeads}: Submitting…`);
          
          if (!await clickSubmitButton()) {
            console.error(`Failed to submit for lead ${leadNum}`);
            failCount++;
            continue;
          }

          console.log(`✓ Successfully updated lead ${leadNum}`);
          successCount++;

          // Wait for page to navigate back and fully load
          console.log("Waiting for page to navigate back...");
          await sleep(5000);
          
          // Verify we're back on the list page
          let retries = 0;
          while (!findSelector(selectors.leadCards) && retries < 3) {
            console.log("Lead list not ready, waiting more...");
            await sleep(2000);
            retries++;
          }

        } catch (error) {
          console.error(`Error processing lead ${leadNum}:`, error);
          failCount++;
          
          // Try to recover - navigate back to list
          if (window.location.href.includes('/referral/')) {
            window.history.back();
            await sleep(1500);
          }
        }
      }

      hideSpinner();

      // Send completion message
      const message = `Updated ${successCount} of ${totalLeads} leads` + 
                     (failCount > 0 ? ` (${failCount} failed)` : '');
      
      console.log(`\n=== COMPLETE ===`);
      console.log(message);

      chrome.runtime.sendMessage({
        type: "UPDATE_COMPLETE",
        payload: { 
          success: true, 
          message,
          stats: {
            total: totalLeads,
            success: successCount,
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

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "SCRAPE_LEADS") {
      showSpinner("Syncing leads…");
      scrapeAllLeads().then(leads => {
        hideSpinner();
        chrome.runtime.sendMessage({
          type: "LEADS_SCRAPED",
          payload: leads
        });
      });
    }

    if (msg.type === "TEST_AUTO_UPDATE") {
      runAutoUpdate();
    }
  });
})();

