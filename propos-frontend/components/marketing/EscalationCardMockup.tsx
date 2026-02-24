import { Bot, Check } from "lucide-react";

const ESCALATION_ITEMS = [
  "Fair Housing concern detected in tenant communication",
  "Invoice 3× above benchmark for this trade",
  "Emergency work order open for 2+ hours",
];

export function EscalationCardMockup() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700">
          <Bot className="h-4 w-4 text-gray-300" />
        </div>
        <span className="text-sm font-semibold text-white">
          Escalation Queue
        </span>
      </div>
      <div className="space-y-3">
        {ESCALATION_ITEMS.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-700">
              <Check className="h-3 w-3 text-gray-300" />
            </div>
            <p className="text-sm text-gray-300">{item}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-gray-800 border border-gray-600 p-3">
        <p className="text-xs font-medium text-gray-400 mb-1">
          Relayne Recommendation
        </p>
        <p className="text-sm text-white">
          Review tenant message. Potential discriminatory language. Suggest
          legal review before response.
        </p>
      </div>
    </div>
  );
}
