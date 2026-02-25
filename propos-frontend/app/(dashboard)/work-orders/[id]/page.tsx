"use client";

import { use, useEffect, useState } from "react";
import { mockWorkOrders } from "@/lib/api/mock-data";
import { getApiBaseUrl, getApiHeaders } from "@/lib/api/client";
import { PriorityBadge } from "@/components/shared";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Bot, UserPlus, MessageSquare, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type TimelineEvent = {
  id: string;
  eventType: string;
  description: string;
  actorType: string;
  createdAt: string;
};

type WorkOrderDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  property?: { name: string };
  unit?: { unitNumber: string };
  tenant?: { id: string; email?: string | null; firstName?: string; lastName?: string } | null;
  vendor?: { id: string; companyName?: string; email?: string | null } | null;
  sourceChannel?: string | null;
};

const ACTIVITY_TYPE = {
  TO_TENANT: "to_tenant",
  TO_VENDOR: "to_vendor",
  INTERNAL_NOTE: "internal_note",
} as const;
type ActivityType = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [wo, setWo] = useState<WorkOrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [message, setMessage] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>(ACTIVITY_TYPE.TO_TENANT);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const baseUrl = getApiBaseUrl();
  const headers = getApiHeaders();

  useEffect(() => {
    if (!baseUrl) {
      const mock = mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0];
      setWo(mock as unknown as WorkOrderDetail);
      setUseMock(true);
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${baseUrl}/work-orders/${id}`, { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject(r)
      ),
      fetch(`${baseUrl}/work-orders/${id}/timeline`, { headers }).then((r) =>
        r.ok ? r.json() : { success: true, data: [] }
      ),
    ])
      .then(([detailRes, timelineRes]) => {
        if (detailRes.success && detailRes.data) {
          setWo(detailRes.data);
          setTimeline(Array.isArray(timelineRes?.data) ? timelineRes.data : []);
        } else {
          const mock = mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0];
          setWo(mock as unknown as WorkOrderDetail);
          setUseMock(true);
        }
      })
      .catch(() => {
        const mock = mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0];
        setWo(mock as unknown as WorkOrderDetail);
        setUseMock(true);
      })
      .finally(() => setLoading(false));
  }, [id, baseUrl]);

  const refetchTimeline = () => {
    if (!baseUrl) return;
    fetch(`${baseUrl}/work-orders/${id}/timeline`, { headers })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setTimeline(Array.isArray(json?.data) ? json.data : []));
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;
    if (!baseUrl) {
      setSendError("API not configured.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      if (activityType === ACTIVITY_TYPE.INTERNAL_NOTE) {
        const res = await fetch(`${baseUrl}/work-orders/${id}/note`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ body: text }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || "Failed to add note");
        }
        const json = await res.json();
        setTimeline(Array.isArray(json?.data) ? json.data : []);
        setMessage("");
        return;
      }
      if (activityType === ACTIVITY_TYPE.TO_TENANT && wo?.tenant?.id) {
        const to = (wo.tenant as { email?: string }).email ?? "";
        if (!to) {
          setSendError("Tenant has no email on file.");
          return;
        }
        const res = await fetch(`${baseUrl}/communications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            to,
            channel: "EMAIL",
            body: text,
            workOrderId: id,
            tenantId: wo.tenant.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || "Failed to send to tenant");
        }
        const summary = text.length > 60 ? `${text.slice(0, 60)}…` : text;
        await fetch(`${baseUrl}/work-orders/${id}/note`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ body: `Message sent to tenant: ${summary}` }),
        });
        refetchTimeline();
        setMessage("");
        return;
      }
      if (activityType === ACTIVITY_TYPE.TO_VENDOR && wo?.vendor?.id) {
        const to = (wo.vendor as { email?: string }).email ?? "";
        if (!to) {
          setSendError("Vendor has no email on file.");
          return;
        }
        const res = await fetch(`${baseUrl}/communications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            to,
            channel: "EMAIL",
            body: text,
            workOrderId: id,
            vendorId: wo.vendor.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || "Failed to send to vendor");
        }
        const summary = text.length > 60 ? `${text.slice(0, 60)}…` : text;
        await fetch(`${baseUrl}/work-orders/${id}/note`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ body: `Message sent to vendor: ${summary}` }),
        });
        refetchTimeline();
        setMessage("");
        return;
      }
      if (activityType === ACTIVITY_TYPE.TO_TENANT) setSendError("This work order has no tenant.");
      else if (activityType === ACTIVITY_TYPE.TO_VENDOR) setSendError("This work order has no vendor.");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  if (loading || !wo) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        {loading ? "Loading…" : "Work order not found."}
      </div>
    );
  }

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
            {wo.property?.name ?? "—"} · Unit {wo.unit?.unitNumber ?? "—"}
          </p>
        </div>

        <StatusBadge status={wo.status as any} />

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Description
          </h3>
          <p className="text-sm text-gray-700">{wo.description ?? "—"}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Details
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Category</dt>
              <dd className="font-medium text-gray-900">{wo.category?.replace(/_/g, " ") ?? "—"}</dd>
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

        {wo.sourceChannel && (
          <div className="rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-3">
            <div className="mb-1 flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--brand-600)]" />
              <span className="text-xs font-semibold text-[var(--brand-700)]">
                Handled by AI
              </span>
            </div>
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
            className="w-full resize-none text-sm outline-none text-gray-700 border-0 focus:ring-0 focus:outline-none"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="mt-2 flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="xs"
                className={activityType === ACTIVITY_TYPE.TO_TENANT ? "bg-gray-100" : ""}
                onClick={() => setActivityType(ACTIVITY_TYPE.TO_TENANT)}
              >
                To Tenant
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className={activityType === ACTIVITY_TYPE.TO_VENDOR ? "bg-gray-100" : ""}
                onClick={() => setActivityType(ACTIVITY_TYPE.TO_VENDOR)}
              >
                To Vendor
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className={activityType === ACTIVITY_TYPE.INTERNAL_NOTE ? "bg-gray-100" : ""}
                onClick={() => setActivityType(ACTIVITY_TYPE.INTERNAL_NOTE)}
              >
                Internal Note
              </Button>
            </div>
            <Button size="xs" onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
          {sendError && (
            <p className="mt-2 text-xs text-red-600">{sendError}</p>
          )}
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {timeline.map((ev) => (
              <li key={ev.id} className="border-l-2 border-gray-200 pl-3 py-1">
                <p className="text-xs text-gray-500">
                  {format(new Date(ev.createdAt), "MMM d, yyyy HH:mm")} · {ev.eventType.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-gray-800">{ev.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
