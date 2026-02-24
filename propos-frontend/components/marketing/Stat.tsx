export function Stat({
  value,
  label,
  dark,
}: {
  value: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className="text-2xl font-bold text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="text-sm mt-1 text-zinc-500">{label}</p>
    </div>
  );
}
