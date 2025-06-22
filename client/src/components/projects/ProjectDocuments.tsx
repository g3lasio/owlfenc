/**
 * Component for displaying and managing project documents
 * Shows estimates, invoices, and contracts for each project
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  getProjectDocuments, 
  getProjectDocumentSummary, 
  downloadDocument, 
  viewDocument,
  type ProjectDocument 
} from "@/lib/projectDocuments";
import { FileText, Download, Eye, Calendar, DollarSign, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectDocumentsProps {
  projectId: string;
  projectName?: string;
}

export default function ProjectDocuments({ projectId, projectName }: ProjectDocumentsProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [summary, setSummary] = useState({ estimates: 0, invoices: 0, contracts: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const [docs, summaryData] = await Promise.all([
        getProjectDocuments(projectId),
        getProjectDocumentSummary(projectId)
      ]);
      
      setDocuments(docs);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los documentos del proyecto."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (document: ProjectDocument) => {
    try {
      downloadDocument(document);
      toast({
        title: "Descarga iniciada",
        description: `${document.fileName} se está descargando.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el documento."
      });
    }
  };

  const handleView = (document: ProjectDocument) => {
    try {
      viewDocument(document);
      toast({
        title: "Documento abierto",
        description: `${document.fileName} se ha abierto en una nueva pestaña.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo abrir el documento."
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-blue-500 text-white';
      case 'sent': return 'bg-yellow-500 text-white';
      case 'viewed': return 'bg-purple-500 text-white';
      case 'approved': return 'bg-green-500 text-white';
      case 'signed': return 'bg-emerald-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'generated': return 'Generado';
      case 'sent': return 'Enviado';
      case 'viewed': return 'Visto';
      case 'approved': return 'Aprobado';
      case 'signed': return 'Firmado';
      default: return status;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'estimate': return '📋';
      case 'invoice': return '💰';
      case 'contract': return '📄';
      default: return '📁';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'estimate': return 'Estimado';
      case 'invoice': return 'Factura';
      case 'contract': return 'Contrato';
      default: return type;
    }
  };

  const filterDocuments = (type?: string) => {
    if (!type || type === 'all') return documents;
    return documents.filter(doc => doc.documentType === type);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos del Proyecto</CardTitle>
          <CardDescription>Cargando documentos...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-cyan-400" />
          <span className="text-cyan-300 font-medium text-sm">
            Documentos
            {projectName && <span className="text-gray-400 font-normal"> - {projectName}</span>}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Total: {summary.total} documentos
          {summary.estimates > 0 && ` | ${summary.estimates} estimados`}
          {summary.invoices > 0 && ` | ${summary.invoices} facturas`}
          {summary.contracts > 0 && ` | ${summary.contracts} contratos`}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-gray-800/50 border-cyan-400/20">
          <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300">
            <span className="hidden sm:inline">Todos</span>
            <span className="sm:hidden">All</span>
            <span className="ml-1">({summary.total})</span>
          </TabsTrigger>
          <TabsTrigger value="estimate" className="text-xs sm:text-sm data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300">
            <span className="hidden sm:inline">Estimados</span>
            <span className="sm:hidden">Est</span>
            <span className="ml-1">({summary.estimates})</span>
          </TabsTrigger>
          <TabsTrigger value="invoice" className="text-xs sm:text-sm data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300">
            <span className="hidden sm:inline">Facturas</span>
            <span className="sm:hidden">Inv</span>
            <span className="ml-1">({summary.invoices})</span>
          </TabsTrigger>
          <TabsTrigger value="contract" className="text-xs sm:text-sm data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300">
            <span className="hidden sm:inline">Contratos</span>
            <span className="sm:hidden">Con</span>
            <span className="ml-1">({summary.contracts})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-3">
          <DocumentsList documents={filterDocuments()} onDownload={handleDownload} onView={handleView} />
        </TabsContent>
        <TabsContent value="estimate" className="mt-3">
          <DocumentsList documents={filterDocuments('estimate')} onDownload={handleDownload} onView={handleView} />
        </TabsContent>
        <TabsContent value="invoice" className="mt-3">
          <DocumentsList documents={filterDocuments('invoice')} onDownload={handleDownload} onView={handleView} />
        </TabsContent>
        <TabsContent value="contract" className="mt-3">
          <DocumentsList documents={filterDocuments('contract')} onDownload={handleDownload} onView={handleView} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function DocumentsList({ 
    documents, 
    onDownload, 
    onView 
  }: { 
    documents: ProjectDocument[];
    onDownload: (doc: ProjectDocument) => void;
    onView: (doc: ProjectDocument) => void;
  }) {
    if (documents.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No hay documentos disponibles</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
        {documents.map((document) => (
          <div 
            key={document.id} 
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-800/40 border border-cyan-400/20 rounded-lg hover:bg-cyan-400/10 transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="text-lg sm:text-xl flex-shrink-0">
                {getDocumentTypeIcon(document.documentType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <h4 className="font-medium text-sm text-gray-200 truncate">{document.documentName}</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={`${getStatusColor(document.status)} text-xs`}>
                      {getStatusLabel(document.status)}
                    </Badge>
                    <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                      {getDocumentTypeLabel(document.documentType)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(document.generatedAt)}
                  </span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  {document.documentNumber && (
                    <span className="hidden sm:inline">#{document.documentNumber}</span>
                  )}
                  {document.metadata?.totalAmount && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${document.metadata.totalAmount.toLocaleString()}
                    </span>
                  )}
                  {document.metadata?.clientName && (
                    <span className="flex items-center gap-1 truncate max-w-32">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{document.metadata.clientName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onView(document)}
                className="flex items-center gap-1 bg-gray-700/50 border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20 text-xs px-2 py-1"
              >
                <Eye className="h-3 w-3" />
                <span className="hidden sm:inline">Ver</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDownload(document)}
                className="flex items-center gap-1 bg-gray-700/50 border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/20 text-xs px-2 py-1"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Descargar</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }
}