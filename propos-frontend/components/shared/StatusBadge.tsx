"use client";

import { cn } from "@/lib/utils";

export type WorkOrderStatus =
  | "NEW"
  | "TRIAGED"
  | "DISPATCHED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ESCALATED"
  | "PENDING_REVIEW";

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  NEW: "bg-gray-50 text-gray-600",
  TRIAGED: "bg-purple-50 text-purple-700",
  DISPATCHED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-green-50 text-green-700",
  ESCALATED: "bg-red-50 text-red-700",
  PENDING_REVIEW: "bg-yellow-50 text-yellow-700",
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  NEW: "New",
  TRIAGED: "Triaged",
  DISPATCHED: "Dispatched",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ESCALATED: "Escalated",
  PENDING_REVIEW: "Pending Review",
};

interface StatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
  const label = STATUS_LABELS[status] ?? status;

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
