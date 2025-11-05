import { Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SystemStatusBarProps {
  isHealthy: boolean;
  version?: string;
}

export function SystemStatusBar({ isHealthy, version }: SystemStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2">
        {isHealthy ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Mervin V2 Operacional
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400">
              Mervin V2 Inactivo
            </span>
            <Badge variant="outline" className="text-xs">Usando Fallback</Badge>
          </>
        )}
      </div>

      {version && (
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-500">v{version}</span>
        </div>
      )}
    </div>
  );
}
