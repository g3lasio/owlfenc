import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectDocument {
  id: string;
  type: 'estimate' | 'contract' | 'permit' | 'invoice' | 'change_order';
  name: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  url?: string;
  amount?: number;
  description?: string;
  version?: number;
}

interface ProjectDocumentsProps {
  projectId: string;
  documents?: ProjectDocument[];
  onDocumentAdd?: (document: Partial<ProjectDocument>) => void;
  onDocumentUpdate?: (id: string, updates: Partial<ProjectDocument>) => void;
}

const documentTypes = {
  estimate: { name: 'Estimado', icon: 'ri-calculator-line', color: 'bg-blue-500' },
  contract: { name: 'Contrato', icon: 'ri-file-text-line', color: 'bg-green-500' },
  permit: { name: 'Permiso', icon: 'ri-shield-check-line', color: 'bg-yellow-500' },
  invoice: { name: 'Factura', icon: 'ri-bill-line', color: 'bg-purple-500' },
  change_order: { name: 'Orden de Cambio', icon: 'ri-edit-2-line', color: 'bg-orange-500' }
};

const statusTypes = {
  draft: { name: 'Borrador', color: 'bg-gray-500' },
  pending: { name: 'Pendiente', color: 'bg-blue-500' },
  approved: { name: 'Aprobado', color: 'bg-green-500' },
  rejected: { name: 'Rechazado', color: 'bg-red-500' },
  completed: { name: 'Completado', color: 'bg-purple-500' }
};

export default function ProjectDocuments({ projectId, documents = [], onDocumentAdd, onDocumentUpdate }: ProjectDocumentsProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [newDocument, setNewDocument] = useState<Partial<ProjectDocument>>({
    type: 'estimate',
    name: '',
    status: 'draft',
    description: ''
  });

  // Mock documents for demonstration
  const mockDocuments: ProjectDocument[] = [
    {
      id: '1',
      type: 'estimate',
      name: 'Estimado Inicial - Cerca de Madera',
      status: 'approved',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-16'),
      amount: 6679.30,
      description: 'Estimado inicial para instalación de cerca de madera de 6ft',
      version: 1
    },
    {
      id: '2',
      type: 'contract',
      name: 'Contrato de Instalación',
      status: 'pending',
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17'),
      amount: 6679.30,
      description: 'Contrato profesional para proyecto de cerca',
      version: 1
    },
    {
      id: '3',
      type: 'permit',
      name: 'Permiso Municipal',
      status: 'pending',
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18'),
      description: 'Permiso de construcción para cerca residencial'
    },
    {
      id: '4',
      type: 'change_order',
      name: 'Cambio: Altura Adicional',
      status: 'draft',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      amount: 450.00,
      description: 'Cliente solicita incrementar altura de 6ft a 8ft'
    }
  ];

  const allDocuments = [...documents, ...mockDocuments];
  const filteredDocuments = selectedType === 'all' 
    ? allDocuments 
    : allDocuments.filter(doc => doc.type === selectedType);

  const handleAddDocument = () => {
    if (onDocumentAdd && newDocument.name) {
      onDocumentAdd({
        ...newDocument,
        id: `doc-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setNewDocument({
        type: 'estimate',
        name: '',
        status: 'draft',
        description: ''
      });
      setIsAddingDocument(false);
    }
  };

  const getDocumentsByType = (type: string) => {
    return allDocuments.filter(doc => doc.type === type);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '';
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-cyan-300 flex items-center">
          <i className="ri-folder-line mr-2"></i>
          DOCUMENTOS DEL PROYECTO
        </h3>
        <Dialog open={isAddingDocument} onOpenChange={setIsAddingDocument}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <i className="ri-add-line mr-1"></i>
              Agregar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-cyan-400/30">
            <DialogHeader>
              <DialogTitle className="text-cyan-300">Agregar Nuevo Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Tipo de Documento</label>
                <Select 
                  value={newDocument.type} 
                  onValueChange={(value) => setNewDocument({...newDocument, type: value as any})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypes).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <i className={type.icon}></i>
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Nombre</label>
                <Input
                  value={newDocument.name}
                  onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                  placeholder="Nombre del documento"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Estado</label>
                <Select 
                  value={newDocument.status} 
                  onValueChange={(value) => setNewDocument({...newDocument, status: value as any})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusTypes).map(([key, status]) => (
                      <SelectItem key={key} value={key}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Descripción</label>
                <Textarea
                  value={newDocument.description}
                  onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                  placeholder="Descripción del documento"
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingDocument(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddDocument} className="bg-cyan-600 hover:bg-cyan-700">
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Document Type Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(documentTypes).map(([key, type]) => {
          const count = getDocumentsByType(key).length;
          return (
            <div 
              key={key}
              className="bg-gray-800/40 border border-cyan-400/20 rounded-lg p-3 text-center cursor-pointer hover:border-cyan-400/40 transition-colors"
              onClick={() => setSelectedType(selectedType === key ? 'all' : key)}
            >
              <div className={`w-8 h-8 ${type.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <i className={`${type.icon} text-white text-sm`}></i>
              </div>
              <div className="text-xs text-gray-300">{type.name}</div>
              <div className="text-lg font-bold text-cyan-300">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Document Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="bg-gray-800 border-cyan-400/30">
          <TabsTrigger value="all" className="data-[state=active]:bg-cyan-600">
            Todos ({allDocuments.length})
          </TabsTrigger>
          {Object.entries(documentTypes).map(([key, type]) => (
            <TabsTrigger 
              key={key} 
              value={key}
              className="data-[state=active]:bg-cyan-600"
            >
              {type.name} ({getDocumentsByType(key).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedType} className="mt-4">
          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <i className="ri-file-line text-3xl mb-2"></i>
                <p>No hay documentos de este tipo</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const docType = documentTypes[doc.type];
                const status = statusTypes[doc.status];
                
                return (
                  <div 
                    key={doc.id}
                    className="bg-gray-800/40 border border-gray-600 rounded-lg p-4 hover:border-cyan-400/40 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 ${docType.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <i className={`${docType.icon} text-white`}></i>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white truncate">{doc.name}</h4>
                            {doc.version && (
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                v{doc.version}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                            <span>
                              <i className="ri-calendar-line mr-1"></i>
                              {formatDate(doc.createdAt)}
                            </span>
                            {doc.amount && (
                              <span className="text-green-400 font-medium">
                                <i className="ri-money-dollar-circle-line mr-1"></i>
                                {formatAmount(doc.amount)}
                              </span>
                            )}
                          </div>
                          
                          {doc.description && (
                            <p className="text-sm text-gray-300 mb-2">{doc.description}</p>
                          )}
                          
                          <Badge className={`${status.color} text-white text-xs`}>
                            {status.name}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" className="text-xs">
                          <i className="ri-eye-line mr-1"></i>
                          Ver
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          <i className="ri-download-line mr-1"></i>
                          Descargar
                        </Button>
                        {doc.status === 'draft' && (
                          <Button size="sm" variant="outline" className="text-xs text-blue-400">
                            <i className="ri-edit-line mr-1"></i>
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}