import { LucideIcon } from "lucide-react";

interface MetricPillProps {
  icon: React.ReactElement<LucideIcon>;
  label: string;
  sub: string;
}

export function MetricPill({ icon, label, sub }: MetricPillProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
      <span className="text-gray-400">{icon}</span>
      <span>
        <strong className="text-gray-800">{label}</strong> {sub}
      </span>
    </div>
  );
}
