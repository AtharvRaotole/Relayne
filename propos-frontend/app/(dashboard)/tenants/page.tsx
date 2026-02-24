"use client";

import { mockTenants } from "@/lib/api/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function TenantsPage() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mockTenants.map((tenant) => {
        const churnColor =
          tenant.churnRiskScore > 0.6
            ? "red"
            : tenant.churnRiskScore > 0.35
              ? "amber"
              : "green";
        return (
          <div
            key={tenant.id}
            className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] transition-colors hover:border-gray-200"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback>
                    {tenant.firstName[0]}
                    {tenant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {tenant.firstName} {tenant.lastName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {tenant.unit?.unitNumber} · {tenant.unit?.property?.name}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  churnColor === "red" && "bg-red-50 text-red-600",
                  churnColor === "amber" && "bg-amber-50 text-amber-600",
                  churnColor === "green" && "bg-green-50 text-green-600"
                )}
              >
                {Math.round(tenant.churnRiskScore * 100)}% churn risk
              </span>
            </div>
            {tenant.daysUntilLeaseEnd != null && (
              <p className="mb-2 text-xs text-gray-500">
                Lease ends in{" "}
                <strong>{tenant.daysUntilLeaseEnd} days</strong>
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-3">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-900">
                  {tenant.openWorkOrders}
                </p>
                <p className="text-[10px] text-gray-500">Open WOs</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-900">
                  {tenant.messageCount}
                </p>
                <p className="text-[10px] text-gray-500">Messages</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-gray-900">
                  {Math.round(tenant.satisfactionScore * 100)}%
                </p>
                <p className="text-[10px] text-gray-500">Satisfaction</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
