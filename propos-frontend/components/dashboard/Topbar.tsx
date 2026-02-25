"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/work-orders": "Work Orders",
  "/tenants": "Tenants",
  "/vendors": "Vendors",
  "/compliance": "Compliance",
  "/communications": "Communications",
  "/escalations": "Escalations",
  "/analytics": "Analytics",
  "/ai-activity": "AI Activity",
};

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500">
      {segments.map((seg, i) => (
        <span key={seg} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-4 w-4 text-gray-300" />}
          <Link
            href={`/${segments.slice(0, i + 1).join("/")}`}
            className="hover:text-gray-700 capitalize"
          >
            {seg}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const basePath = "/" + pathname.split("/")[1];
  const title = PAGE_TITLES[basePath] ?? "Dashboard";

  const [agentStats, setAgentStats] = useState<{
    totalRuns: number;
    completedCount: number;
    escalatedCount: number;
    failedCount: number;
  } | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) return;

    let isMounted = true;

    async function fetchStats() {
      try {
        const res = await fetch(`${baseUrl}/agent/stats`, {
          headers: {
            "Content-Type": "application/json",
            "x-demo-mode": "demo-propos-2024",
          },
        });
        const json = await res.json();
        if (!isMounted) return;
        const data = json?.data;
        if (data) {
          setAgentStats({
            totalRuns: data.totalRuns ?? 0,
            completedCount: data.completedCount ?? 0,
            escalatedCount: data.escalatedCount ?? 0,
            failedCount: data.failedCount ?? 0,
          });
        }
      } catch {
        if (!isMounted) return;
        setAgentStats(null);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeCount =
    agentStats?.totalRuns && agentStats
      ? Math.max(
          0,
          agentStats.totalRuns -
            agentStats.completedCount -
            agentStats.escalatedCount -
            agentStats.failedCount,
        )
      : 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6">
      <h1
        className="text-sm font-semibold text-gray-900"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        {agentStats && activeCount > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--brand-100)] bg-[var(--brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--brand-700)]">
            <div className="h-3 w-3 rounded-full border-2 border-[var(--brand-500)] border-t-transparent animate-spin" />
            AI handling {activeCount} tickets
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            AI standing by
          </div>
        )}
      </div>
    </header>
  );
}
