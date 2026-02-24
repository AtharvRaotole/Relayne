"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  MessageSquare,
  Building2,
  Users,
  HardHat,
  ShieldCheck,
  Receipt,
  BarChart3,
  Bot,
  Settings,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/overview", icon: LayoutDashboard, label: "Overview" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/work-orders", icon: Wrench, label: "Work Orders", badge: 12, badgeVariant: "blue" as const },
      { href: "/escalations", icon: AlertTriangle, label: "Escalations", badge: 3, badgeVariant: "red" as const },
      { href: "/communications", icon: MessageSquare, label: "Communications", badge: 8, badgeVariant: "gray" as const },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/properties", icon: Building2, label: "Properties" },
      { href: "/tenants", icon: Users, label: "Tenants" },
      { href: "/vendors", icon: HardHat, label: "Vendors" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/compliance", icon: ShieldCheck, label: "Compliance", badge: 2, badgeVariant: "orange" as const },
      { href: "/invoices", icon: Receipt, label: "Invoices" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/analytics", icon: BarChart3, label: "Analytics" },
      { href: "/ai-activity", icon: Bot, label: "AI Activity" },
    ],
  },
];

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  badgeVariant,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  badgeVariant?: "blue" | "red" | "orange" | "gray";
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/overview" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
        isActive
          ? "bg-[var(--sidebar-surface)] font-medium text-white"
          : "text-[#64748b] hover:bg-[#141620] hover:text-[#94a3b8]"
      )}
    >
      <span className={cn("flex h-4 w-4 shrink-0", isActive ? "text-[var(--brand-400)]" : "")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && (
        <Badge variant={badgeVariant} size="xs" className="text-[10px]">
          {badge}
        </Badge>
      )}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 flex h-screen w-[240px] flex-col border-r"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      <div className="flex h-14 items-center border-b px-5" style={{ borderColor: "var(--sidebar-border)" }}>
        <Link href="/overview" className="flex items-center gap-2">
          <span
            className="text-sm font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Relayne
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-medium text-[#4a5568]">AI Active</span>
        </div>
      </div>

      <div className="border-b px-3 py-3" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: "var(--sidebar-surface)",
            color: "var(--sidebar-text)",
          }}
          onClick={() => {
            document.dispatchEvent(new CustomEvent("open-command-palette"));
          }}
        >
          <Search className="h-3.5 w-3.5" />
          Quick search...
          <kbd
            className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
            style={{ backgroundColor: "var(--sidebar-border)", color: "#64748b" }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "main"}>
            {group.label && (
              <p
                className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badge={"badge" in item ? item.badge : undefined}
                  badgeVariant={"badgeVariant" in item ? item.badgeVariant : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--sidebar-border)" }}>
        <div
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--sidebar-surface)]"
        >
          <Avatar className="h-7 w-7 text-xs">
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#e2e8f0]">
              Sarah Miller
            </p>
            <p className="truncate text-[10px] text-[#64748b]">
              Demo Property Co
            </p>
          </div>
          <Settings className="h-3.5 w-3.5 text-[#4a5568]" />
        </div>
      </div>
    </aside>
  );
}
