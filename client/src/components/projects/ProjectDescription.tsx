import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectChange {
  id: string;
  type: 'description' | 'scope' | 'materials' | 'timeline' | 'budget' | 'client_request';
  title: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  createdAt: Date;
  createdBy: string;
  amount?: number;
  impact?: 'low' | 'medium' | 'high';
}

interface ProjectDescriptionProps {
  projectId: string;
  description?: string;
  scope?: string;
  onDescriptionUpdate?: (description: string) => void;
  onScopeUpdate?: (scope: string) => void;
  onChangeAdd?: (change: Partial<ProjectChange>) => void;
}

const changeTypes = {
  description: { name: 'Descripción', icon: 'ri-file-text-line', color: 'bg-blue-500' },
  scope: { name: 'Alcance', icon: 'ri-compass-line', color: 'bg-green-500' },
  materials: { name: 'Materiales', icon: 'ri-hammer-line', color: 'bg-yellow-500' },
  timeline: { name: 'Cronograma', icon: 'ri-calendar-line', color: 'bg-purple-500' },
  budget: { name: 'Presupuesto', icon: 'ri-money-dollar-circle-line', color: 'bg-red-500' },
  client_request: { name: 'Solicitud Cliente', icon: 'ri-user-line', color: 'bg-orange-500' }
};

const statusTypes = {
  proposed: { name: 'Propuesto', color: 'bg-blue-500' },
  approved: { name: 'Aprobado', color: 'bg-green-500' },
  rejected: { name: 'Rechazado', color: 'bg-red-500' },
  implemented: { name: 'Implementado', color: 'bg-purple-500' }
};

const impactTypes = {
  low: { name: 'Bajo', color: 'bg-green-500' },
  medium: { name: 'Medio', color: 'bg-yellow-500' },
  high: { name: 'Alto', color: 'bg-red-500' }
};

