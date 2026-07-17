import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";

const MIN_VISIBLE_MS = 280;

export function RouteChangeSpinner() {
  const location = useLocation();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    startedAtRef.current = Date.now();
    setIsVisible(true);

    const scheduleHide = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimerRef.current = setTimeout(() => setIsVisible(false), remaining);
    };

    scheduleHide();

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [location.pathname, location.search, location.key]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-blue-100 bg-white px-8 py-6 shadow-lg">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-gray-600">{t.common.loading}</p>
      </div>
    </div>
  );
}
