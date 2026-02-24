"use client";

import { useRouter } from "next/navigation";
import { Bot, User } from "lucide-react";
import { mockWorkOrders } from "@/lib/api/mock-data";
import { StatusBadge } from "@/components/shared";
import { PriorityBadge, PRIORITY_DOTS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function WorkOrdersPage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            Status
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            Priority
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            Property
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search work orders..."
              className="h-8 w-60 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm"
            />
          </div>
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Work Order
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Title
              </th>
              <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500">
                Category
              </th>
              <th className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500">
                Vendor
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500">
                Handler
              </th>
              <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {mockWorkOrders.map((wo) => (
              <tr
                key={wo.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/work-orders/${wo.id}`)}
              >
                <td className="px-4 py-3">
                  <div
                    className={`mx-auto h-2 w-2 rounded-full ${PRIORITY_DOTS[wo.priority as keyof typeof PRIORITY_DOTS]}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {wo.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {wo.property.name} · Unit {wo.unit?.unitNumber || "N/A"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {wo.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={wo.status as any} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 truncate max-w-[120px]">
                  {wo.vendor?.companyName || "N/A"}
                </td>
                <td className="px-4 py-3">
                  {wo.aiHandled ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--brand-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand-700)]">
                      <Bot className="h-2.5 w-2.5" /> AI
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      <User className="h-2.5 w-2.5" /> Manual
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(wo.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
