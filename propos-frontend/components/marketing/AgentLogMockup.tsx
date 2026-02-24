import { Bot, ChevronDown } from "lucide-react";

const STEPS = [
  { tool: "classify_intent", input: '{"message": "AC not working...", "unit": "4B"}' },
  { tool: "fetch_work_orders", input: '{"propertyId": "prop_123"}' },
  { tool: "dispatch_vendor", input: '{"trade": "HVAC", "priority": "HIGH"}' },
];

export function AgentLogMockup() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
          ✓
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Vendor dispatch completed</p>
          <p className="text-xs text-gray-400">2 min ago · 847ms · 2,341 tokens</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
            work_order_triage
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 space-y-2">
        {STEPS.map((step, i) => (
          <div key={i} className="font-mono text-xs">
            <span className="text-gray-400">#{i + 1}</span>
            <div className="ml-4 mt-1">
              <span className="text-gray-700">→ {step.tool}</span>
              <span className="text-gray-400 ml-2">
                {step.input.slice(0, 50)}...
              </span>
            </div>
          </div>
        ))}
        <div className="mt-2 rounded-lg border border-gray-100 bg-white p-2.5 text-xs text-gray-600 italic">
          "Tenant reported AC failure. Unit 4B has HVAC history. Dispatching
          QuickCool HVAC, 2.1hr avg response, 4.8★ rating."
        </div>
      </div>
    </div>
  );
}
