import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { updateProject } from "@/lib/firebase";

interface FileManagerProps {
  projectId: string;
  attachments?: any;
  onUpdate: (attachments: any) => void;
}

interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
}

export default function FileManager({ projectId, attachments = {}, onUpdate }: FileManagerProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'zip':
      case 'rar':
        return '🗜️';
      default:
        return '📎';
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    try {
      // Import Firebase Storage dinamically
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { initializeApp, getApps } = await import('firebase/app');
      
      // Verificar si Firebase ya está inicializado
      let app;
      const apps = getApps();
      if (apps.length > 0) {
        app = apps[0];
      } else {
        // En caso de que no esté inicializado, usar la configuración por defecto
        const { auth } = await import('@/lib/firebase');
        app = auth.app;
      }
      
      const storage = getStorage(app);
      
      // Crear referencia única para el archivo
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `projects/${projectId}/attachments/${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(storage, storagePath);
      
      // Subir archivo
      console.log(`📤 Subiendo archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      const snapshot = await uploadBytes(storageRef, file);
      
      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log(`✅ Archivo subido exitosamente: ${downloadURL}`);
      
      return downloadURL;
    } catch (error) {
      console.error('Error subiendo archivo a Firebase Storage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`No se pudo subir el archivo: ${errorMessage}`);
    }
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Validar tipos de archivo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed'
    ];

    const validFiles = fileArray.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Tipo de archivo no válido",
          description: `El archivo ${file.name} no es un tipo válido.`
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: `El archivo ${file.name} supera el límite de 10MB.`
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Crear entradas de upload
    const newUploads: FileUpload[] = validFiles.map(file => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // ✅ FIXED: Crear copia mutable para acumular uploads múltiples
    let accumulatedAttachments = { ...attachments };

    // Procesar cada archivo
    for (const upload of newUploads) {
      try {
        // Simular progreso de upload
        const progressInterval = setInterval(() => {
          setUploads(prev => 
            prev.map(u => 
              u.id === upload.id 
                ? { ...u, progress: Math.min(u.progress + Math.random() * 25, 90) }
                : u
            )
          );
        }, 300);

        // Upload real a Firebase Storage
        const url = await uploadFileToStorage(upload.file);
        
        clearInterval(progressInterval);

        // Completar upload
        setUploads(prev => 
          prev.map(u => 
            u.id === upload.id 
              ? { ...u, progress: 100, status: 'completed', url }
              : u
          )
        );

        // ✅ FIXED: Acumular en la copia mutable en lugar de sobrescribir
        accumulatedAttachments[upload.file.name] = url;

        // Actualizar attachments en Firebase con todos los archivos acumulados
        await updateProject(projectId, { attachments: accumulatedAttachments });
        onUpdate(accumulatedAttachments);

        toast({
          title: "📎 Archivo subido",
          description: `${upload.file.name} se ha subido correctamente.`
        });

      } catch (error) {
        console.error('Error uploading file:', error);
        setUploads(prev => 
          prev.map(u => 
            u.id === upload.id 
              ? { ...u, status: 'error' }
              : u
          )
        );

        toast({
          variant: "destructive",
          title: "Error de subida",
          description: `No se pudo subir ${upload.file.name}.`
        });
      }
    }

    // Limpiar uploads completados después de 3 segundos
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status !== 'completed'));
    }, 3000);

  }, [projectId, attachments, onUpdate, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input value para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleDeleteFile = async (fileName: string) => {
    try {
      // Obtener la URL del archivo para poder eliminarlo del storage
      const fileUrl = attachments[fileName];
      
      if (fileUrl && fileUrl.includes('firebase')) {
        try {
          // Eliminar del Firebase Storage
          const { getStorage, ref, deleteObject } = await import('firebase/storage');
          const { initializeApp, getApps } = await import('firebase/app');
          
          // Verificar si Firebase ya está inicializado
          let app;
          const apps = getApps();
          if (apps.length > 0) {
            app = apps[0];
          } else {
            const { auth } = await import('@/lib/firebase');
            app = auth.app;
          }
          
          const storage = getStorage(app);
          
          // Extraer el path del storage de la URL
          const url = new URL(fileUrl);
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            const fileRef = ref(storage, storagePath);
            
            console.log(`🗑️ Eliminando archivo del storage: ${storagePath}`);
            await deleteObject(fileRef);
            console.log(`✅ Archivo eliminado exitosamente del storage`);
          }
        } catch (storageError) {
          console.warn('No se pudo eliminar del storage:', storageError);
          // Continuar con la eliminación de la referencia aunque falle el storage
        }
      }
      
      // Eliminar referencia de la base de datos
      const newAttachments = { ...attachments };
      delete newAttachments[fileName];
      
      await updateProject(projectId, { attachments: newAttachments });
      onUpdate(newAttachments);

      toast({
        title: "🗑️ Archivo eliminado",
        description: `${fileName} ha sido eliminado exitosamente.`
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el archivo."
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📁 Gestión de Archivos del Proyecto
          {Object.keys(attachments).length > 0 && (
            <Badge variant="secondary">
              {Object.keys(attachments).length} archivo{Object.keys(attachments).length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-hidden">
        {/* Botón de Upload Compacto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar"
            onChange={handleFileInputChange}
            className="hidden"
            data-testid="file-input"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm w-full sm:w-auto"
            data-testid="button-select-files"
          >
            <i className="ri-upload-2-line mr-2"></i>
            Subir Documentos
          </Button>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Máx. 10MB · PDF, DOC, XLS, imágenes, ZIP
          </p>
        </div>

        {/* Lista de uploads en progreso */}
        {uploads.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm sm:text-base">Subiendo archivos...</h4>
            {uploads.map((upload) => (
              <div key={upload.id} className="bg-muted/50 rounded-lg p-2 sm:p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex-shrink-0">{getFileIcon(upload.file.name)}</span>
                    <span className="text-xs sm:text-sm font-medium truncate">{upload.file.name}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                      {formatFileSize(upload.file.size)}
                    </span>
                  </div>
                  <Badge 
                    variant={upload.status === 'completed' ? 'default' : upload.status === 'error' ? 'destructive' : 'secondary'}
                    className="flex-shrink-0"
                  >
                    {upload.status === 'uploading' ? '⏳' : upload.status === 'completed' ? '✅' : '❌'}
                  </Badge>
                </div>
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lista de archivos existentes */}
        {Object.keys(attachments).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm sm:text-base">Archivos del proyecto</h4>
            <div className="grid gap-2">
              {Object.entries(attachments).map(([fileName, url]: [string, any]) => (
                <div 
                  key={fileName} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-2 overflow-hidden"
                  data-testid={`file-item-${fileName}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <span className="text-base sm:text-lg flex-shrink-0">{getFileIcon(fileName)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs sm:text-sm" title={fileName}>{fileName}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Archivo del proyecto
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(url, '_blank')}
                      data-testid={`button-view-${fileName}`}
                      className="text-xs h-8 px-2 sm:px-3"
                    >
                      <span className="sm:hidden">👁️</span>
                      <span className="hidden sm:inline">👁️ Ver</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        link.click();
                      }}
                      data-testid={`button-download-${fileName}`}
                      className="text-xs h-8 px-2 sm:px-3"
                    >
                      <span className="sm:hidden">📥</span>
                      <span className="hidden sm:inline">📥 Descargar</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteFile(fileName)}
                      data-testid={`button-delete-${fileName}`}
                      className="text-xs h-8 px-2 sm:px-3"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(attachments).length === 0 && uploads.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-2xl mb-2">📂</div>
            <p>No hay archivos adjuntos en este proyecto</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}