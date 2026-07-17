import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  iconClassName?: string;
  iconColorClass?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  iconClassName,
  iconColorClass = "text-blue-600",
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6">
      <div
        className={cn(
          "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6",
          iconClassName
        )}
      >
        <Icon className={cn("h-8 w-8 sm:h-10 sm:w-10", iconColorClass)} />
      </div>
      <p className="text-gray-700 text-lg sm:text-xl font-semibold mb-2">
        {title}
      </p>
      <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">
        {message}
      </p>
      {action}
    </div>
  );
}
