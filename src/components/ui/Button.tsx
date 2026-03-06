import { cn } from "../../utils/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: Props) {
  const variants: Record<NonNullable<Props["variant"]>, string> = {
    primary:
      "bg-cyan-500/90 text-slate-950 hover:bg-cyan-400 focus-visible:outline-cyan-400",
    secondary:
      "bg-white/10 text-slate-100 hover:bg-white/15 focus-visible:outline-white/30",
    ghost:
      "bg-transparent text-slate-100 hover:bg-white/10 focus-visible:outline-white/30",
    danger:
      "bg-rose-500/90 text-white hover:bg-rose-400 focus-visible:outline-rose-300",
  };
  const sizes: Record<NonNullable<Props["size"]>, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-3.5 text-sm",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10",
        "shadow-sm shadow-black/20",
        "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
