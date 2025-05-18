import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/lib/clientFirebase';
import { analyzeCSVWithIA, mapCSVToClients, normalizeClientData, enhanceContactsWithAI, CSVAnalysisResult, ColumnMapping } from '@/lib/intelligentImport';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, FileSpreadsheet, Check } from 'lucide-react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface ContactImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (clients: Client[]) => void;
}

// Opciones de campos para mapeo
const FIELD_OPTIONS = [
  { label: 'Nombre', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Teléfono', value: 'phone' },
  { label: 'Teléfono móvil', value: 'mobilePhone' },
  { label: 'Dirección', value: 'address' },
  { label: 'Ciudad', value: 'city' },
  { label: 'Estado', value: 'state' },
  { label: 'Código postal', value: 'zipCode' },
  { label: 'Notas', value: 'notes' },
  { label: 'Clasificación', value: 'classification' },
  { label: 'Fuente', value: 'source' },
  { label: 'Ignorar', value: 'ignore' }
];

export function ContactImportWizard({ isOpen, onClose, onImportComplete }: ContactImportWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Estados para archivos y datos
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<CSVAnalysisResult | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [editableData, setEditableData] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar la carga del archivo CSV
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      
      reader.readAsText(file);
    }
  };

  // Analizar el archivo CSV
  const analyzeFile = async () => {
    if (!fileContent) {
      toast({
        title: "Error",
        description: "Por favor, carga un archivo CSV primero",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('Analizando archivo CSV...');
      
      const result = await analyzeCSVWithIA(fileContent);
      setAnalysisResult(result);
      setColumnMappings(result.mappings);
      
      // Generar vista previa con los primeros 5 registros
      const preview = mapCSVToClients(
        result.sampleRows.slice(0, 5), 
        result.mappings
      );
      setPreviewData(preview);
      setEditableData(preview);
      
      setStep('mapping');
    } catch (error) {
      console.error('Error al analizar el archivo:', error);
      toast({
        title: "Error en el análisis",
        description: error instanceof Error ? error.message : "Error desconocido al analizar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar el mapeo de columnas
  const updateColumnMapping = (index: number, targetField: string) => {
    const updatedMappings = [...columnMappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      targetField
    };
    setColumnMappings(updatedMappings);
    
    // Actualizar la vista previa con el nuevo mapeo
    if (analysisResult) {
      const updatedPreview = mapCSVToClients(
        analysisResult.sampleRows.slice(0, 5),
        updatedMappings
      );
      setPreviewData(updatedPreview);
      setEditableData(updatedPreview);
    }
  };

  // Editar una celda en la vista previa
  const handleCellEdit = (rowIndex: number, field: string, value: string) => {
    const updatedData = [...editableData];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [field]: value
    };
    setEditableData(updatedData);
  };

  // Completar la importación
  const completeImport = async () => {
    try {
      setStep('importing');
      setIsLoading(true);
      setProgress(10);
      setStatusMessage('Procesando datos para importar...');
      
      if (!analysisResult) {
        throw new Error('No hay datos para importar');
      }
      
      // Determinamos qué datos usar para la importación final
      let finalData;
      
      if (step === 'preview') {
        // Si estamos en la vista previa y hay ediciones manuales, usamos esas primero para la muestra
        // y luego procesamos el resto
        setStatusMessage('Aplicando correcciones manuales...');
        
        // Para los registros que no están en la vista previa, mapear con las columnas actualizadas
        const allRows = analysisResult.sampleRows;
        const previewRowCount = editableData.length;
        
        // Mapear los demás registros usando el mapeo actualizado
        const remainingMapped = mapCSVToClients(
          allRows.slice(previewRowCount),
          columnMappings
        );
        
        // Combinar los registros editados manualmente con los generados automáticamente
        finalData = [...editableData, ...remainingMapped];
      } else {
        // Si no hay ediciones, procesar todos los registros con el mapeo actualizado
        setStatusMessage('Procesando todos los registros...');
        finalData = mapCSVToClients(analysisResult.sampleRows, columnMappings);
      }
      
      // Normalizar los datos
      setProgress(40);
      setStatusMessage('Normalizando datos...');
      const normalizedData = normalizeClientData(finalData);
      
      // Mejorar los datos con IA
      setProgress(60);
      setStatusMessage('Mejorando datos con IA...');
      const enhancedData = await enhanceContactsWithAI(normalizedData);
      
      // Filtrar clientes vacíos y limpiar datos
      setProgress(80);
      setStatusMessage('Finalizando importación...');
      const validClients = enhancedData.filter(client => 
        Object.values(client).some(value => 
          value !== null && value !== undefined && value !== ''
        )
      );
      
      // Completar la importación
      onImportComplete(validClients);
      
      setProgress(100);
      setStatusMessage('Importación completada');
      
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${validClients.length} contactos correctamente`,
      });
      
      // Cerrar el wizard después de una breve pausa
      setTimeout(() => {
        onClose();
        // Resetear el estado
        setStep('upload');
        setCsvFile(null);
        setFileContent('');
        setAnalysisResult(null);
        setColumnMappings([]);
        setPreviewData([]);
        setEditableData([]);
        setProgress(0);
        setStatusMessage('');
      }, 1500);
      
    } catch (error) {
      console.error('Error al importar contactos:', error);
      toast({
        title: "Error en la importación",
        description: error instanceof Error ? error.message : "Error desconocido durante la importación",
        variant: "destructive"
      });
      setStep('preview'); // Volver a la vista previa en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar el paso de carga de archivo
  const renderUploadStep = () => (
    <div className="space-y-6 py-6">
      <Alert className="mb-6">
        <HelpCircle className="h-5 w-5 mr-2" />
        <AlertDescription>
          Sube un archivo CSV con tus contactos para importarlos automáticamente.
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg">
        <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-4" />
        <p className="mb-4 text-sm text-gray-500">Arrastra un archivo CSV o haz clic para seleccionarlo</p>
        
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          className="mb-2"
        >
          Seleccionar archivo
        </Button>
        
        {csvFile && (
          <div className="mt-4 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm">{csvFile.name}</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={analyzeFile}
          disabled={!csvFile || isLoading}
        >
          {isLoading ? <Spinner className="mr-2" /> : null}
          {isLoading ? statusMessage : "Analizar archivo"}
        </Button>
      </div>
    </div>
  );

  // Renderizar el paso de mapeo de columnas
  const renderMappingStep = () => {
    if (!columnMappings.length) return null;
    
    return (
      <div className="space-y-6 py-4">
        <Alert className="mb-6">
          <HelpCircle className="h-5 w-5 mr-2" />
          <AlertDescription>
            Verifica que las columnas se hayan mapeado correctamente. Puedes modificar el mapeo si es necesario.
          </AlertDescription>
        </Alert>
        
        <Table>
          <TableCaption>Mapeo de columnas CSV a campos de contacto</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Columna CSV</TableHead>
              <TableHead>Campo de contacto</TableHead>
              <TableHead>Confianza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columnMappings.map((mapping, index) => (
              <TableRow key={index}>
                <TableCell>{mapping.originalHeader || `Columna ${index + 1}`}</TableCell>
                <TableCell>
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => updateColumnMapping(index, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress value={mapping.confidence * 100} className="h-2 w-20" />
                    <span className="text-xs">{Math.round(mapping.confidence * 100)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep('upload')}>
            Atrás
          </Button>
          <Button onClick={() => setStep('preview')}>
            Previsualizar datos
          </Button>
        </div>
      </div>
    );
  };

  // Renderizar el paso de vista previa y edición
  const renderPreviewStep = () => {
    if (!editableData.length) return null;
    
    // Obtener las columnas de los datos para mostrar en la tabla
    const columns = Object.keys(editableData[0]).filter(key => 
      // Filtramos campos técnicos/internos que no necesitan edición
      !['id', 'clientId', 'userId', 'createdAt', 'updatedAt'].includes(key)
    );
    
    return (
      <div className="space-y-6 py-4">
        <Alert className="mb-6">
          <HelpCircle className="h-5 w-5 mr-2" />
          <AlertDescription>
            Previsualización de los datos a importar. Haz clic en cualquier celda para editar su contenido.
          </AlertDescription>
        </Alert>
        
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Vista previa de los datos a importar</TableCaption>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead key={column}>
                    {FIELD_OPTIONS.find(option => option.value === column)?.label || column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map(column => (
                    <TableCell key={column}>
                      <input
                        type="text"
                        value={row[column] || ''}
                        onChange={(e) => handleCellEdit(rowIndex, column, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep('mapping')}>
            Atrás
          </Button>
          <Button onClick={completeImport}>
            Importar contactos
          </Button>
        </div>
      </div>
    );
  };

  // Renderizar el paso de importación en progreso
  const renderImportingStep = () => (
    <div className="space-y-6 py-8 text-center">
      <Spinner className="mx-auto h-10 w-10" />
      <h3 className="text-lg font-medium">{statusMessage}</h3>
      <Progress value={progress} className="w-full h-2" />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar contactos</DialogTitle>
        </DialogHeader>
        
        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
      </DialogContent>
    </Dialog>
  );
}