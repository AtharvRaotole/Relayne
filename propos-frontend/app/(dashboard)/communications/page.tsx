"use client";

import { useState } from "react";

export default function CommunicationsPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="grid h-[calc(100vh-180px)] grid-cols-[300px_1fr] gap-0 rounded-xl border border-gray-100 bg-white overflow-hidden shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <div className="flex flex-col border-r border-gray-100">
        <div className="flex gap-1 border-b border-gray-100 p-3">
          {["All", "Tenants", "Vendors", "Unread"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-sm text-gray-500">No threads yet</p>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="border-b border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-900">Select a thread</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center text-gray-500">
          Select a conversation from the list
        </div>
      </div>
    </div>
  );
}
