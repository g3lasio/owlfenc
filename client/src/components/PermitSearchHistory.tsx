/**
 * Componente de historial de búsquedas de permisos compacto y elegante
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  getPermitSearchHistory, 
  formatHistoryDate, 
  getProjectTypeIcon,
  type PermitSearchHistoryItem 
} from '@/services/permitHistoryService';

interface PermitSearchHistoryProps {
  onSelectHistory: (historyItem: PermitSearchHistoryItem) => void;
}

export default function PermitSearchHistory({ onSelectHistory }: PermitSearchHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['permitHistory', user?.uid],
    queryFn: () => user?.uid ? getPermitSearchHistory(user.uid) : [],
    enabled: !!user?.uid && isOpen,
  });

  const handleSelectHistory = (item: PermitSearchHistoryItem) => {
    onSelectHistory(item);
    setIsOpen(false);
  };

  const getProjectTypeColor = (projectType: string): string => {
    const colors: Record<string, string> = {
      electrical: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      plumbing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      roofing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      bathroom: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      kitchen: 'bg-green-500/20 text-green-300 border-green-500/30',
      addition: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      concrete: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      default: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    };
    return colors[projectType.toLowerCase()] || colors.default;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full bg-gray-800/60 border-teal-400/30 text-teal-300 hover:bg-gray-700/80 hover:border-teal-400/50 transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-500/20 rounded-md flex items-center justify-center">
              📋
            </div>
            <span>History</span>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-gray-900/95 border-teal-400/30 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-teal-300 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
              📋
            </div>
            Search History
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-800/50 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                📋
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No search history found</h3>
              <p className="text-gray-500 text-sm">Your recent permit searches will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div key={item.id || index}>
                  <div 
                    onClick={() => handleSelectHistory(item)}
                    className="group relative p-4 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-teal-400/30 rounded-lg cursor-pointer transition-all duration-300"
                  >
                    {/* Holographic border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-300"></div>
                    
                    <div className="relative space-y-3">
                      {/* Header with project type and date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getProjectTypeIcon(item.projectType)}</span>
                          <Badge className={`${getProjectTypeColor(item.projectType)} text-xs font-medium`}>
                            {item.projectType.charAt(0).toUpperCase() + item.projectType.slice(1)}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {formatHistoryDate(item.createdAt)}
                        </span>
                      </div>

                      {/* Address */}
                      <div className="space-y-1">
                        <p className="text-teal-300 font-medium text-sm line-clamp-1">
                          {item.address}
                        </p>
                        {item.projectDescription && (
                          <p className="text-gray-400 text-xs line-clamp-2">
                            {item.projectDescription}
                          </p>
                        )}
                      </div>

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {item.results?.requiredPermits && (
                          <span className="flex items-center gap-1">
                            🏛️ {item.results.requiredPermits.length} permits
                          </span>
                        )}
                        {item.results?.contactInformation && (
                          <span className="flex items-center gap-1">
                            📞 {item.results.contactInformation.length} contacts
                          </span>
                        )}
                        {item.results?.process && (
                          <span className="flex items-center gap-1">
                            📋 {item.results.process.length} steps
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover effect indicator */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  {index < history.length - 1 && (
                    <Separator className="my-3 bg-gray-700/30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {history.length > 0 && (
          <div className="flex justify-center pt-4 border-t border-gray-700/30">
            <p className="text-xs text-gray-500">
              Showing {history.length} recent searches
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}