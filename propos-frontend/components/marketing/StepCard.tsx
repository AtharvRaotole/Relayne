import { LucideIcon } from "lucide-react";

interface StepCardProps {
  number: string;
  icon: React.ReactElement<LucideIcon>;
  title: string;
  description: string;
  highlight: string;
}

export function StepCard({
  number,
  icon,
  title,
  description,
  highlight,
}: StepCardProps) {
  return (
    <div className="relative bg-white rounded-xl border border-gray-100 p-6 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)]">
      <span className="text-2xl font-bold text-gray-200" style={{ fontFamily: "var(--font-display)" }}>
        {number}
      </span>
      <div className="mt-4 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-3 leading-relaxed">{description}</p>
      <span className="text-xs font-medium text-gray-700">
        {highlight}
      </span>
    </div>
  );
}
