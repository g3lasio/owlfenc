import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, Wand2, Eye, ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  processImportV2, 
  confirmImportV2, 
  ImportV2Response, 
  ImportedContact, 
  ImportIssue,
  getQualityColor, 
  getConfidenceColor 
} from '@/lib/intelligentImportV2';

type WizardStep = 'upload' | 'analyzing' | 'review' | 'duplicates' | 'confirm' | 'complete';

interface SmartContactImportWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function SmartContactImportWizard({ onComplete, onCancel }: SmartContactImportWizardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<ImportV2Response | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(new Set());
  const [showIssues, setShowIssues] = useState(false);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'Archivo muy grande',
        description: 'El archivo debe ser menor a 10MB'
      });
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setStep('analyzing');

    try {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const fileType = isExcel ? 'excel' : 'csv';
      
      let content: string;
      if (isExcel) {
        content = await readFileAsBase64(file);
      } else {
        content = await file.text();
      }
      
      const result = await processImportV2(content, fileType);
      setImportResult(result);
      
      if (result.success) {
        const allIds = new Set(result.contacts.map((_, i) => `contact_${i}`));
        setSelectedContacts(allIds);
        setStep('review');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de importación',
          description: result.error || 'No se pudo procesar el archivo'
        });
        setStep('upload');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al procesar el archivo'
      });
      setStep('upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult) return;

    setIsLoading(true);
    try {
      const contactsToImport = importResult.contacts.filter((_, i) => 
        selectedContacts.has(`contact_${i}`)
      );

      const duplicatesToInclude = importResult.duplicates
        .filter((_, i) => selectedDuplicates.has(i))
        .map(d => d.contact);

      const result = await confirmImportV2(
        contactsToImport,
        duplicatesToInclude.length > 0,
        duplicatesToInclude
      );

      if (result.success) {
        setStep('complete');
        toast({
          title: 'Importación completada',
          description: `${result.savedCount} contactos importados correctamente`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al guardar los contactos'
        });
      }
    } catch (error) {
      console.error('Confirm error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al confirmar la importación'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContactSelection = (index: number) => {
    const id = `contact_${index}`;
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllContacts = () => {
    if (!importResult) return;
    if (selectedContacts.size === importResult.contacts.length) {
      setSelectedContacts(new Set());
    } else {
      const allIds = new Set(importResult.contacts.map((_, i) => `contact_${i}`));
      setSelectedContacts(allIds);
    }
  };

  const toggleDuplicateSelection = (index: number) => {
    setSelectedDuplicates(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const resetWizard = () => {
    setStep('upload');
    setFileName('');
    setImportResult(null);
    setSelectedContacts(new Set());
    setSelectedDuplicates(new Set());
    setShowIssues(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderQualityBadge = () => {
    if (!importResult?.structuralAnalysis) return null;
    const { overallQuality } = importResult.structuralAnalysis;
    const colorClass = getQualityColor(overallQuality);
    const labels = {
      good: 'Excelente',
      fair: 'Aceptable',
      poor: 'Problemas detectados',
      corrupted: 'Datos corruptos'
    };
    return (
      <Badge className={colorClass}>
        {labels[overallQuality]}
      </Badge>
    );
  };

  const renderSeverityIcon = (severity: ImportIssue['severity']) => {
    switch (severity) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Eye className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto" data-testid="smart-import-wizard">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          <CardTitle>Importación Inteligente de Contactos</CardTitle>
        </div>
        <CardDescription>
          Importa contactos desde CSV o Excel. El sistema detecta y corrige automáticamente datos mal formateados.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'upload' && (
          <div 
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-zone"
          >
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Arrastra tu archivo aquí</p>
            <p className="text-sm text-muted-foreground mb-4">o haz clic para seleccionar</p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="file-input"
            />
            <Button variant="outline" data-testid="button-select-file">
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
            <div className="flex gap-2 mt-4">
              <Badge variant="outline">CSV</Badge>
              <Badge variant="outline">Excel</Badge>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center p-8" data-testid="analyzing-state">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Analizando archivo...</p>
            <p className="text-sm text-muted-foreground mb-4">{fileName}</p>
            <div className="w-full max-w-xs">
              <Progress value={45} className="mb-2" />
              <p className="text-xs text-center text-muted-foreground">
                Detectando estructura, mapeando campos, normalizando datos...
              </p>
            </div>
          </div>
        )}

        {step === 'review' && importResult && (
          <div className="space-y-4" data-testid="review-state">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Archivo</p>
                  <p className="font-medium">{fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calidad</p>
                  {renderQualityBadge()}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contactos válidos</p>
                  <p className="font-medium text-green-600">{importResult.stats.validContacts}</p>
                </div>
                {importResult.stats.autoCorrections > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-correcciones</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      {importResult.stats.autoCorrections}
                    </Badge>
                  </div>
                )}
              </div>
              {importResult.issues.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowIssues(!showIssues)}
                  data-testid="button-toggle-issues"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {importResult.issues.length} avisos
                </Button>
              )}
            </div>

            {showIssues && importResult.issues.length > 0 && (
              <ScrollArea className="h-32 border rounded-lg p-2">
                {importResult.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 text-sm">
                    {renderSeverityIcon(issue.severity)}
                    <span>Fila {issue.rowIndex + 1}: {issue.message}</span>
                  </div>
                ))}
              </ScrollArea>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Checkbox 
                checked={selectedContacts.size === importResult.contacts.length}
                onCheckedChange={toggleAllContacts}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm font-medium">
                Seleccionar todos ({selectedContacts.size}/{importResult.contacts.length})
              </span>
            </div>

            <ScrollArea className="h-80 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.contacts.map((contact, index) => (
                    <TableRow 
                      key={index} 
                      className={!selectedContacts.has(`contact_${index}`) ? 'opacity-50' : ''}
                      data-testid={`row-contact-${index}`}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedContacts.has(`contact_${index}`)}
                          onCheckedChange={() => toggleContactSelection(index)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{contact.name || '-'}</TableCell>
                      <TableCell>{contact.email || '-'}</TableCell>
                      <TableCell>{contact.phone || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {[contact.address, contact.city, contact.state, contact.zipCode]
                          .filter(Boolean).join(', ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === 'duplicates' && importResult && importResult.duplicates.length > 0 && (
          <div className="space-y-4" data-testid="duplicates-state">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="font-medium text-yellow-800">
                  Se encontraron {importResult.duplicates.length} posibles duplicados
                </p>
              </div>
              <p className="text-sm text-yellow-700">
                Estos contactos ya existen en tu base de datos. Selecciona los que deseas importar de todas formas.
              </p>
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Contacto a importar</TableHead>
                    <TableHead>Duplicado detectado</TableHead>
                    <TableHead>Confianza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.duplicates.map((dup, index) => (
                    <TableRow key={index} data-testid={`row-duplicate-${index}`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDuplicates.has(index)}
                          onCheckedChange={() => toggleDuplicateSelection(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dup.contact.name}</p>
                          <p className="text-sm text-muted-foreground">{dup.contact.email || dup.contact.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dup.existingMatch}
                      </TableCell>
                      <TableCell>
                        <Badge className={getConfidenceColor(dup.confidence)}>
                          {Math.round(dup.confidence * 100)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="flex flex-col items-center justify-center p-8" data-testid="complete-state">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-xl font-medium mb-2">¡Importación completada!</p>
            <p className="text-muted-foreground mb-4">
              {selectedContacts.size} contactos importados exitosamente
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={resetWizard} data-testid="button-import-more">
                Importar más
              </Button>
              <Button onClick={onComplete} data-testid="button-finish">
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step === 'upload' && onCancel && (
          <Button variant="ghost" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        )}
        
        {step === 'review' && (
          <>
            <Button variant="outline" onClick={resetWizard} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button 
              onClick={() => {
                if (importResult?.duplicates && importResult.duplicates.length > 0) {
                  setStep('duplicates');
                } else {
                  handleConfirmImport();
                }
              }}
              disabled={isLoading || selectedContacts.size === 0}
              data-testid="button-continue"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
              ) : (
                <>Continuar<ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </>
        )}

        {step === 'duplicates' && (
          <>
            <Button variant="outline" onClick={() => setStep('review')} data-testid="button-back-duplicates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={isLoading}
              data-testid="button-confirm-import"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
              ) : (
                <>
                  Importar {selectedContacts.size} contactos
                  {selectedDuplicates.size > 0 && ` + ${selectedDuplicates.size} duplicados`}
                </>
              )}
            </Button>
          </>
        )}
      </CardFooter>

      <Dialog open={step === 'confirm'}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar importación</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            ¿Deseas importar {selectedContacts.size} contactos a tu base de datos?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('review')}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
