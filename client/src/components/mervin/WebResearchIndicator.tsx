import { Globe, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WebResearchIndicatorProps {
  isSearching: boolean;
  resultsFound?: number;
  query?: string;
}

export function WebResearchIndicator({ isSearching, resultsFound, query }: WebResearchIndicatorProps) {
  if (!isSearching && !resultsFound) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {isSearching ? (
            <>
              <Globe className="w-4 h-4 text-green-600 dark:text-green-400 animate-spin" />
              <span className="font-semibold text-xs text-green-900 dark:text-green-100">
                Investigando en Internet...
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-xs text-green-900 dark:text-green-100">
                Investigación Completada
              </span>
            </>
          )}
        </div>

        {query && (
          <div className="text-xs text-gray-600 dark:text-gray-400 ml-6">
            Buscando: <span className="italic">{query}</span>
          </div>
        )}

        {resultsFound !== undefined && resultsFound > 0 && (
          <div className="flex items-center gap-2 ml-6">
            <ExternalLink className="w-3 h-3 text-green-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              Encontré <Badge variant="secondary" className="text-xs px-1.5 py-0">{resultsFound}</Badge> resultados relevantes
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
