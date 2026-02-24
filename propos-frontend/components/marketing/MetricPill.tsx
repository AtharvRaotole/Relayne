import { LucideIcon } from "lucide-react";

interface MetricPillProps {
  icon: React.ReactElement<LucideIcon>;
  label: string;
  sub: string;
}

export function MetricPill({ icon, label, sub }: MetricPillProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/80 border border-zinc-700/50 px-3.5 py-2 text-xs font-medium text-zinc-400 backdrop-blur-sm">
      <span className="text-cyan-400">{icon}</span>
      <span>
        <strong className="text-zinc-200">{label}</strong>{" "}
        <span className="text-zinc-500">{sub}</span>
      </span>
    </div>
  );
}
