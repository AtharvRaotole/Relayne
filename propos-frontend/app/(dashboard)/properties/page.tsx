"use client";

import { mockProperties } from "@/lib/api/mock-data";

export default function PropertiesPage() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {mockProperties.map((prop) => (
        <div
          key={prop.id}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]"
        >
          <h3 className="text-base font-semibold text-gray-900">{prop.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{prop.address}</p>
          <p className="mt-2 text-xs text-gray-400">{prop.unitCount} units</p>
        </div>
      ))}
    </div>
  );
}
