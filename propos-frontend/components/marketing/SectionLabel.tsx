export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
      {children}
    </p>
  );
}
