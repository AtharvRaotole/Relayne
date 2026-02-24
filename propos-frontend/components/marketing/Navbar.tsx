"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 h-[60px] border-b border-gray-100"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-950">
            <div className="grid grid-cols-2 gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-[2px] ${
                    i === 3 ? "bg-gray-400" : "bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
          <span
            className="text-[17px] font-bold tracking-tight text-gray-950"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Relayne
          </span>
        </Link>

        {/* Center nav - hidden on mobile */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/overview"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Docs
          </Link>
          <Link
            href="/careers"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Careers
          </Link>
        </nav>

        {/* Right: CTA buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="h-9 bg-gray-950 px-4 text-white hover:bg-gray-800"
            asChild
          >
            <Link href="/register">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
