"use client";

import { mockDailyActivity } from "@/lib/api/mock-data";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <button className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
          Last 30 days
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Work Order Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockDailyActivity}>
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
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="var(--brand-500)"
                  strokeWidth={2}
                  name="Created"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Portfolio Benchmarks
          </h3>
          <p className="text-sm text-gray-500">Peer group: 800–4,000 units</p>
          <div className="mt-4 space-y-4">
            <BenchmarkRow label="AI Resolution Rate" yours={78} peer={55} unit="%" />
            <BenchmarkRow label="Avg Resolution Time" yours={18} peer={32} unit="hrs" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BenchmarkRow({
  label,
  yours,
  peer,
  unit,
}: {
  label: string;
  yours: number;
  peer: number;
  unit: string;
}) {
  const max = Math.max(yours, peer);
  const yoursPct = (yours / max) * 100;
  const peerPct = (peer / max) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span>
          You: {yours}{unit} · Peer: {peer}{unit}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--brand-500)] rounded-full"
            style={{ width: `${yoursPct}%` }}
          />
        </div>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-300 rounded-full"
            style={{ width: `${peerPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
