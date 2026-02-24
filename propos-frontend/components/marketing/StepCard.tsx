import { LucideIcon } from "lucide-react";

interface StepCardProps {
  number: string;
  icon: React.ReactElement<LucideIcon>;
  title: string;
  description: string;
  highlight: string;
  dark?: boolean;
}

export function StepCard({
  number,
  icon,
  title,
  description,
  highlight,
}: StepCardProps) {
  return (
    <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm hover:border-zinc-700 transition-colors duration-300">
      <span
        className="text-3xl font-bold text-zinc-800"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {number}
      </span>
      <div className="mt-4 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
        {icon}
      </div>
      <h3
        className="text-base font-semibold mb-1 text-zinc-100"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="text-sm mb-3 leading-relaxed text-zinc-500">{description}</p>
      <span className="text-xs font-semibold text-cyan-400">{highlight}</span>
    </div>
  );
}
