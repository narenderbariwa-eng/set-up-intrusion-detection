import { cn } from "../../utils/cn";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        "border-white/10 bg-white/5 text-slate-100",
        className
      )}
    >
      {children}
    </span>
  );
}
