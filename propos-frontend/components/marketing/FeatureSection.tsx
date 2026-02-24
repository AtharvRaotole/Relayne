interface FeatureSectionProps {
  label: string;
  title: string;
  description: string;
  points: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
  light?: boolean;
}

export function FeatureSection({
  label,
  title,
  description,
  points,
  mockup,
  reverse = false,
}: FeatureSectionProps) {
  return (
    <section className="py-20 border-t border-white/[0.04]">
      <div className="mx-auto max-w-5xl px-6">
        <div
          className={`grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center ${
            reverse ? "lg:grid-flow-dense" : ""
          }`}
        >
          <div className={reverse ? "lg:col-start-2" : ""}>
            <span className="inline-block rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-1 text-xs font-semibold text-cyan-400 mb-5">
              {label}
            </span>
            <h3
              className="text-2xl md:text-3xl font-bold text-white mb-4 leading-[1.15]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-6 text-[16px]">{description}</p>
            <ul className="space-y-3">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.4)]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div
            className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm ${
              reverse ? "lg:col-start-1 lg:row-start-1" : ""
            }`}
          >
            {mockup}
          </div>
        </div>
      </div>
    </section>
  );
}
