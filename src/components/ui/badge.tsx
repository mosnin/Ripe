import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-[var(--primary)] text-[var(--primary-foreground)]":
            variant === "default",
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200":
            variant === "success",
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200":
            variant === "warning",
          "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200":
            variant === "destructive",
          "border border-[var(--border)] text-[var(--foreground)]":
            variant === "outline",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
