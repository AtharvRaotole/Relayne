"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompliancePage() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                2 overdue items require immediate attention
              </p>
              <p className="mt-0.5 text-xs text-red-600">
                Elevator inspection at 100 Main + Sprinkler test at Park Ave
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            Review Now
          </Button>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Overdue</h3>
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            <p className="text-sm font-medium">Elevator Annual Inspection — 100 Main St</p>
            <p className="text-xs text-red-600">3 days overdue</p>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Due This Week</h3>
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            <p className="text-sm font-medium">Sprinkler Test — Park Ave</p>
            <p className="text-xs text-amber-600">Due in 2 days</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
        <h3 className="text-sm font-semibold mb-3">Compliance Calendar</h3>
        <div className="h-48 rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-500">
          Calendar view
        </div>
      </div>
    </div>
  );
}
