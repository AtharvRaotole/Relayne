import { Bot, ChevronDown } from "lucide-react";

const STEPS = [
  { tool: "classify_intent", input: '{"message": "AC not working...", "unit": "4B"}' },
  { tool: "fetch_work_orders", input: '{"propertyId": "prop_123"}' },
  { tool: "dispatch_vendor", input: '{"trade": "HVAC", "priority": "HIGH"}' },
];

export function AgentLogMockup() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-3.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          ✓
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">Vendor dispatch completed</p>
          <p className="text-xs text-zinc-500">2 min ago · 847ms · 2,341 tokens</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
            work_order_triage
          </span>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </div>
      </div>
      <div className="bg-zinc-950/40 px-5 py-4 space-y-2.5">
        {STEPS.map((step, i) => (
          <div key={i} className="font-mono text-xs">
            <span className="text-zinc-600">#{i + 1}</span>
            <div className="ml-4 mt-1">
              <span className="text-cyan-400">→ {step.tool}</span>
              <span className="text-zinc-600 ml-2">
                {step.input.slice(0, 50)}...
              </span>
            </div>
          </div>
        ))}
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 italic">
          &ldquo;Tenant reported AC failure. Unit 4B has HVAC history. Dispatching
          QuickCool HVAC, 2.1hr avg response, 4.8★ rating.&rdquo;
        </div>
      </div>
    </div>
  );
}
