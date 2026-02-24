"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 ml-[240px]">
        <Topbar />
        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: "var(--surface-page)" }}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
