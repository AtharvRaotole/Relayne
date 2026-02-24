"use client";

export default function InvoicesPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <span className="text-gray-400">📄</span>
      </div>
      <p className="mb-1 text-sm font-medium text-gray-900">No invoices yet</p>
      <p className="max-w-xs text-center text-sm text-gray-500">
        Invoices from completed work orders will appear here.
      </p>
      <button className="mt-4 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
        Upload Invoice
      </button>
    </div>
  );
}
