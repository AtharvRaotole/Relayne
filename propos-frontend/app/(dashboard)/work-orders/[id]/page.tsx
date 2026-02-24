"use client";

import { use } from "react";
import { mockWorkOrders } from "@/lib/api/mock-data";
import { PriorityBadge } from "@/components/shared";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Bot, UserPlus, MessageSquare, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const wo = mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <div>
          <PriorityBadge priority={wo.priority as any} />
          <h1
            className="mt-2 text-xl font-bold text-gray-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {wo.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {wo.property.name} · Unit {wo.unit?.unitNumber}
          </p>
        </div>

        <StatusBadge status={wo.status as any} />

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Description
          </h3>
          <p className="text-sm text-gray-700">{wo.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Details
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Category</dt>
              <dd className="font-medium text-gray-900">{wo.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium text-gray-900">
                {format(new Date(wo.createdAt), "MMM d, yyyy")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Vendor</dt>
              <dd className="font-medium text-gray-900">
                {wo.vendor?.companyName ?? "N/A"}
              </dd>
            </div>
          </dl>
        </div>

        {wo.aiHandled && (
          <div className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-3">
            <div className="mb-1 flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--brand-600)]" />
              <span className="text-xs font-semibold text-[var(--brand-700)]">
                Handled by AI
              </span>
            </div>
            <p className="text-xs text-[var(--brand-600)]">
              Confidence: {Math.round((wo.aiConfidence ?? 0) * 100)}%
            </p>
            <button className="mt-1 text-xs font-medium text-[var(--brand-700)] underline">
              View AI reasoning →
            </button>
          </div>
        )}

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            <UserPlus className="mr-2 h-3.5 w-3.5" /> Reassign Vendor
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <MessageSquare className="mr-2 h-3.5 w-3.5" /> Message Tenant
          </Button>
          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark Complete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-red-600 hover:text-red-700"
          >
            <AlertTriangle className="mr-2 h-3.5 w-3.5" /> Escalate
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] lg:col-span-7">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Activity Timeline
        </h3>
        <div className="rounded-xl border border-gray-200 p-3 mb-4">
          <textarea
            placeholder="Add a note or send a message..."
            className="w-full resize-none text-sm outline-none text-gray-700"
            rows={2}
          />
          <div className="mt-2 flex justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="xs">
                To Tenant
              </Button>
              <Button variant="ghost" size="xs">
                To Vendor
              </Button>
              <Button variant="ghost" size="xs">
                Internal Note
              </Button>
            </div>
            <Button size="xs">Send</Button>
          </div>
        </div>
        <p className="text-sm text-gray-500">No activity yet.</p>
      </div>
    </div>
  );
}
