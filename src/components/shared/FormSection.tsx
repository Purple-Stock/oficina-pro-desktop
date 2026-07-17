import type { ReactNode } from "react";

interface FormSectionProps {
  title?: string;
  children: ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>
      )}
      {children}
    </div>
  );
}
