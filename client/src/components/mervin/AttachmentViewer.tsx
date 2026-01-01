/**
 * AttachmentViewer Component
 * 
 * Renderiza adjuntos (PDFs, imágenes, documentos) enviados por el backend.
 * Soporta preview de imágenes y botones de descarga para PDFs/documentos.
 */

import { Attachment } from "@/mervin-v2/types/responses";
import { FileText, Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AttachmentViewerProps {
  attachments: Attachment[];
}

export function AttachmentViewer({ attachments }: AttachmentViewerProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const getIcon = (type: Attachment['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-gray-500" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-muted-foreground font-medium">📎 Adjuntos:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((attachment, index) => (
          <Card key={index} className="p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              {/* Ícono según el tipo */}
              <div className="flex-shrink-0">
                {getIcon(attachment.type)}
              </div>

              {/* Información del archivo */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.filename}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {attachment.type}
                </p>
              </div>

              {/* Botón de descarga */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(attachment.url, attachment.filename)}
                className="flex-shrink-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview para imágenes */}
            {attachment.type === 'image' && (
              <div className="mt-3">
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="w-full h-auto rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(attachment.url, '_blank')}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
