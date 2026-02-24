"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function Navbar() {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 h-[64px] border-b border-white/[0.06]"
      style={{
        background: "rgba(8,8,12,0.85)",
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-400/5 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors">
            <div className="grid grid-cols-2 gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-[2px] ${
                    i === 3 ? "bg-cyan-400" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
          <span
            className="text-[17px] font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Relayne
          </span>
        </Link>

        {/* Center nav - hidden on mobile */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "Dashboard", href: "/overview" },
            { label: "Pricing", href: "/pricing" },
            { label: "Docs", href: "/docs" },
            { label: "Careers", href: "/careers" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: CTA */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-sm text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-lg bg-cyan-500 text-white px-5 font-semibold hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_24px_rgba(34,211,238,0.25)] transition-all duration-200"
            asChild
          >
            <Link href="/register">
              Launch App
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
