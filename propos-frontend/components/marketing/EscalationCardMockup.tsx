import { Bot, Check } from "lucide-react";

const ESCALATION_ITEMS = [
  "Fair Housing concern detected in tenant communication",
  "Invoice 3× above benchmark for this trade",
  "Emergency work order open for 2+ hours",
];

export function EscalationCardMockup() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Bot className="h-4 w-4 text-cyan-400" />
        </div>
        <span className="text-sm font-semibold text-zinc-200">
          Escalation Queue
        </span>
      </div>
      <div className="space-y-3">
        {ESCALATION_ITEMS.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 hover:border-zinc-700 transition-colors"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Check className="h-3 w-3 text-cyan-400" />
            </div>
            <p className="text-sm text-zinc-400">{item}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20 p-3.5">
        <p className="text-xs font-semibold text-cyan-400 mb-1">
          Relayne Recommendation
        </p>
        <p className="text-sm text-zinc-300">
          Review tenant message. Potential discriminatory language. Suggest
          legal review before response.
        </p>
      </div>
    </div>
  );
}
