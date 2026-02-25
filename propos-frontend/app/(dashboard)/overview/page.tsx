"use client";

import { useEffect, useState } from "react";
import { Wrench, Bot, AlertTriangle, ShieldCheck } from "lucide-react";
import { mockWorkOrders, mockDailyActivity, mockEscalations } from "@/lib/api/mock-data";
import { DemoTriggerButton } from "@/components/dashboard/DemoTriggerButton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  iconBg,
  urgent,
}: {
  label: string;
  value: string | number;
  delta?: { value: number; label: string; positive?: boolean };
  icon: React.ElementType;
  iconBg: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        urgent ? "border-red-200 ring-1 ring-red-100" : "border-gray-100"
      } bg-white shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]`}
    >
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p
        className="mb-1 text-2xl font-bold text-gray-950"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {delta && (
        <p
          className={`text-xs ${delta.positive ? "text-green-600" : "text-red-500"}`}
        >
          {delta.positive ? "↑" : "↓"} {Math.abs(delta.value)}{" "}
          {delta.label}
        </p>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const [demoContext, setDemoContext] = useState<{
    demoTenantId: string;
    demoPropertyId: string;
  } | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) return;
    fetch(`${baseUrl}/demo/context`, {
      headers: { "x-demo-mode": "demo-propos-2024" },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json?.data) {
          setDemoContext(json.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Work Orders"
          value={47}
          delta={{ value: 12, label: "vs last week", positive: true }}
          icon={Wrench}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="AI Resolution Rate"
          value="78%"
          delta={{ value: 3.2, label: "vs last month", positive: true }}
          icon={Bot}
          iconBg="bg-[var(--brand-50)] text-[var(--brand-600)]"
        />
        <StatCard
          label="Escalations Open"
          value={3}
          delta={{ value: 1, label: "vs yesterday", positive: true }}
          icon={AlertTriangle}
          iconBg="bg-red-50 text-red-600"
          urgent={3 > 0}
        />
        <StatCard
          label="Compliance Tasks Due"
          value={5}
          delta={{ value: 0, label: "this week" }}
          icon={ShieldCheck}
          iconBg="bg-orange-50 text-orange-600"
          urgent={5 > 3}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Work Order Activity
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Tickets created vs resolved
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-500)]" />
                Created
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Resolved
              </span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockDailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="var(--brand-500)"
                  fill="var(--brand-500)"
                  fillOpacity={0.2}
                  name="Created"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            AI Automation
          </h3>
          <div className="flex justify-center">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--brand-500)"
                  strokeWidth="8"
                  strokeDasharray={`${78 * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-2xl font-bold text-gray-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  78%
                </span>
                <span className="text-xs text-gray-500">automated</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Tickets handled autonomously</span>
              <span className="font-medium text-gray-900">78</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Hours saved this month</span>
              <span className="font-medium text-gray-900">312h</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg handling time</span>
              <span className="font-medium text-gray-900">4.2 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent work orders */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Recent Work Orders</h3>
          {demoContext ? (
            <DemoTriggerButton
              label="Demo: Simulate Tenant Request"
              message="Hi, my HVAC stopped working last night, it's really hot. Unit 4B. - Marcus"
              tenantId={demoContext.demoTenantId}
              propertyId={demoContext.demoPropertyId}
            />
          ) : (
            <span className="text-xs text-gray-400">Loading demo…</span>
          )}
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                Work Order
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                Handler
              </th>
            </tr>
          </thead>
          <tbody>
            {mockWorkOrders.map((wo) => (
              <tr
                key={wo.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">{wo.title}</p>
                  <p className="text-xs text-gray-400">
                    {wo.property.name} · Unit {wo.unit?.unitNumber}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                      wo.status === "COMPLETED"
                        ? "bg-green-50 text-green-700"
                        : wo.status === "IN_PROGRESS"
                          ? "bg-amber-50 text-amber-700"
                          : wo.status === "DISPATCHED"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {wo.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {wo.aiHandled ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--brand-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand-700)]">
                      <Bot className="h-2.5 w-2.5" /> AI
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Manual</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
