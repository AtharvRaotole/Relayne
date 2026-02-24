export function SectionLabel({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
      {children}
    </p>
  );
}
