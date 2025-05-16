import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { 
  FileText, 
  FileSpreadsheet, 
  Loader2, 
  Upload, 
  X 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analyzeFileWithAI, normalizeCSVWithAI } from "@/services/aiService";

interface AIFileImportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMaterialsProcessed: (materials: any[]) => void;
}

export function AIFileImport({ 
  isOpen,
  onOpenChange,
  onMaterialsProcessed
}: AIFileImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (
        selectedFile.type === "text/csv" || 
        selectedFile.type === "application/vnd.ms-excel" ||
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith('.csv') ||
        selectedFile.name.endsWith('.xls') ||
        selectedFile.name.endsWith('.xlsx')
      ) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Formato no soportado",
          description: "Por favor, selecciona un archivo CSV o Excel",
          variant: "destructive"
        });
      }
    }
  };
  
  const removeFile = () => {
    setFile(null);
  };
  
  const processFile = async () => {
    if (!file) return;
    
    try {
      setAnalyzing(true);
      setProcessingStage("Leyendo archivo...");
      
      // Leer el contenido del archivo
      const fileContent = await readFileContent(file);
      
      // Determinar el tipo de archivo
      const fileType = file.name.split('.').pop()?.toLowerCase() || '';
      
      setProcessingStage("Procesando formato...");
      
      let processedContent = fileContent;
      if (fileType === 'csv') {
        try {
          // Normalizar el contenido CSV para asegurar formato correcto
          processedContent = await normalizeCSVWithAI(fileContent);
          setProcessingStage("Formato procesado correctamente");
        } catch (formatError) {
          console.error("Error al normalizar CSV:", formatError);
          setProcessingStage("Error al normalizar formato (continuando con formato original)");
        }
      }
      
      setProcessingStage("Analizando datos con IA...");
      
      try {
        // Procesar el contenido con IA o con el fallback local
        const materials = await analyzeFileWithAI(processedContent, fileType);
        
        if (!materials || materials.length === 0) {
          setProcessingStage("No se encontraron materiales válidos");
          toast({
            title: "Sin resultados",
            description: "No se pudieron identificar materiales en el archivo. Verifica el formato.",
            variant: "destructive"
          });
          return;
        }
        
        setProcessingStage(`Encontrados ${materials.length} materiales. Finalizando importación...`);
        
        // Mostrar vista previa de los primeros 3 materiales
        const preview = materials.slice(0, 3).map(m => m.name).join(", ");
        
        // Informar al componente padre sobre los materiales procesados
        onMaterialsProcessed(materials);
        
        // Cerrar diálogo y limpiar estado
        setTimeout(() => {
          onOpenChange(false);
          setFile(null);
          
          toast({
            title: "Importación exitosa",
            description: `Se procesaron ${materials.length} materiales correctamente. Ejemplos: ${preview}${materials.length > 3 ? '...' : ''}`
          });
        }, 1000); // Pequeño retraso para que el usuario pueda ver el mensaje de éxito
      } catch (analysisError) {
        console.error("Error al analizar datos:", analysisError);
        setProcessingStage("Error al procesar los datos");
        
        toast({
          title: "Error en el procesamiento",
          description: "No se pudieron procesar los materiales. Se utilizará procesamiento local.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al procesar archivo:", error);
      toast({
        title: "Error en el procesamiento",
        description: error instanceof Error ? error.message : "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
      setProcessingStage("");
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar Materiales con IA</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV o Excel con información de materiales. 
            La IA analizará y procesará automáticamente los datos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!file && !analyzing && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Arrastra un archivo CSV o Excel aquí, o haz clic para seleccionarlo.<br />
                <span className="font-medium">No es necesario que siga una plantilla específica.</span>
              </p>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar archivo
              </Button>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={handleFileChange}
              />
            </div>
          )}
          
          {file && !analyzing && (
            <div className="border rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {file.name.endsWith('.csv') ? (
                    <FileText className="h-8 w-8 mr-2" />
                  ) : (
                    <FileSpreadsheet className="h-8 w-8 mr-2" />
                  )}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
          
          {analyzing && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-center font-medium">{processingStage}</p>
              <p className="text-sm text-muted-foreground text-center">
                Estamos utilizando IA para analizar y procesar los datos de tu archivo.
                Esto puede tomar unos momentos dependiendo del tamaño del archivo.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={analyzing}>
            Cancelar
          </Button>
          <Button 
            onClick={processFile}
            disabled={!file || analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar Materiales
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Función para leer el contenido de un archivo
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      // Para archivos Excel, leerlos como texto también (serán procesados especialmente)
      reader.readAsText(file);
    }
  });
}