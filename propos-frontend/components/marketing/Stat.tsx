export function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <p
        className="text-2xl font-bold text-gray-950"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
