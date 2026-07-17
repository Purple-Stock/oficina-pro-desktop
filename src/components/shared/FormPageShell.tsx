import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface FormPageShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  tutorialLabel?: string;
  onTutorialClick?: () => void;
  success?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}

export function FormPageShell({
  title,
  subtitle,
  backHref,
  backLabel,
  tutorialLabel,
  onTutorialClick,
  success,
  error,
  wide = false,
  children,
}: FormPageShellProps) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-3xl" : "max-w-2xl"}`}>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {backHref && (
            <Link to={backHref}>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label={backLabel}
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {tutorialLabel && onTutorialClick && (
          <Button
            type="button"
            variant="outline"
            onClick={onTutorialClick}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 shrink-0"
          >
            <Info className="h-4 w-4 mr-2" />
            {tutorialLabel}
          </Button>
        )}
      </div>

      {success && (
        <Alert className="mb-6 border-l-4 border-l-green-500 bg-green-50/50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 text-sm">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert
          variant="destructive"
          className="mb-6 border-l-4 border-l-red-500 bg-red-50/50"
        >
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
}
