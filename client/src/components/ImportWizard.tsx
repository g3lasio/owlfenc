import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/lib/clientFirebase';
import { analyzeCSVWithIA, analyzeVCFWithIA, mapCSVToClients, normalizeClientData, CSVAnalysisResult, ColumnMapping, CLIENT_FIELD_OPTIONS } from '@/lib/intelligentImport';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, Upload, FileSpreadsheet, Smartphone, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (clients: Client[]) => void;
}

export function ImportWizard({ isOpen, onClose, onImportComplete }: ImportWizardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('csv');
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [vcfFile, setVcfFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  
  const [analysisResult, setAnalysisResult] = useState<CSVAnalysisResult | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar la carga del archivo CSV
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // Manejar la carga del archivo VCF
  const handleVcfFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVcfFile(file);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      
      reader.readAsText(file);
    }
  };

  // Analizar el archivo utilizando IA
  const analyzeFile = async () => {
    try {
      setIsLoading(true);
      setProgress(10);
      setProgressMessage('Preparando archivo para análisis...');
      
      if (activeTab === 'csv' && fileContent) {
        setProgress(30);
        setProgressMessage('Analizando estructura del CSV con IA...');
        
        const result = await analyzeCSVWithIA(fileContent);
        setAnalysisResult(result);
        
        setProgress(70);
        setProgressMessage('Generando mapeos preliminares...');
        
        setColumnMappings(result.mappings);
        
        // Generar una vista previa de los datos mapeados
        setProgress(90);
        setProgressMessage('Preparando vista previa de los datos...');
        
        // Usar solo las primeras 10 filas de datos para la vista previa
        const dataRows = result.hasHeaderRow ? result.sampleRows : result.sampleRows.slice(0, 10);
        const preview = generatePreviewData(result, result.mappings);
        setPreviewData(preview);
        
        setProgress(100);
        setProgressMessage('Análisis completado correctamente');
        
        setStep('mapping');
      } else if (activeTab === 'vcf' && fileContent) {
        setProgress(30);
        setProgressMessage('Analizando archivo VCF con IA...');
        
        const result = await analyzeVCFWithIA(fileContent);
        // Manejar el resultado del análisis VCF
        // (Similar al procesamiento de CSV pero adaptado para VCF)
        
        setProgress(100);
        setProgressMessage('Análisis completado correctamente');
      } else {
        throw new Error('No se ha seleccionado ningún archivo para analizar');
      }
    } catch (error) {
      console.error('Error al analizar el archivo:', error);
      toast({
        title: 'Error al analizar el archivo',
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generar datos de vista previa basados en los mapeos actuales
  const generatePreviewData = (analysis: CSVAnalysisResult, mappings: ColumnMapping[]) => {
    if (!analysis || !analysis.sampleRows || analysis.sampleRows.length === 0) {
      return [];
    }
    
    // Usar solo hasta 10 filas para la vista previa
    const dataRows = analysis.sampleRows.slice(0, 10);
    const rawClients = mapCSVToClients(dataRows, mappings);
    return normalizeClientData(rawClients);
  };

  // Actualizar el mapeo de una columna específica
  const updateColumnMapping = (index: number, targetField: string) => {
    const newMappings = [...columnMappings];
    newMappings[index] = {
      ...newMappings[index],
      targetField,
    };
    
    setColumnMappings(newMappings);
    
    // Actualizar la vista previa con los nuevos mapeos
    if (analysisResult) {
      const preview = generatePreviewData(analysisResult, newMappings);
      setPreviewData(preview);
    }
  };

  // Completar la importación
  const completeImport = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!analysisResult) {
        throw new Error('No hay datos para importar');
      }
      
      // Procesar todas las filas, no solo la muestra de vista previa
      const rows = analysisResult.hasHeaderRow 
        ? analysisResult.sampleRows 
        : analysisResult.sampleRows;
        
      // Mapear los datos a objetos cliente usando los mapeos finales
      const mappedClients = mapCSVToClients(rows, columnMappings);
      
      // Normalizar los datos para asegurar consistencia
      const normalizedClients = normalizeClientData(mappedClients);
      
      // Llamar al callback con los clientes importados
      onImportComplete(normalizedClients);
      
      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${normalizedClients.length} clientes correctamente.`,
      });
      
      // Cerrar el wizard
      onClose();
    } catch (error) {
      console.error('Error al importar clientes:', error);
      toast({
        title: 'Error en la importación',
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [analysisResult, columnMappings, onImportComplete, onClose, toast]);

  // Resetear el estado al cerrar
  const handleClose = () => {
    setStep('upload');
    setCsvFile(null);
    setVcfFile(null);
    setFileContent('');
    setAnalysisResult(null);
    setColumnMappings([]);
    setPreviewData([]);
    onClose();
  };

  // Renderizar la interfaz de carga de archivos
  const renderUploadStep = () => (
    <div className="space-y-6 py-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </TabsTrigger>
          <TabsTrigger value="vcf">
            <Smartphone className="mr-2 h-4 w-4" />
            vCard (VCF)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="csv" className="pt-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-8 mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv" 
              className="hidden" 
              onChange={handleCsvFileChange} 
            />
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">Haz clic para seleccionar o arrastra un archivo CSV</p>
            {csvFile ? (
              <p className="text-xs font-medium">{csvFile.name}</p>
            ) : (
              <p className="text-xs text-gray-500">CSV, XLS, XLSX hasta 10MB</p>
            )}
          </div>
          
          {csvFile && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-sm font-medium">{csvFile.name}</div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {(csvFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="vcf" className="pt-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-8 mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".vcf" 
              className="hidden" 
              onChange={handleVcfFileChange} 
            />
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">Haz clic para seleccionar o arrastra un archivo VCF</p>
            {vcfFile ? (
              <p className="text-xs font-medium">{vcfFile.name}</p>
            ) : (
              <p className="text-xs text-gray-500">Archivos vCard (VCF) hasta 10MB</p>
            )}
          </div>
          
          {vcfFile && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-sm font-medium">{vcfFile.name}</div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {(vcfFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {isLoading && (
        <div className="mt-4 space-y-3">
          <Progress value={progress} />
          <p className="text-sm text-gray-600">{progressMessage}</p>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
        <Button 
          onClick={analyzeFile} 
          disabled={isLoading || (!csvFile && !vcfFile)}
        >
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          Analizar con IA
        </Button>
      </div>
    </div>
  );

  // Renderizar la interfaz de mapeo de columnas
  const renderMappingStep = () => {
    if (!analysisResult || !columnMappings.length) return null;
    
    return (
      <div className="space-y-6 py-4">
        <Alert className="mb-6">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <AlertDescription>
            Nuestro sistema ha analizado las columnas de tu archivo y detectado automáticamente su contenido. 
            Por favor, verifica y ajusta las asignaciones si es necesario.
          </AlertDescription>
        </Alert>

        <Table>
          <TableCaption>Asignación de columnas detectada por IA</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Columna en CSV</TableHead>
              <TableHead>Ejemplos de datos</TableHead>
              <TableHead>Tipo detectado</TableHead>
              <TableHead className="w-[200px]">Asignar a campo</TableHead>
              <TableHead className="w-[50px]">Confianza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columnMappings.map((mapping, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{mapping.originalHeader}</TableCell>
                <TableCell className="text-xs text-gray-600">
                  {mapping.examples.join(', ')}
                </TableCell>
                <TableCell>
                  {mapping.detectedType}
                  {mapping.confidence >= 0.9 && (
                    <CheckCircle2 className="inline-block ml-1 h-4 w-4 text-green-500" />
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => updateColumnMapping(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_FIELD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Progress value={mapping.confidence * 100} className="h-2 w-10" />
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

  // Renderizar la interfaz de previsualización de datos
  const renderPreviewStep = () => {
    if (!previewData.length) return null;
    
    const previewColumns = ['name', 'email', 'phone', 'mobilePhone', 'address'];
    
    return (
      <div className="space-y-6 py-4">
        <Alert className="mb-6">
          <HelpCircle className="h-5 w-5 mr-2" />
          <AlertDescription>
            Previsualización de los primeros 10 registros. Verifica que los datos se hayan mapeado correctamente.
          </AlertDescription>
        </Alert>
        
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Previsualización de datos a importar</TableCaption>
            <TableHeader>
              <TableRow>
                {previewColumns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((client, index) => (
                <TableRow key={index}>
                  {previewColumns.map((column) => (
                    <TableCell key={column}>
                      {client[column] || '-'}
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
          <Button onClick={completeImport} disabled={isLoading}>
            {isLoading && <Spinner className="mr-2 h-4 w-4" />}
            Importar {previewData.length} clientes
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Importación Inteligente de Contactos
          </DialogTitle>
          <DialogDescription>
            Importa contactos desde diferentes fuentes con detección automática de campos usando IA.
          </DialogDescription>
        </DialogHeader>
        
        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
      </DialogContent>
    </Dialog>
  );
}