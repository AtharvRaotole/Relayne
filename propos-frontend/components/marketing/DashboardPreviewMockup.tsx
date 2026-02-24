"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  MessageSquare,
  Building2,
  Users,
  HardHat,
  ShieldCheck,
  Bot,
  BarChart3,
} from "lucide-react";

export function DashboardPreviewMockup() {
  return (
    <motion.div
      className="bg-[var(--surface-page)] min-h-[400px]"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="flex">
        {/* Dark sidebar */}
        <aside
          className="w-[200px] flex-shrink-0 border-r p-3"
          style={{
            backgroundColor: "var(--sidebar-bg)",
            borderColor: "var(--sidebar-border)",
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <span
              className="text-sm font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              PropOS
            </span>
            <span className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-[var(--sidebar-text)]">AI</span>
            </span>
          </div>
          <div className="space-y-0.5">
            <NavItem icon={<LayoutDashboard className="h-4 w-4" />} active>
              Overview
            </NavItem>
            <NavItem icon={<Wrench className="h-4 w-4" />}>Work Orders</NavItem>
            <NavItem icon={<AlertTriangle className="h-4 w-4" />}>
              Escalations
            </NavItem>
            <NavItem icon={<MessageSquare className="h-4 w-4" />}>
              Communications
            </NavItem>
            <NavItem icon={<Building2 className="h-4 w-4" />}>Properties</NavItem>
            <NavItem icon={<Users className="h-4 w-4" />}>Tenants</NavItem>
            <NavItem icon={<HardHat className="h-4 w-4" />}>Vendors</NavItem>
            <NavItem icon={<ShieldCheck className="h-4 w-4" />}>
              Compliance
            </NavItem>
            <NavItem icon={<BarChart3 className="h-4 w-4" />}>Analytics</NavItem>
            <NavItem icon={<Bot className="h-4 w-4" />}>AI Activity</NavItem>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Overview — Portfolio trending up
            </h2>
            <span className="text-xs text-gray-400">Last 7 days</span>
          </div>

          {/* KPI cards row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Open WOs", value: "47", delta: "-12" },
              { label: "AI Rate", value: "78%", delta: "+3%" },
              { label: "Escalations", value: "3", delta: "-1" },
              { label: "Compliance", value: "5", delta: "0" },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-white p-3 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]"
              >
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] text-green-600">↑ {stat.delta}</p>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]"
            style={{ minHeight: 120 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs font-medium text-gray-700">
                Work Order Activity
              </span>
              <span className="text-[10px] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" />
                Created
              </span>
              <span className="text-[10px] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Resolved
              </span>
            </div>
            <div className="h-16 flex items-end gap-1">
              {[40, 55, 45, 70, 60, 50, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-[var(--brand-500)]/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Table preview */}
          <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Work Order
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Handler
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { title: "HVAC repair - Unit 4B", status: "In Progress", ai: true },
                  { title: "Leak inspection - Unit 2A", status: "Dispatched", ai: true },
                  { title: "Appliance replacement", status: "Completed", ai: false },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.title}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          row.status === "Completed"
                            ? "bg-green-50 text-green-700"
                            : row.status === "In Progress"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row.ai ? (
                        <span className="flex items-center gap-1 text-[var(--brand-600)]">
                          <Bot className="h-2.5 w-2.5" /> AI
                        </span>
                      ) : (
                        <span className="text-gray-500">Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NavItem({
  icon,
  children,
  active,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
        active
          ? "bg-[var(--sidebar-surface)] text-white font-medium"
          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-surface)]/50 hover:text-[var(--sidebar-text-active)]"
      }`}
    >
      <span className={active ? "text-[var(--brand-400)]" : ""}>{icon}</span>
      {children}
    </div>
  );
}
