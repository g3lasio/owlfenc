import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle, ArrowRight, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Client } from "@/lib/clientFirebase";
import { CSVAnalysisResult, ColumnMapping, analyzeCSVStructure, processCsvRowWithMapping } from "@/lib/intelligentImport";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (clients: Client[]) => void;
}

export function ImportWizard({ isOpen, onClose, onImportComplete }: ImportWizardProps) {
  const { toast } = useToast();
  const [importType, setImportType] = useState<"csv" | "vcf">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvContent, setCsvContent] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<CSVAnalysisResult | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  useEffect(() => {
    // Reset wizard state when opened
    if (isOpen) {
      setStep(1);
      setFile(null);
      setCsvContent("");
      setAnalysisResult(null);
      setColumnMappings([]);
      setPreviewData([]);
    }
  }, [isOpen]);

  // When analysis result changes, initialize column mappings
  useEffect(() => {
    if (analysisResult) {
      setColumnMappings(analysisResult.mappings);
      validateMappings(analysisResult.mappings);
      
      // Generate preview data with current mappings
      generatePreviewData(analysisResult, analysisResult.mappings);
    }
  }, [analysisResult]);

  // Validate if required fields are mapped
  const validateMappings = (mappings: ColumnMapping[]) => {
    const requiredFields = ["name"];
    const missing = requiredFields.filter(field => 
      !mappings.some(mapping => mapping.targetField === field)
    );
    setMissingRequiredFields(missing);
    return missing.length === 0;
  };

  // Update when mappings change
  useEffect(() => {
    if (analysisResult && columnMappings.length > 0) {
      validateMappings(columnMappings);
      generatePreviewData(analysisResult, columnMappings);
    }
  }, [columnMappings]);

  // Generate preview data
  const generatePreviewData = (analysis: CSVAnalysisResult, mappings: ColumnMapping[]) => {
    const previewRows = analysis.sampleRows.slice(0, 5);
    const preview = previewRows.map(row => {
      return processCsvRowWithMapping(row, mappings);
    });
    setPreviewData(preview);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Handle file analysis
  const analyzeFile = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor selecciona un archivo para importar"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (!e.target || typeof e.target.result !== 'string') {
          throw new Error("Error al leer el archivo");
        }

        const content = e.target.result;
        setCsvContent(content);
        
        if (importType === "csv") {
          // Analyze CSV structure with AI
          const result = await analyzeCSVStructure(content);
          setAnalysisResult(result);
          setStep(2);
        } else if (importType === "vcf") {
          // Future: Process vCard data with AI
          toast({
            variant: "default",
            title: "Importación de vCard",
            description: "La importación inteligente de vCard estará disponible próximamente"
          });
        }
      };

      reader.onerror = () => {
        throw new Error("Error al leer el archivo");
      };

      if (importType === "csv") {
        reader.readAsText(file);
      } else if (importType === "vcf") {
        reader.readAsText(file);
      }
    } catch (error: any) {
      console.error("Error analyzing file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al analizar el archivo: " + (error.message || "Error desconocido")
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle mapping change
  const handleMappingChange = (columnIndex: number, newTargetField: string) => {
    const updatedMappings = [...columnMappings];
    updatedMappings[columnIndex] = {
      ...updatedMappings[columnIndex],
      targetField: newTargetField
    };
    setColumnMappings(updatedMappings);
  };

  // Import the data with current mappings
  const importData = async () => {
    if (!csvContent || !analysisResult) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay datos para importar"
      });
      return;
    }

    // Validate required fields
    if (missingRequiredFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Campos requeridos faltantes",
        description: `Falta mapear el campo obligatorio: ${missingRequiredFields.join(", ")}`
      });
      return;
    }

    setIsImporting(true);

    try {
      // Get data rows from CSV
      const rows = csvContent.split('\n');
      const dataStartIndex = analysisResult.hasHeaderRow ? 1 : 0;
      const dataRows = rows.slice(dataStartIndex).filter(row => row.trim());
      
      // Process each row with current mappings
      const importedClients: Client[] = [];
      
      for (const rowData of dataRows) {
        if (!rowData.trim()) continue;
        
        const row = rowData.split(',').map(cell => cell.trim());
        const clientData = processCsvRowWithMapping(row, columnMappings);
        
        // Skip rows without a name
        if (!clientData.name) continue;
        
        // Add timestamps for Firebase
        clientData.createdAt = Timestamp.now();
        clientData.updatedAt = Timestamp.now();
        
        try {
          // Save to Firebase
          const docRef = await addDoc(collection(db, "clients"), clientData);
          
          importedClients.push({
            id: docRef.id,
            ...clientData,
            createdAt: clientData.createdAt.toDate(),
            updatedAt: clientData.updatedAt.toDate(),
          } as Client);
        } catch (error) {
          console.error("Error saving client:", error);
        }
      }
      
      // Notify success
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${importedClients.length} contactos`
      });
      
      onImportComplete(importedClients);
      onClose();
    } catch (error: any) {
      console.error("Error importing data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al importar datos: " + (error.message || "Error desconocido")
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Get field options for mapping
  const getFieldOptions = () => {
    return [
      { value: "name", label: "Nombre" },
      { value: "email", label: "Email" },
      { value: "phone", label: "Teléfono" },
      { value: "mobilePhone", label: "Teléfono móvil" },
      { value: "address", label: "Dirección" },
      { value: "city", label: "Ciudad" },
      { value: "state", label: "Estado/Provincia" },
      { value: "zipCode", label: "Código postal" },
      { value: "notes", label: "Notas" },
      { value: "source", label: "Fuente" },
      { value: "tags", label: "Etiquetas" },
      { value: "classification", label: "Clasificación" },
      { value: "unknown", label: "No importar" }
    ];
  };

  // Render confidence badge
  const renderConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" /> Alta
      </span>;
    } else if (confidence >= 0.5) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Media
      </span>;
    } else {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertCircle className="w-3 h-3 mr-1" /> Baja
      </span>;
    }
  };

  // Render wizard content based on current step
  const renderWizardContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Importar contactos</DialogTitle>
              <DialogDescription>
                Importa contactos desde distintas fuentes de forma inteligente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Tabs defaultValue="csv" onValueChange={(value) => setImportType(value as "csv" | "vcf")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv">CSV / Excel</TabsTrigger>
                  <TabsTrigger value="vcf">vCard (Contactos)</TabsTrigger>
                </TabsList>
                <TabsContent value="csv" className="mt-4">
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <Label htmlFor="csv-file" className="text-sm font-medium">
                        Selecciona un archivo CSV
                      </Label>
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        El sistema analizará automáticamente la estructura del archivo
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="vcf" className="mt-4">
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <Label htmlFor="vcf-file" className="text-sm font-medium">
                        Selecciona un archivo vCard (.vcf)
                      </Label>
                      <Input
                        id="vcf-file"
                        type="file"
                        accept=".vcf,.vcard"
                        onChange={handleFileChange}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Importa contactos desde Apple Contacts, Google Contacts u otros
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={analyzeFile} 
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        );
      
      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Mapeo de campos</DialogTitle>
              <DialogDescription>
                Revisa y ajusta el mapeo automático de los campos
              </DialogDescription>
            </DialogHeader>
            
            {analysisResult && (
              <div className="py-4 space-y-6">
                {missingRequiredFields.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                    <AlertCircle className="inline-block mr-2 h-4 w-4" />
                    Falta mapear el campo obligatorio: {missingRequiredFields.join(", ")}
                  </div>
                )}
                
                <div className="border rounded-md">
                  <div className="bg-muted p-3 font-medium text-sm">
                    <FileText className="inline mr-2 h-4 w-4" />
                    Mapeo de columnas detectado automáticamente
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Encabezado original</TableHead>
                          <TableHead className="w-[120px]">Tipo detectado</TableHead>
                          <TableHead className="w-[100px]">Confianza</TableHead>
                          <TableHead className="w-[180px]">Mapear a campo</TableHead>
                          <TableHead>Ejemplos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columnMappings.map((mapping, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{mapping.originalHeader}</TableCell>
                            <TableCell>{mapping.detectedType}</TableCell>
                            <TableCell>{renderConfidenceBadge(mapping.confidence)}</TableCell>
                            <TableCell>
                              <Select 
                                value={mapping.targetField}
                                onValueChange={(value) => handleMappingChange(index, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleccionar campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getFieldOptions().map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {mapping.examples.join(", ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="border rounded-md">
                  <div className="bg-muted p-3 font-medium text-sm">
                    Vista previa de datos
                  </div>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Nombre</TableHead>
                          <TableHead className="w-[200px]">Email</TableHead>
                          <TableHead className="w-[150px]">Teléfono</TableHead>
                          <TableHead>Dirección</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((client, index) => (
                          <TableRow key={index}>
                            <TableCell>{client.name || '-'}</TableCell>
                            <TableCell>{client.email || '-'}</TableCell>
                            <TableCell>{client.phone || client.mobilePhone || '-'}</TableCell>
                            <TableCell>{client.address || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button 
                onClick={importData}
                disabled={isImporting || missingRequiredFields.length > 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : "Importar contactos"}
              </Button>
            </DialogFooter>
          </>
        );
      
      default:
        return null;
    }
  };

  // Create a Spinner component for loading states
  const Spinner = () => (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Procesando...</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        {renderWizardContent()}
      </DialogContent>
    </Dialog>
  );
}