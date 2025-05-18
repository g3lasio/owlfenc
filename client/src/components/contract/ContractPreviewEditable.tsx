import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Send, FileSignature, Edit, CheckCircle2 } from "lucide-react";

interface ContractPreviewEditableProps {
  html: string;
  contractData: Record<string, any>;
  onApprove: () => void;
  onEdit: (key: string, value: string) => void;
  onDownload: () => void;
  onSendEmail: () => void;
  onSign: () => void;
}

const ContractPreviewEditable: React.FC<ContractPreviewEditableProps> = ({
  html,
  contractData,
  onApprove,
  onEdit,
  onDownload,
  onSendEmail,
  onSign
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editLabel, setEditLabel] = useState<string>('');

  // Función para abrir el diálogo de edición
  const openEditDialog = (field: string, value: string, label: string) => {
    setEditField(field);
    setEditValue(value);
    setEditLabel(label);
    setIsEditDialogOpen(true);
  };

  // Función para guardar los cambios
  const saveEdit = () => {
    onEdit(editField, editValue);
    setIsEditDialogOpen(false);
  };

  // Mapeo de campos editables para mostrar en tarjetas
  const editableFields = [
    { 
      label: 'Información del Cliente', 
      fields: [
        { key: 'client.name', displayName: 'Nombre del Cliente' },
        { key: 'client.address', displayName: 'Dirección' },
        { key: 'client.phone', displayName: 'Teléfono' },
        { key: 'client.email', displayName: 'Email' },
      ]
    },
    { 
      label: 'Detalles del Proyecto', 
      fields: [
        { key: 'project.fenceType', displayName: 'Tipo de Cerca' },
        { key: 'project.fenceMaterial', displayName: 'Material' },
        { key: 'project.fenceHeight', displayName: 'Altura (pies)' },
        { key: 'project.fenceLength', displayName: 'Longitud (pies)' },
      ]
    },
    { 
      label: 'Fechas y Pagos', 
      fields: [
        { key: 'project.startDate', displayName: 'Fecha de Inicio' },
        { key: 'project.duration', displayName: 'Duración (días)' },
        { key: 'payment.totalCost', displayName: 'Costo Total' },
        { key: 'payment.depositAmount', displayName: 'Depósito Inicial' },
      ]
    }
  ];

  // Función para obtener el valor anidado de un objeto usando un path con puntos
  const getNestedValue = (obj: Record<string, any>, path: string): string => {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === undefined || current === null) return '';
      current = current[key];
    }
    
    return current !== undefined && current !== null ? String(current) : '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/20 border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Vista Previa del Contrato</h3>
          <Badge>Vista Previa</Badge>
        </div>
        
        <ScrollArea className="h-[300px] rounded-md border">
          <div 
            className="contract-content p-6" 
            dangerouslySetInnerHTML={{ __html: html }} 
          />
        </ScrollArea>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Datos del Contrato</h3>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
            Editable
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {editableFields.map((section) => (
            <Card key={section.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {section.fields.map((field) => {
                    const value = getNestedValue(contractData, field.key);
                    return (
                      <li key={field.key} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{field.displayName}:</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2"
                            onClick={() => openEditDialog(field.key, value, field.displayName)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-muted-foreground truncate max-w-full">
                          {value || 'No especificado'}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <div className="space-x-2">
          <Button variant="outline" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <Button variant="outline" onClick={onSendEmail}>
            <Send className="mr-2 h-4 w-4" />
            Enviar por Email
          </Button>
          <Button variant="outline" onClick={onSign}>
            <FileSignature className="mr-2 h-4 w-4" />
            Firmar
          </Button>
        </div>
        
        <Button onClick={onApprove}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Aprobar Contrato
        </Button>
      </div>
      
      {/* Diálogo para editar campos */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {editLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-field">
                {editLabel}
              </Label>
              {editField.includes('multiline') || editField.includes('address') || editField.includes('details') ? (
                <Textarea
                  id="edit-field"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full"
                  rows={4}
                />
              ) : (
                <Input
                  id="edit-field"
                  type={editField.includes('date') ? 'date' : 
                        editField.includes('duration') || 
                        editField.includes('height') || 
                        editField.includes('length') || 
                        editField.includes('cost') || 
                        editField.includes('amount') ? 'number' : 'text'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full"
                />
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractPreviewEditable;