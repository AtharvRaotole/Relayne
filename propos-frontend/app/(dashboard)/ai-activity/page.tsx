"use client";

import { useState } from "react";
import { mockAgentLogs } from "@/lib/api/mock-data";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AIActivityPage() {
  return (
    <div className="space-y-3">
      {mockAgentLogs.map((log) => (
        <AgentLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}

function AgentLogCard({ log }: { log: (typeof mockAgentLogs)[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <div
        className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            log.status === "COMPLETED"
              ? "bg-green-100 text-green-700"
              : log.status === "ESCALATED"
                ? "bg-orange-100 text-orange-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          ✓
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {log.finalAction ?? log.workflowType}
          </p>
          <p className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })} · {log.durationMs}ms · {log.tokensUsed.toLocaleString()} tokens
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
            {log.workflowType}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="space-y-2 bg-gray-50 px-4 py-3">
          {log.steps?.map((step, i) => (
            <div key={i} className="font-mono text-xs">
              <span className="text-gray-400">#{i + 1}</span>
              {step.toolCalls?.map((call: any, j: number) => (
                <div key={j} className="ml-4 mt-1">
                  <span className="text-[var(--brand-600)]">→ {call.tool}</span>
                  <span className="ml-2 text-gray-400">
                    {JSON.stringify(call.input).slice(0, 60)}...
                  </span>
                </div>
              ))}
            </div>
          ))}
          {log.reasoning && (
            <div className="mt-2 rounded-lg border border-gray-100 bg-white p-2.5 text-xs italic text-gray-600">
              "{log.reasoning.slice(0, 200)}..."
            </div>
          )}
        </div>
      )}
    </div>
  );
}
