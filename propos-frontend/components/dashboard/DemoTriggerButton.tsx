"use client";

import { useState } from "react";

interface DemoTriggerButtonProps {
  label: string;
  message: string;
  tenantId: string;
  propertyId?: string;
}

export function DemoTriggerButton({
  label,
  message,
  tenantId,
  propertyId,
}: DemoTriggerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function triggerDemo() {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
      await fetch(`${baseUrl}/demo/inbound-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Demo-mode auth bypass header – must match backend DEMO_SECRET
          "x-demo-mode": "demo-propos-2024",
        },
        body: JSON.stringify({
          tenantId,
          propertyId,
          message,
        }),
      });

      // Simple polling of latest agent log to know when AI is done
      const pollStart = Date.now();
      const pollTimeoutMs = 30_000;

      async function pollOnce(): Promise<void> {
        const res = await fetch(`${baseUrl}/agent/logs?limit=1`, {
          headers: {
            "Content-Type": "application/json",
            "x-demo-mode": "demo-propos-2024",
          },
        });
        const json = await res.json();
        const latest = json?.data?.[0];
        if (latest?.status === "COMPLETED") {
          setIsLoading(false);
          return;
        }
        if (Date.now() - pollStart > pollTimeoutMs) {
          setIsLoading(false);
          return;
        }
        setTimeout(pollOnce, 2000);
      }

      setTimeout(pollOnce, 2000);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={triggerDemo}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-full bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-[var(--brand-700)] disabled:opacity-60"
    >
      {label}
    </button>
  );
}

