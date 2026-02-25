"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, User } from "lucide-react";
import { mockWorkOrders } from "@/lib/api/mock-data";
import { getApiBaseUrl, getApiHeaders } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared";
import { PRIORITY_DOTS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type WorkOrderItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  property?: { name: string };
  unit?: { unitNumber: string };
  vendor?: { companyName: string } | null;
  sourceChannel?: string | null;
};

const WORK_ORDER_CATEGORIES = [
  "PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PEST_CONTROL",
  "LANDSCAPING", "CLEANING", "PAINTING", "FLOORING", "ROOFING", "SECURITY",
  "ELEVATOR", "FIRE_SAFETY", "GENERAL_MAINTENANCE", "EMERGENCY", "OTHER",
] as const;

const PRIORITIES = ["NORMAL", "LOW", "HIGH", "EMERGENCY"] as const;

export default function WorkOrdersPage() {
  const router = useRouter();
  const [list, setList] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; unitNumber: string }[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    unitId: "",
    tenantId: "",
    title: "",
    description: "",
    category: "GENERAL_MAINTENANCE",
    priority: "NORMAL",
  });

  const baseUrl = getApiBaseUrl();
  const headers = getApiHeaders();

  const fetchList = () => {
    if (!baseUrl) return;
    setLoading(true);
    fetch(`${baseUrl}/work-orders?limit=100`, { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((json: { success?: boolean; data?: { items: WorkOrderItem[] } }) => {
        if (json.success && json.data?.items) setList(json.data.items);
        else setList(mockWorkOrders as WorkOrderItem[]);
      })
      .catch(() => setList(mockWorkOrders as WorkOrderItem[]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!baseUrl) {
      setList(mockWorkOrders as WorkOrderItem[]);
      setLoading(false);
      return;
    }
    fetchList();
  }, [baseUrl]);

  useEffect(() => {
    if (!createOpen || !baseUrl) return;
    setPropertiesLoading(true);
    fetch(`${baseUrl}/properties?page=1&limit=100`, { headers })
      .then((res) => res.json().catch(() => ({ success: false })))
      .then((json: { success?: boolean; data?: { items?: { id: string; name: string }[] } }) => {
        const items = json.success && json.data && Array.isArray(json.data.items)
          ? json.data.items
          : Array.isArray((json.data as any)?.items)
          ? (json.data as { items: { id: string; name: string }[] }).items
          : [];
        setProperties(items);
      })
      .catch(() => setProperties([]))
      .finally(() => setPropertiesLoading(false));
  }, [createOpen, baseUrl]);

  useEffect(() => {
    if (!form.propertyId || !baseUrl) {
      setUnits([]);
      return;
    }
    fetch(`${baseUrl}/properties/${form.propertyId}/units`, { headers })
      .then((res) => res.json().catch(() => ({ success: false, data: [] })))
      .then((json: { success?: boolean; data?: Array<{ id: string; unitNumber: string }> }) => {
        const list = json.success && Array.isArray(json.data) ? json.data : [];
        setUnits(list);
      })
      .catch(() => setUnits([]));
  }, [form.propertyId, baseUrl]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl || !form.propertyId?.trim() || !form.title?.trim() || !form.description?.trim()) {
      setCreateError("Property, title, and description are required.");
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch(`${baseUrl}/work-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          propertyId: form.propertyId,
          unitId: form.unitId || undefined,
          tenantId: form.tenantId || undefined,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to create work order");
      }
      if (json.success && json.data?.id) {
        setCreateOpen(false);
        setForm({ propertyId: "", unitId: "", tenantId: "", title: "", description: "", category: "GENERAL_MAINTENANCE", priority: "NORMAL" });
        fetchList();
        router.push(`/work-orders/${json.data.id}`);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create work order");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const displayList = list.length ? list : (mockWorkOrders as WorkOrderItem[]);
  const canCreate = !!baseUrl;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            Status
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            Priority
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            Property
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search work orders..."
              className="h-8 w-60 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm"
            />
          </div>
          <Button size="sm" onClick={() => canCreate && setCreateOpen(true)} disabled={!canCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Work Order
          </Button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Work Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
              <select
                required
                value={form.propertyId}
                onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value, unitId: "" }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={propertiesLoading}
              >
                <option value="">
                  {propertiesLoading ? "Loading…" : "Select property"}
                </option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {!propertiesLoading && properties.length === 0 && baseUrl && (
                <p className="mt-1 text-xs text-amber-600">
                  No properties found. Add a property first or check the backend is running with demo mode.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={form.unitId}
                onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={!form.propertyId}
              >
                <option value="">No unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.unitNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Leak under kitchen sink"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {WORK_ORDER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading work orders…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Title
                </th>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Category
                </th>
                <th className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Vendor
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Handler
                </th>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((wo) => (
                <tr
                  key={wo.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/work-orders/${wo.id}`)}
                >
                  <td className="px-4 py-3">
                    <div
                      className={`mx-auto h-2 w-2 rounded-full ${PRIORITY_DOTS[wo.priority as keyof typeof PRIORITY_DOTS] ?? PRIORITY_DOTS.NORMAL}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {wo.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {wo.property?.name ?? "—"} · Unit {wo.unit?.unitNumber ?? "N/A"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {wo.category?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wo.status as any} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 truncate max-w-[120px]">
                    {wo.vendor?.companyName ?? "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {wo.sourceChannel ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--brand-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand-700)]">
                        <Bot className="h-2.5 w-2.5" /> AI
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        <User className="h-2.5 w-2.5" /> Manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
