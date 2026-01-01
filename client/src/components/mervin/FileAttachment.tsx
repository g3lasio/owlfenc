/**
 * FileAttachment Component
 * 
 * Permite adjuntar archivos (imágenes, PDFs, documentos) y muestra un preview.
 * Los archivos se envían al backend para análisis con Claude Sonnet Vision.
 */

import { useState, useRef } from 'react';
import { X, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileAttachmentProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
}

interface FilePreview {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'document';
}

export function FileAttachment({ 
  onFilesChange, 
  maxFiles = 5,
  acceptedTypes = "image/*,.pdf,.doc,.docx"
}: FileAttachmentProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileType = (file: File): 'image' | 'pdf' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'document';
  };

  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Validar número máximo de archivos
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Límite de archivos excedido",
        description: `Solo puedes adjuntar hasta ${maxFiles} archivos.`,
        variant: "destructive"
      });
      return;
    }

    // Validar tamaño de archivos (máximo 10MB por archivo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = selectedFiles.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Archivo muy grande",
        description: `Los archivos deben ser menores a 10MB. ${oversizedFiles[0].name} es muy grande.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Crear previews para los archivos
      const newFilePreviews: FilePreview[] = await Promise.all(
        selectedFiles.map(async (file) => ({
          file,
          preview: await createPreview(file),
          type: getFileType(file)
        }))
      );

      const updatedFiles = [...files, ...newFilePreviews];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles.map(fp => fp.file));

      toast({
        title: "Archivos adjuntados",
        description: `${selectedFiles.length} archivo(s) listo(s) para análisis.`
      });
    } catch (error) {
      console.error('Error procesando archivos:', error);
      toast({
        title: "Error",
        description: "No se pudieron procesar los archivos.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(fp => fp.file));
  };

  const getFileIcon = (type: FilePreview['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'document':
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing || files.length >= maxFiles}
      />

      {/* Previews de archivos adjuntos */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
          {files.map((filePreview, index) => (
            <div
              key={index}
              className="relative group bg-gray-900 rounded-lg border border-gray-700 overflow-hidden hover:border-cyan-500 transition-colors"
              style={{ width: '120px' }}
            >
              {/* Preview de imagen o ícono */}
              <div className="h-24 flex items-center justify-center bg-gray-800">
                {filePreview.preview ? (
                  <img
                    src={filePreview.preview}
                    alt={filePreview.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {getFileIcon(filePreview.type)}
                    <span className="text-xs text-gray-400 uppercase">
                      {filePreview.type}
                    </span>
                  </div>
                )}
              </div>

              {/* Información del archivo */}
              <div className="p-2 bg-gray-900">
                <p className="text-xs text-gray-300 truncate" title={filePreview.file.name}>
                  {filePreview.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(filePreview.file.size)}
                </p>
              </div>

              {/* Botón para remover */}
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover archivo"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Badge de "Listo para análisis" */}
              <div className="absolute bottom-12 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                ✓ Listo
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón para adjuntar (se muestra cuando hay espacio) */}
      {files.length < maxFiles && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 mr-2" />
              Adjuntar archivos ({files.length}/{maxFiles})
            </>
          )}
        </Button>
      )}

      {/* Mensaje de ayuda */}
      {files.length === 0 && (
        <p className="text-xs text-gray-500">
          📸 Adjunta imágenes del terreno, planos, PDFs o documentos. Mervin los analizará para entender mejor tu proyecto.
        </p>
      )}
    </div>
  );
}
