import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 border-2",
  md: "h-10 w-10 border-4",
  lg: "h-12 w-12 border-4",
};

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-[#1D4ED8] border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}
