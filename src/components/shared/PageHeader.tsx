import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-gray-600">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
