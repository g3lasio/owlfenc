import { useState } from 'react';
import { Pin, Trash2, FileText, MessageSquare, Home, Building, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ConversationListItem } from '@/../../shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onPin: () => void;
}

const categoryIcons = {
  estimate: FileText,
  contract: FileCheck,
  permit: Building,
  property: Home,
  general: MessageSquare,
};

const categoryColors = {
  estimate: 'text-cyan-400',
  contract: 'text-purple-400',
  permit: 'text-orange-400',
  property: 'text-green-400',
  general: 'text-gray-400',
};

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
  onPin,
}: ConversationItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const CategoryIcon = categoryIcons[conversation.category] || MessageSquare;
  const categoryColor = categoryColors[conversation.category] || 'text-gray-400';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPin();
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        className={`
          group relative p-3 rounded-lg cursor-pointer transition-all duration-200
          ${
            isActive
              ? 'bg-gradient-to-r from-cyan-900/40 to-purple-900/40 border border-cyan-500/30'
              : 'bg-gray-900/30 hover:bg-gray-800/50 border border-transparent'
          }
        `}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`conversation-item-${conversation.conversationId}`}
      >
        {/* Content */}
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div className={`mt-0.5 ${categoryColor}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4
                className={`text-sm font-semibold truncate ${
                  isActive ? 'text-white' : 'text-gray-200'
                }`}
              >
                {conversation.title}
              </h4>
              {conversation.isPinned && (
                <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0 fill-current" />
              )}
            </div>

            {conversation.preview && (
              <p className="text-xs text-gray-400 truncate mb-2">
                {conversation.preview}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{conversation.aiModel === 'chatgpt' ? 'GPT-4o' : 'Claude'}</span>
              <span>•</span>
              <span>{conversation.messageCount} mensajes</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(conversation.lastActivityAt, {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons (show on hover) */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePin}
              className="h-7 w-7 text-gray-400 hover:text-cyan-400"
              data-testid={`button-pin-${conversation.conversationId}`}
            >
              <Pin className={`w-3.5 h-3.5 ${conversation.isPinned ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-7 w-7 text-gray-400 hover:text-red-400"
              data-testid={`button-delete-${conversation.conversationId}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-cyan-900/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ¿Eliminar conversación?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta acción no se puede deshacer. La conversación "{conversation.title}" será
              eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
