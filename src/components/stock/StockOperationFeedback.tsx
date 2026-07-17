import { Alert, AlertDescription } from "@/components/ui/alert";

export type StockOperationFeedbackMessage = {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
};

interface StockOperationFeedbackProps {
  feedback: StockOperationFeedbackMessage | null;
}

export function StockOperationFeedback({
  feedback,
}: StockOperationFeedbackProps) {
  if (!feedback) return null;

  return (
    <Alert
      className={`mb-6 border-l-4 ${
        feedback.type === "success"
          ? "border-l-green-500 bg-green-50/50"
          : feedback.type === "error"
            ? "border-l-red-500 bg-red-50/50"
            : "border-l-blue-500 bg-blue-50/50"
      }`}
    >
      <AlertDescription
        className={`text-sm ${
          feedback.type === "success"
            ? "text-green-700"
            : feedback.type === "error"
              ? "text-red-700"
              : "text-blue-700"
        }`}
      >
        <span className="font-semibold">{feedback.title}</span>
        {feedback.description ? ` — ${feedback.description}` : null}
      </AlertDescription>
    </Alert>
  );
}
