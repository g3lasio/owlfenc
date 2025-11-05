import { Brain } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
      <Brain className="w-4 h-4 animate-pulse" />
      <span className="text-sm">
        Mervin pensando
        <span className="inline-flex ml-0.5">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
        </span>
      </span>
    </div>
  );
}
