interface MetricCardProps {
  stat: string;
  label: string;
  sublabel: string;
  delta: string;
  positive?: boolean;
}

export function MetricCard({
  stat,
  label,
  sublabel,
  delta,
  positive = true,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <p
        className="text-4xl font-bold text-gray-950 mb-1"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {stat}
      </p>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-500">{sublabel}</p>
      <p
        className={`mt-2 text-sm font-medium ${positive ? "text-green-600" : "text-red-500"}`}
      >
        {delta}
      </p>
    </div>
  );
}
