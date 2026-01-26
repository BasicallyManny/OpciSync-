import { useEffect, useState } from "react";
import type { Lead } from "./types/types";

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  const sync = async () => {
    setLoading(true);

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    chrome.runtime.sendMessage({
      type: "START_SYNC",
      tabId: tab.id
    });
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === "LEADS_SYNCED") {
        setLeads(msg.payload);
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="w-90 p-4 text-sm">
      <button
        onClick={sync}
        disabled={loading}
        className="mb-3 w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Syncing…" : "Sync Leads"}
      </button>

      <div className="space-y-2">
        {leads.map((lead, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded border p-2"
          >
            <div>
              <div className="font-semibold">{lead.name}</div>
              <div className="text-xs text-gray-500">
                Updated {lead.lastUpdated}
              </div>
            </div>

            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium">
              {lead.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}