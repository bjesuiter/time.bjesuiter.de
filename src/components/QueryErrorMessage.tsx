import { AlertCircle, RefreshCw } from "lucide-react";

interface QueryErrorMessageProps {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function QueryErrorMessage({
  error,
  onRetry,
  isRetrying = false,
}: QueryErrorMessageProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-800 font-medium">Error loading data</p>
        <p className="text-red-700 text-sm mt-1">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            {isRetrying ? "Retrying..." : "Try Again"}
          </button>
        )}
      </div>
    </div>
  );
}
