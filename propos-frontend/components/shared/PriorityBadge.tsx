"use client";

import { cn } from "@/lib/utils";

export type Priority = "EMERGENCY" | "HIGH" | "NORMAL" | "LOW";

const PRIORITY_STYLES: Record<Priority, string> = {
  EMERGENCY: "bg-red-50 text-red-700 ring-1 ring-red-200",
  HIGH: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  NORMAL: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  LOW: "bg-gray-50 text-gray-600 ring-1 ring-gray-200",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  EMERGENCY: "Emergency",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

export const PRIORITY_DOTS: Record<Priority, string> = {
  EMERGENCY: "bg-red-500",
  HIGH: "bg-orange-500",
  NORMAL: "bg-blue-500",
  LOW: "bg-gray-400",
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.NORMAL;
  const label = PRIORITY_LABELS[priority] ?? priority;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
