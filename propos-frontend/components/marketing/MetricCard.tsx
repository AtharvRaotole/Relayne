interface MetricCardProps {
  stat: string;
  label: string;
  sublabel: string;
  delta: string;
  positive?: boolean;
  dark?: boolean;
}

export function MetricCard({
  stat,
  label,
  sublabel,
  delta,
  positive = true,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm hover:border-zinc-700 transition-colors duration-300">
      <p
        className="text-4xl font-bold mb-1 text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {stat}
      </p>
      <p className="text-sm font-medium text-zinc-300">{label}</p>
      <p className="text-sm text-zinc-500">{sublabel}</p>
      <p
        className={`mt-3 text-sm font-semibold ${positive ? "text-cyan-400" : "text-red-400"}`}
      >
        {delta}
      </p>
    </div>
  );
}
