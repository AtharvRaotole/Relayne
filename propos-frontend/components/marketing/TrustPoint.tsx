import { LucideIcon } from "lucide-react";

interface TrustPointProps {
  icon: React.ReactElement<LucideIcon>;
  title: string;
  body: string;
}

export function TrustPoint({ icon, title, body }: TrustPointProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-600">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{body}</p>
    </div>
  );
}
