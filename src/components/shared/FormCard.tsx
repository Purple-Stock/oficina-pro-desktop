import type { ReactNode } from "react";

interface FormCardProps {
  children: ReactNode;
  className?: string;
}

export function FormCard({ children, className = "" }: FormCardProps) {
  return (
    <div
      className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
