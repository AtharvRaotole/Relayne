interface FeatureSectionProps {
  label: string;
  title: string;
  description: string;
  points: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
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
    <section
      className={`py-24 flex items-center ${
        reverse ? "bg-gray-50" : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-5xl px-6">
        <div
          className={`grid grid-cols-1 gap-16 lg:grid-cols-2 ${
            reverse ? "lg:grid-flow-dense" : ""
          }`}
        >
          <div className={reverse ? "lg:col-start-2" : ""}>
            <span className="inline-block rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm mb-4">
              {label}
            </span>
            <h3
              className="text-2xl font-bold text-gray-950 mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            <p className="text-gray-500 leading-relaxed mb-6">{description}</p>
            <ul className="space-y-2">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-500)]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div
            className={`rounded-xl border border-gray-200 bg-white p-6 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] ${
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
