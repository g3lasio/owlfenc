import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectProgress from '@/components/projects/ProjectProgress';
import ProjectDetails from '@/components/projects/ProjectDetails';

interface CyberpunkDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onUpdate: (project: any) => void;
  onProgressUpdate: (progress: string) => void;
}

const CyberpunkDashboard: React.FC<CyberpunkDashboardProps> = ({
  isOpen,
  onClose,
  project,
  onUpdate,
  onProgressUpdate
}) => {
  if (!project) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Activo',
      'pending': 'Pendiente',
      'completed': 'Completado',
      'cancelled': 'Cancelado',
      'draft': 'Borrador'
    };
    return statusMap[status] || status;
  };

  const getProgressLabel = (progress: string) => {
    const progressMap: { [key: string]: string } = {
      'estimate_created': 'Presupuesto Creado',
      'estimate_sent': 'Presupuesto Enviado',
      'client_approved': 'Cliente Aprobó',
      'contract_sent': 'Contrato Enviado',
      'contract_signed': 'Contrato Firmado',
      'installation_scheduled': 'Instalación Programada',
      'in_progress': 'En Progreso',
      'completed': 'Completado'
    };
    return progressMap[progress] || progress;
  };

  const getProgressBadgeColor = (progress: string) => {
    const colorMap: { [key: string]: string } = {
      'estimate_created': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
      'estimate_sent': 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
      'client_approved': 'bg-green-500/20 text-green-400 border-green-400/30',
      'contract_sent': 'bg-purple-500/20 text-purple-400 border-purple-400/30',
      'contract_signed': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
      'installation_scheduled': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30',
      'in_progress': 'bg-orange-500/20 text-orange-400 border-orange-400/30',
      'completed': 'bg-green-600/20 text-green-300 border-green-300/30'
    };
    return colorMap[progress] || 'bg-gray-500/20 text-gray-400 border-gray-400/30';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-7xl w-[98vw] h-[98vh] max-h-[98vh] overflow-hidden bg-gray-900 border-cyan-400/30 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Cyberpunk Header */}
          <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b border-cyan-400/30 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-400"></div>
            
            {/* Scanning Line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
            
            <DialogTitle className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 relative z-10">
              <div className="flex items-center gap-3">
                {/* Arc Reactor */}
                <div className="relative w-4 h-4">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>
                  <div className="absolute inset-1 bg-white rounded-full"></div>
                </div>
                <span className="text-xl font-bold text-cyan-300 tracking-wider font-mono">
                  DASHBOARD: {project.clientName.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Scanning Effect */}
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-4 animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
                <Badge className={`${getProgressBadgeColor(project.projectProgress || "estimate_created")} px-3 py-1 font-mono text-xs`}>
                  <i className="ri-cpu-line mr-1"></i>
                  {getProgressLabel(project.projectProgress || "estimate_created")}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Responsive Dashboard Content */}
          <div className="flex-1 overflow-auto bg-gray-900 relative">
            {/* Mobile Layout */}
            <div className="lg:hidden p-4 space-y-4">
              {/* Mobile Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-800/60 border border-cyan-400/20 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-cyan-400"></div>
                  <div className="text-cyan-400 text-xs mb-1 font-mono">ID PROYECTO</div>
                  <div className="text-white text-sm font-mono">{project.id.slice(-8)}</div>
                </div>
                <div className="bg-gray-800/60 border border-cyan-400/20 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-cyan-400"></div>
                  <div className="text-cyan-400 text-xs mb-1 font-mono">ESTADO</div>
                  <div className="text-green-400 text-sm font-semibold">{getStatusLabel(project.status)}</div>
                </div>
                <div className="bg-gray-800/60 border border-cyan-400/20 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-cyan-400"></div>
                  <div className="text-cyan-400 text-xs mb-1 font-mono">PRECIO TOTAL</div>
                  <div className="text-white text-sm font-bold">
                    {project.totalPrice 
                      ? `$${(project.totalPrice / 100).toLocaleString()}`
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-800/60 border border-cyan-400/20 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-cyan-400"></div>
                  <div className="text-cyan-400 text-xs mb-1 font-mono">PAGO</div>
                  <div className={`text-sm font-semibold ${project.paymentStatus === 'paid' ? 'text-green-400' : project.paymentStatus === 'partial' ? 'text-blue-400' : 'text-yellow-400'}`}>
                    {project.paymentStatus === 'paid' ? 'PAGADO' : project.paymentStatus === 'partial' ? 'PARCIAL' : 'PENDIENTE'}
                  </div>
                </div>
              </div>
              
              {/* Mobile Tabs */}
              <Tabs defaultValue="progress" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border border-cyan-400/20">
                  <TabsTrigger value="progress" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300">
                    PROGRESO
                  </TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-300">
                    DETALLES
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="progress" className="mt-4">
                  <div className="bg-gray-800/40 border border-cyan-400/20 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold mb-4 flex items-center font-mono">
                      <i className="ri-route-line mr-2"></i>
                      PROGRESO DEL PROYECTO
                    </h3>
                    <ProjectProgress 
                      projectId={project.id} 
                      currentProgress={project.projectProgress || "estimate_created"} 
                      onProgressUpdate={onProgressUpdate} 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="mt-4">
                  <div className="bg-gray-800/40 border border-cyan-400/20 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold mb-4 flex items-center font-mono">
                      <i className="ri-file-list-3-line mr-2"></i>
                      DETALLES DEL PROYECTO
                    </h3>
                    <ProjectDetails 
                      project={project} 
                      onUpdate={onUpdate} 
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop Layout: Two Columns */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-6 p-6 h-full">
              {/* Left Column - Progress & System Status */}
              <div className="space-y-6 overflow-auto">
                {/* System Status */}
                <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                  
                  {/* Header */}
                  <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                      <i className="ri-dashboard-3-line mr-2"></i>
                      ESTADO DEL SISTEMA
                    </h3>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="p-4 space-y-3">
                    <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-cyan-400 text-xs mb-1 font-mono">PROYECTO ID</div>
                          <div className="text-white font-mono text-sm">{project.id.slice(-12)}</div>
                        </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-cyan-400 text-xs mb-1 font-mono">ESTADO ACTUAL</div>
                          <div className="text-green-400 font-semibold">{getStatusLabel(project.status)}</div>
                        </div>
                        <i className="ri-checkbox-circle-line text-green-400 text-lg"></i>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-cyan-400 text-xs mb-1 font-mono">PRECIO TOTAL</div>
                          <div className="text-white font-bold">
                            {project.totalPrice 
                              ? `$${(project.totalPrice / 100).toLocaleString()}`
                              : 'No establecido'}
                          </div>
                        </div>
                        <i className="ri-money-dollar-circle-line text-cyan-400 text-lg"></i>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 relative overflow-hidden hover:border-cyan-400/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-cyan-400 text-xs mb-1 font-mono">ESTADO DE PAGO</div>
                          <div className={`font-semibold ${project.paymentStatus === 'paid' ? 'text-green-400' : project.paymentStatus === 'partial' ? 'text-blue-400' : 'text-yellow-400'}`}>
                            {project.paymentStatus === 'paid' ? 'PAGADO' : project.paymentStatus === 'partial' ? 'PAGO PARCIAL' : 'PENDIENTE'}
                          </div>
                        </div>
                        <i className={`ri-${project.paymentStatus === 'paid' ? 'check' : project.paymentStatus === 'partial' ? 'time' : 'alert'}-circle-line ${project.paymentStatus === 'paid' ? 'text-green-400' : project.paymentStatus === 'partial' ? 'text-blue-400' : 'text-yellow-400'} text-lg`}></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400"></div>
                  
                  <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                      <i className="ri-calendar-2-line mr-2"></i>
                      LÍNEA DE TIEMPO
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 hover:border-cyan-400/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-cyan-400 text-xs mb-1 font-mono">FECHA DE CREACIÓN</div>
                          <div className="text-white">{formatDate(project.createdAt)}</div>
                        </div>
                        <i className="ri-calendar-check-line text-cyan-400"></i>
                      </div>
                    </div>
                    
                    {project.scheduledInstallDate && (
                      <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 hover:border-cyan-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-cyan-400 text-xs mb-1 font-mono">INSTALACIÓN PROGRAMADA</div>
                            <div className="text-white">{formatDate(project.scheduledInstallDate)}</div>
                          </div>
                          <i className="ri-calendar-event-line text-blue-400"></i>
                        </div>
                      </div>
                    )}
                    
                    {project.completedAt && (
                      <div className="bg-gray-700/50 border border-cyan-400/20 rounded-md p-3 hover:border-cyan-400/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-cyan-400 text-xs mb-1 font-mono">FINALIZACIÓN</div>
                            <div className="text-white">{formatDate(project.completedAt)}</div>
                          </div>
                          <i className="ri-calendar-check-line text-green-400"></i>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                      <i className="ri-route-line mr-2"></i>
                      PROGRESO DEL PROYECTO
                    </h3>
                  </div>
                  <div className="p-4">
                    <ProjectProgress 
                      projectId={project.id} 
                      currentProgress={project.projectProgress || "estimate_created"} 
                      onProgressUpdate={onProgressUpdate} 
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Project Details */}
              <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)] h-fit">
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400"></div>
                
                <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-gray-800/50 to-gray-900/50 relative">
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                  <h3 className="text-cyan-300 font-semibold flex items-center font-mono">
                    <i className="ri-file-list-3-line mr-2"></i>
                    DETALLES DEL PROYECTO
                  </h3>
                </div>
                <div className="p-4">
                  <ProjectDetails 
                    project={project} 
                    onUpdate={onUpdate} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      

    </Dialog>
  );
};

export default CyberpunkDashboard;