"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Wrench,
  AlertTriangle,
  MessageSquare,
  Building2,
  Users,
  HardHat,
  ShieldCheck,
  BarChart3,
  Bot,
} from "lucide-react";

const COMMANDS = [
  { href: "/overview", icon: LayoutDashboard, label: "Go to Overview" },
  { href: "/work-orders", icon: Wrench, label: "Work Orders" },
  { href: "/escalations", icon: AlertTriangle, label: "Escalations" },
  { href: "/communications", icon: MessageSquare, label: "Communications" },
  { href: "/properties", icon: Building2, label: "Properties" },
  { href: "/tenants", icon: Users, label: "Tenants" },
  { href: "/vendors", icon: HardHat, label: "Vendors" },
  { href: "/compliance", icon: ShieldCheck, label: "Compliance" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/ai-activity", icon: Bot, label: "AI Activity" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openPalette = () => setOpen(true);
    document.addEventListener("keydown", down);
    document.addEventListener("open-command-palette", openPalette);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-palette", openPalette);
    };
  }, []);

  const runCommand = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {COMMANDS.map((cmd) => (
            <CommandItem
              key={cmd.href}
              onSelect={() => runCommand(cmd.href)}
            >
              <cmd.icon className="mr-2 h-4 w-4" />
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
