"use client";

import { mockVendors } from "@/lib/api/mock-data";
import { cn } from "@/lib/utils";

export default function VendorsPage() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Vendor</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Trades</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Response</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Rating</th>
          </tr>
        </thead>
        <tbody>
          {mockVendors.map((v) => (
            <tr
              key={v.id}
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{v.companyName}</p>
                <p className="text-xs text-gray-400">{v.contactName}</p>
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                  {v.trades.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 capitalize"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      v.avgResponseTimeHours <= 4 && "bg-green-500",
                      v.avgResponseTimeHours > 4 && v.avgResponseTimeHours <= 12 && "bg-amber-500",
                      v.avgResponseTimeHours > 12 && "bg-red-500"
                    )}
                  />
                  <span className="text-sm text-gray-700">{v.avgResponseTimeHours}h avg</span>
                </div>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(v.avgRating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{v.avgRating.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