export default function ProjectDescription({ 
  projectId, 
  description = '', 
  scope = '',
  onDescriptionUpdate,
  onScopeUpdate,
  onChangeAdd 
}: ProjectDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(description);
  const [editedScope, setEditedScope] = useState(scope);
  const [isAddingChange, setIsAddingChange] = useState(false);
  const [newChange, setNewChange] = useState<Partial<ProjectChange>>({
    type: 'description',
    title: '',
    description: '',
    status: 'proposed',
    impact: 'medium'
  });

  // Mock changes for demonstration
  const [changes, setChanges] = useState<ProjectChange[]>([
    {
      id: '1',
      type: 'client_request',
      title: 'Cambio de altura de cerca',
      description: 'Cliente solicita cambiar de 6ft a 8ft para mayor privacidad',
      oldValue: '6 pies',
      newValue: '8 pies',
      status: 'approved',
      createdAt: new Date('2024-01-20'),
      createdBy: 'Cliente - Maria Rodriguez',
      amount: 450.00,
      impact: 'medium'
    },
    {
      id: '2',
      type: 'materials',
      title: 'Cambio de tipo de madera',
      description: 'Cambio de pino a cedro para mayor durabilidad',
      oldValue: 'Pino tratado',
      newValue: 'Cedro rojo',
      status: 'proposed',
      createdAt: new Date('2024-01-22'),
      createdBy: 'Contratista',
      amount: 280.00,
      impact: 'low'
    },
    {
      id: '3',
      type: 'timeline',
      title: 'Retraso por permisos',
      description: 'Retraso de 3 días esperando aprobación de permisos municipales',
      status: 'implemented',
      createdAt: new Date('2024-01-18'),
      createdBy: 'Oficina',
      impact: 'high'
    }
  ]);

  useEffect(() => {
    setEditedDescription(description);
    setEditedScope(scope);
  }, [description, scope]);

  const handleSaveDescription = () => {
    if (onDescriptionUpdate) {
      onDescriptionUpdate(editedDescription);
    }
    if (onScopeUpdate) {
      onScopeUpdate(editedScope);
    }
    setIsEditing(false);
  };

  const handleAddChange = () => {
    if (newChange.title && newChange.description) {
      const change: ProjectChange = {
        ...newChange as ProjectChange,
        id: `change-${Date.now()}`,
        createdAt: new Date(),
        createdBy: 'Usuario Actual'
      };
      
      setChanges([change, ...changes]);
      if (onChangeAdd) {
        onChangeAdd(change);
      }
      
      setNewChange({
        type: 'description',
        title: '',
        description: '',
        status: 'proposed',
        impact: 'medium'
      });
      setIsAddingChange(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '';
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Project Description Section */}
      <div className="bg-gray-800/40 border border-cyan-400/30 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className="flex justify-between items-center">
            <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
              <i className="ri-file-text-line mr-2"></i>
              DESCRIPCIÓN DEL PROYECTO
            </h3>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10"
            >
              <i className={`ri-${isEditing ? 'close' : 'edit'}-line mr-1`}></i>
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Descripción General
                </label>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Describe el proyecto en detalle..."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Alcance del Trabajo
                </label>
                <Textarea
                  value={editedScope}
                  onChange={(e) => setEditedScope(e.target.value)}
                  placeholder="Define el alcance específico del trabajo..."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveDescription} className="bg-cyan-600 hover:bg-cyan-700">
                  Guardar Cambios
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Descripción General</h4>
                <p className="text-gray-200 leading-relaxed">
                  {description || 'No se ha proporcionado una descripción del proyecto.'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Alcance del Trabajo</h4>
                <p className="text-gray-200 leading-relaxed">
                  {scope || 'No se ha definido el alcance específico del trabajo.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Changes and Negotiations Section */}
      <div className="bg-gray-800/40 border border-cyan-400/30 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className="flex justify-between items-center">
            <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
              <i className="ri-exchange-line mr-2"></i>
              CAMBIOS Y NEGOCIACIONES
            </h3>
            <Dialog open={isAddingChange} onOpenChange={setIsAddingChange}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <i className="ri-add-line mr-1"></i>
                  Registrar Cambio
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-cyan-400/30">
                <DialogHeader>
                  <DialogTitle className="text-cyan-300">Registrar Nuevo Cambio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Tipo de Cambio</label>
                    <Select 
                      value={newChange.type} 
                      onValueChange={(value) => setNewChange({...newChange, type: value as any})}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(changeTypes).map(([key, type]) => (
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
                    <label className="text-sm font-medium text-gray-300">Título</label>
                    <Input
                      value={newChange.title}
                      onChange={(e) => setNewChange({...newChange, title: e.target.value})}
                      placeholder="Título del cambio"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300">Descripción</label>
                    <Textarea
                      value={newChange.description}
                      onChange={(e) => setNewChange({...newChange, description: e.target.value})}
                      placeholder="Describe el cambio en detalle"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Estado</label>
                      <Select 
                        value={newChange.status} 
                        onValueChange={(value) => setNewChange({...newChange, status: value as any})}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusTypes).map(([key, status]) => (
                            <SelectItem key={key} value={key}>{status.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300">Impacto</label>
                      <Select 
                        value={newChange.impact} 
                        onValueChange={(value) => setNewChange({...newChange, impact: value as any})}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(impactTypes).map(([key, impact]) => (
                            <SelectItem key={key} value={key}>{impact.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300">Monto (opcional)</label>
                    <Input
                      type="number"
                      value={newChange.amount || ''}
                      onChange={(e) => setNewChange({...newChange, amount: parseFloat(e.target.value) || undefined})}
                      placeholder="0.00"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddingChange(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddChange} className="bg-cyan-600 hover:bg-cyan-700">
                      Registrar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="p-4">
          {changes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <i className="ri-exchange-line text-3xl mb-2"></i>
              <p>No hay cambios registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map((change) => {
                const changeType = changeTypes[change.type];
                const status = statusTypes[change.status];
                const impact = impactTypes[change.impact!];
                
                return (
                  <div 
                    key={change.id}
                    className="bg-gray-800/60 border border-gray-600 rounded-lg p-4 hover:border-cyan-400/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${changeType.color} rounded-lg flex items-center justify-center`}>
                          <i className={`${changeType.icon} text-white text-sm`}></i>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{change.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{changeType.name}</span>
                            <span>•</span>
                            <span>{formatDate(change.createdAt)}</span>
                            <span>•</span>
                            <span>{change.createdBy}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={`${impact.color} text-white text-xs`}>
                          {impact.name}
                        </Badge>
                        <Badge className={`${status.color} text-white text-xs`}>
                          {status.name}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">{change.description}</p>
                    
                    {(change.oldValue || change.newValue) && (
                      <div className="bg-gray-700/50 rounded p-3 mb-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Antes:</span>
                            <div className="text-red-400">{change.oldValue || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Después:</span>
                            <div className="text-green-400">{change.newValue || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {change.amount && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Impacto económico:</span>
                        <span className="text-yellow-400 font-medium">
                          {formatAmount(change.amount)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}