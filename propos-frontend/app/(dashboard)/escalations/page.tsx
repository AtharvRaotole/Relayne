"use client";

import { mockEscalations } from "@/lib/api/mock-data";
import { PriorityBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function EscalationsPage() {
  return (
    <div className="space-y-4">
      {mockEscalations.map((esc) => (
        <div
          key={esc.id}
          className={`rounded-xl border p-5 ${
            esc.priority === "EMERGENCY"
              ? "border-red-200 bg-white ring-1 ring-red-100"
              : "border-gray-100 bg-white"
          } shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]`}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <Bot className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {esc.description}
                </span>
                <PriorityBadge priority={esc.priority as any} />
              </div>
              <p className="mb-3 text-xs text-gray-500">
                {formatDistanceToNow(new Date(esc.createdAt), { addSuffix: true })}
              </p>
              <div className="mb-3 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-[var(--brand-600)]" />
                  <span className="text-xs font-semibold text-[var(--brand-700)]">
                    Relayne Recommendation
                  </span>
                </div>
                <p className="text-xs text-[var(--brand-700)]">{esc.suggestedAction}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-gray-950 text-white">
                  Resolve
                </Button>
                <Button size="sm" variant="outline">
                  Assign to me
                </Button>
                <Button size="sm" variant="ghost">
                  View context
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
