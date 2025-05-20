
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { processCSVToClients, FieldMapping, CLIENT_FIELD_OPTIONS } from '@/lib/intelligentImportNew';

interface Client {
  id?: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  classification: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

interface CSVRow {
  [key: string]: string;
}

const ContactImportWizard = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para manejar el proceso de importación
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState(1);
  const [previewData, setPreviewData] = useState<Partial<Client>[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importStats, setImportStats] = useState({
    total: 0,
    success: 0,
    duplicate: 0,
    error: 0
  });
  const [useIntelligentMapping, setUseIntelligentMapping] = useState(true);
  const [manualMappings, setManualMappings] = useState<{ [key: string]: string }>({});

  // Función para manejar la selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);

    const file = event.target.files?.[0];
    if (!file) {
      setIsLoading(false);
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      complete: (results) => {
        // Obtener los datos y encabezados
        const data = results.data as string[][];
        if (data.length > 0) {
          const headers = data[0];
          const rows = data.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

          // Configurar los datos
          setCsvData(rows);
          setHeaders(headers);

          // Intentar mapear automáticamente utilizando nuestro sistema inteligente
          try {
            // Procesar con mapeo inteligente
            const { mappings: smartMappings, clients } = processCSVToClients(headers, rows.slice(0, 20)); // Solo usamos las primeras 20 filas para el análisis
            setMappings(smartMappings);

            // Configurar también los mapeos manuales como respaldo
            const manualMap: { [key: string]: string } = {};
            for (const mapping of smartMappings) {
              manualMap[headers[mapping.sourceIndex]] = mapping.targetField;
            }
            setManualMappings(manualMap);

            // Generar datos de vista previa inicial
            setPreviewData(clients.slice(0, 10));
          } catch (error) {
            console.error("Error processing mappings:", error);

            // Fallback a mapeo básico si el inteligente falla
            const initialMappings: { [key: string]: string } = {};
            headers.forEach(header => {
              const lowerHeader = header.toLowerCase();

              if (lowerHeader.includes('name') || lowerHeader.includes('nombre')) {
                initialMappings[header] = 'name';
              } else if (lowerHeader.includes('email') || lowerHeader.includes('correo')) {
                initialMappings[header] = 'email';
              } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel') || lowerHeader.includes('fono')) {
                initialMappings[header] = 'phone';
              } else if (lowerHeader.includes('address') || lowerHeader.includes('direcci')) {
                initialMappings[header] = 'address';
              } else {
                initialMappings[header] = 'none';
              }
            });

            setManualMappings(initialMappings);
            setUseIntelligentMapping(false);
          }

          // Avanzar al siguiente paso
          setStep(2);
        }

        setIsLoading(false);
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: t('general.error'),
          description: t('clients.importError', { error: error.message })
        });
        setIsLoading(false);
      }
    });
  };

  // Actualizar mapeo cuando el usuario cambia la asignación
  const handleMappingChange = (header: string, value: string) => {
    setManualMappings(prev => ({
      ...prev,
      [header]: value
    }));

    // También actualizamos el mapeo inteligente si está activado
    if (useIntelligentMapping) {
      const updatedMappings = [...mappings];
      const index = updatedMappings.findIndex(m => headers[m.sourceIndex] === header);

      if (index !== -1) {
        updatedMappings[index] = {
          ...updatedMappings[index],
          targetField: value
        };
        setMappings(updatedMappings);
      }
    }
  };

  // Toggle entre mapeo inteligente y manual
  const toggleMappingMode = () => {
    setUseIntelligentMapping(!useIntelligentMapping);
  };

  // Generar datos de vista previa con información de confianza
  const generatePreview = () => {
    try {
      if (useIntelligentMapping) {
        // Con el mapeo inteligente, generamos datos y mostramos la confianza del mapeo
        const { clients, mappings: detectedMappings } = processCSVToClients(headers, csvData.slice(0, 10));
        
        // Guardamos los mapeos detectados para mostrar niveles de confianza
        setMappings(detectedMappings);
        
        // También actualizamos los mapeos manuales como respaldo
        const manualMap: { [key: string]: string } = {};
        for (const mapping of detectedMappings) {
          manualMap[headers[mapping.sourceIndex]] = mapping.targetField;
        }
        setManualMappings(manualMap);
        
        // Establecemos los datos de vista previa
        setPreviewData(clients);
      } else {
        // Con el mapeo manual, convertimos los datos CSV en objetos de cliente
        const preview: Partial<Client>[] = csvData.slice(0, 10).map((row, index) => {
          const client: Partial<Client> = {
            clientId: `preview_${index}`,
            name: '',
            email: '',
            phone: '',
            address: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'CSV Import',
            classification: 'cliente'
          };

          // Aplicar mapeos manuales a cada fila
          headers.forEach((header, colIndex) => {
            const field = manualMappings[header];
            if (field !== 'none' && field !== 'unknown' && field in client) {
              (client as any)[field] = row[colIndex] || '';
            }
          });

          return client;
        });

        setPreviewData(preview);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        variant: "destructive",
        title: t('general.error'),
        description: t('clients.previewError')
      });
    }

    setStep(3);
  };

  // Preparar los datos para la importación
  const prepareDataForImport = (): Partial<Client>[] => {
    if (useIntelligentMapping) {
      // Usar el procesamiento inteligente para todos los datos
      try {
        const { clients } = processCSVToClients(headers, csvData);
        return clients;
      } catch (error) {
        console.error("Error preparing data with intelligent mapping:", error);
        toast({
          variant: "warning",
          title: t('general.warning'),
          description: t('clients.intelligentMappingFailed')
        });

        // Si falla, cambiar a mapeo manual
        setUseIntelligentMapping(false);
      }
    }

    // Método de respaldo: mapeo manual
    return csvData.map((row, index) => {
      const client: Partial<Client> = {
        clientId: `client_${Date.now()}_${index}`,
        name: '',
        email: '',
        phone: '',
        address: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'CSV Import',
        classification: 'cliente'
      };

      // Aplicar mapeos manuales a cada fila
      headers.forEach((header, colIndex) => {
        const field = manualMappings[header];
        if (field !== 'none' && field in client) {
          (client as any)[field] = row[colIndex] || '';
        }
      });

      return client;
    });
  };

  // Manejar la importación final
  const handleImport = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: t('general.error'),
        description: t('general.authRequired')
      });
      return;
    }

    setIsLoading(true);
    const clientsToImport = prepareDataForImport();

    // Estadísticas de importación
    const stats = {
      total: clientsToImport.length,
      success: 0,
      duplicate: 0,
      error: 0
    };

    try {
      // Importar cada cliente
      for (const client of clientsToImport) {
        try {
          // Verificar si ya existe un cliente con el mismo email
          if (client.email) {
            const existingClients = await getDocs(
              query(collection(db, 'clients'), 
                    where('userId', '==', currentUser.uid),
                    where('email', '==', client.email))
            );

            if (!existingClients.empty) {
              stats.duplicate++;
              continue;
            }
          }

          // Añadir el ID de usuario al cliente
          const clientWithUser = {
            ...client,
            userId: currentUser.uid
          };

          // Guardar en Firestore
          await addDoc(collection(db, 'clients'), clientWithUser);
          stats.success++;
        } catch (error) {
          console.error("Error importing client:", error);
          stats.error++;
        }
      }

      // Actualizar estadísticas y mostrar diálogo de confirmación
      setImportStats(stats);
      setShowConfirmDialog(true);

    } catch (error) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: t('general.error'),
        description: t('clients.importFailed')
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reiniciar el proceso
  const resetImport = () => {
    setCsvData([]);
    setHeaders([]);
    setMappings([]);
    setManualMappings({});
    setFileName('');
    setStep(1);
    setPreviewData([]);
    setShowConfirmDialog(false);
    setImportStats({
      total: 0,
      success: 0,
      duplicate: 0,
      error: 0
    });
    setUseIntelligentMapping(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Renderizar confianza del mapeo como una Badge
  const renderConfidenceBadge = (confidence: number) => {
    if (confidence > 0.8) {
      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Alta</Badge>;
    } else if (confidence > 0.5) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Media</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Baja</Badge>;
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{t('clients.importTitle')}</CardTitle>
          <CardDescription>
            {t('clients.importDescription')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md h-48">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="mb-4 text-sm text-muted-foreground text-center">
                {t('clients.dragAndDrop')}
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isLoading}
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('general.loading')}</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> {t('clients.selectFile')}</>
                )}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium mb-2">
                    {t('clients.fieldMapping')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMappingMode}
                    className="mb-2"
                  >
                    {useIntelligentMapping ? "Cambiar a mapeo manual" : "Usar mapeo inteligente"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('clients.fieldMappingDescription')}
                </p>

                {useIntelligentMapping && (
                  <div className="flex items-center p-2 mb-4 bg-blue-50 text-blue-800 rounded-md">
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    <p className="text-xs">
                      Modo inteligente: detectamos automáticamente el tipo de cada campo, incluso si los datos aparecen desordenados.
                    </p>
                  </div>
                )}
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('clients.csvHeader')}</TableHead>
                      <TableHead>{t('clients.mappedField')}</TableHead>
                      {useIntelligentMapping && <TableHead>Confianza</TableHead>}
                      <TableHead>{t('clients.sampleData')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((header, index) => {
                      // Buscar el mapeo correspondiente si estamos en modo inteligente
                      const intelligentMapping = useIntelligentMapping 
                        ? mappings.find(m => m.sourceIndex === index)
                        : null;

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{header}</TableCell>
                          <TableCell>
                            <Select
                              value={useIntelligentMapping 
                                ? (intelligentMapping?.targetField || 'none')
                                : (manualMappings[header] || 'none')}
                              onValueChange={(value) => handleMappingChange(header, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="name">{t('clients.fields.name')}</SelectItem>
                                <SelectItem value="email">{t('clients.fields.email')}</SelectItem>
                                <SelectItem value="phone">{t('clients.fields.phone')}</SelectItem>
                                <SelectItem value="address">{t('clients.fields.address')}</SelectItem>
                                <SelectItem value="city">Ciudad</SelectItem>
                                <SelectItem value="state">Estado/Provincia</SelectItem>
                                <SelectItem value="zipcode">Código Postal</SelectItem>
                                <SelectItem value="country">País</SelectItem>
                                <SelectItem value="none">{t('clients.fields.ignore')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {useIntelligentMapping && (
                            <TableCell>
                              {intelligentMapping && renderConfidenceBadge(intelligentMapping.confidence)}
                            </TableCell>
                          )}

                          <TableCell className="text-sm text-muted-foreground">
                            {csvData[0] && csvData[0][index] ? csvData[0][index] : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium mb-2">
                    {t('clients.dataPreview')}
                  </p>
                  <Badge variant={useIntelligentMapping ? "default" : "outline"} className="mb-2">
                    {useIntelligentMapping ? "Mapeo Inteligente" : "Mapeo Manual"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('clients.dataPreviewDescription')}
                </p>
              </div>

              <div className="border rounded-md overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('clients.fields.name')}</TableHead>
                      <TableHead>{t('clients.fields.email')}</TableHead>
                      <TableHead>{t('clients.fields.phone')}</TableHead>
                      <TableHead>{t('clients.fields.address')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.name || '-'}</TableCell>
                        <TableCell>{client.email || '-'}</TableCell>
                        <TableCell>{client.phone || '-'}</TableCell>
                        <TableCell>{client.address || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <AlertCircle className="h-4 w-4 inline-block mr-2 text-yellow-500" />
                  {t('clients.importWarning', { count: csvData.length })}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
              disabled={isLoading}
            >
              {t('general.back')}
            </Button>
          )}

          {step === 1 && (
            <Button variant="ghost" onClick={resetImport} disabled={isLoading}>
              {t('general.cancel')}
            </Button>
          )}

          {step < 3 ? (
            <Button 
              onClick={step === 1 ? () => fileInputRef.current?.click() : generatePreview}
              disabled={isLoading || (step === 2 && headers.length === 0)}
            >
              {step === 1 ? t('clients.selectFile') : t('general.next')}
            </Button>
          ) : (
            <Button 
              onClick={handleImport}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('general.loading')}</>
              ) : (
                <>{t('clients.importNow')}</>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Diálogo de confirmación de importación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clients.importComplete')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted p-3 rounded-md text-center">
                <p className="text-sm text-muted-foreground">{t('clients.total')}</p>
                <p className="text-2xl font-bold">{importStats.total}</p>
              </div>
              <div className="bg-muted p-3 rounded-md text-center">
                <p className="text-sm text-muted-foreground">{t('clients.imported')}</p>
                <p className="text-2xl font-bold text-green-500">{importStats.success}</p>
              </div>
              <div className="bg-muted p-3 rounded-md text-center">
                <p className="text-sm text-muted-foreground">{t('clients.duplicates')}</p>
                <p className="text-2xl font-bold text-yellow-500">{importStats.duplicate}</p>
              </div>
              <div className="bg-muted p-3 rounded-md text-center">
                <p className="text-sm text-muted-foreground">{t('clients.errors')}</p>
                <p className="text-2xl font-bold text-red-500">{importStats.error}</p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t('clients.importSummary', { success: importStats.success, total: importStats.total })}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={resetImport}>{t('general.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Make sure to export the component correctly
export default ContactImportWizard;
export { ContactImportWizard };
