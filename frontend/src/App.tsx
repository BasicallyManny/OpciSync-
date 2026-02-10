import { useEffect, useState } from "react";
import type { Lead } from "./types/types";
import logo from "../public/icons/icon48.png";
export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [hasSynced, setHasSynced] = useState(false);

  const sync = async () => {
    setLoading(true);
    setError("");
    setUpdateStatus("");
    setHasSynced(false);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab.id) {
        setError("No active tab found");
        setLoading(false);
        return;
      }

      if (!tab.url?.includes("opcity.com")) {
        setError("Please navigate to an OpCity page");
        setLoading(false);
        return;
      }

      chrome.runtime.sendMessage({
        type: "START_SYNC",
        tabId: tab.id
      });
    } catch (err) {
      setError("Failed to start sync");
      setLoading(false);
      console.error(err);
    }
  };

  const testAutoUpdate = async () => {
    setUpdateStatus("Testing auto-update...");
    setError("");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab.id) {
        setError("No active tab found");
        setUpdateStatus("");
        return;
      }

      if (!tab.url?.includes("opcity.com")) {
        setError("Please navigate to an OpCity page");
        setUpdateStatus("");
        return;
      }

      // Send message through background script to ensure content script is injected
      chrome.runtime.sendMessage({
        type: "START_AUTO_UPDATE",
        tabId: tab.id
      });
    } catch (err) {
      setError("Failed to auto-update");
      setUpdateStatus("");
      console.error(err);
    }
  };

  useEffect(() => {
    type LeadsSyncedMessage = { type: "LEADS_SYNCED"; payload: Lead[] };
    type UpdateCompleteMessage = { type: "UPDATE_COMPLETE"; payload: { success: boolean; message: string } };
    type RuntimeMessage = LeadsSyncedMessage | UpdateCompleteMessage;

    const listener = (msg: RuntimeMessage) => {
      console.log("Popup received message:", msg);

      if (msg.type === "LEADS_SYNCED") {
        setLeads(msg.payload);
        setLoading(false);
        setHasSynced(true); // Enable update button after successful sync
      }

      if (msg.type === "UPDATE_COMPLETE") {
        if (msg.payload.success) {
          setUpdateStatus(`✓ ${msg.payload.message}`);
        } else {
          setError(`✗ ${msg.payload.message}`);
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SPOKE":
        return "bg-green-100 text-green-800";
      case "MET":
        return "bg-blue-100 text-blue-800";
      case "OFFER":
        return "bg-yellow-100 text-yellow-800";
      case "CONTRACT":
        return "bg-purple-100 text-purple-800";
      case "CLOSE":
        return "bg-gray-800 text-white";
      case "Negotiating Lease":
        return "bg-orange-100 text-orange-800";
      case "Unknown":
        return "bg-red-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="relative w-96 bg-gray-50 p-4 text-sm text-gray-800">
      {/* LOADING OVERLAY */}
      {loading && (
        <div className="absolute inset-0 bg-gray-300 z-50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-400 border-t-orange-500 mb-3" />
          <span className="text-gray-700 font-medium">Syncing leads…</span>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-4 flex items-center gap-2">
        <img src={logo} alt="NextHome" className="h-8 w-8" />
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            OpCity Lead Sync
          </h1>
          <p className="text-xs text-gray-500">
            NextHome Automation
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="space-y-2 mb-3">
        <button
          onClick={sync}
          disabled={loading}
          className="w-full rounded bg-orange-500 py-2 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sync Leads
        </button>

        {hasSynced && (
          <button
            onClick={testAutoUpdate}
            disabled={loading}
            className="w-full rounded bg-gray-700 py-2 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Auto-Update
          </button>
        )}
      </div>

      {/* STATUS MESSAGES */}
      {error && (
        <div className="mb-2 rounded bg-red-100 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {updateStatus && (
        <div className="mb-2 rounded bg-green-100 p-2 text-xs text-green-700">
          {updateStatus}
        </div>
      )}

      {leads.length > 0 && (
        <div className="mb-2 text-xs text-gray-500">
          Found {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* LEAD LIST */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leads.map((lead, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-2 hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{lead.name}</div>
              <div className="text-xs text-gray-500">
                {lead.lastUpdated}
              </div>
            </div>

            <span
              className={`ml-2 rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${getStatusColor(
                lead.status
              )}`}
            >
              {lead.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}