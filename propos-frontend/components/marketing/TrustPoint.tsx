import { LucideIcon } from "lucide-react";

interface TrustPointProps {
  icon: React.ReactElement<LucideIcon>;
  title: string;
  body: string;
  dark?: boolean;
}

export function TrustPoint({ icon, title, body }: TrustPointProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
      <p className="text-sm mt-1 text-zinc-500">{body}</p>
    </div>
  );
}
