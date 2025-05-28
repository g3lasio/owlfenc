import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { Search, FileText, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface ProjectToContractSelectorProps {
  onProjectSelected: (project: Project) => void;
  onCancel: () => void;
}

const ProjectToContractSelector: React.FC<ProjectToContractSelectorProps> = ({
  onProjectSelected,
  onCancel
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("approved");

  // Cargar proyectos que pueden convertirse a contrato
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-for-contracts', filterStatus],
    queryFn: async () => {
      const response = await fetch(`/api/projects?status=${filterStatus}&needsContract=true`);
      if (!response.ok) throw new Error('Error loading projects');
      return await response.json();
    }
  });

  // Filtrar proyectos según búsqueda
  const filteredProjects = projects.filter((project: Project) => 
    project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.projectType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'client_approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'estimate_sent': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'contract_needed': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'client_approved': return 'Aprobado por Cliente';
      case 'estimate_sent': return 'Estimado Enviado';
      case 'contract_needed': return 'Requiere Contrato';
      default: return status;
    }
  };

  const getRiskLevel = (project: Project) => {
    // Análisis básico de riesgo basado en el proyecto
    let riskScore = 0;
    
    if (project.totalPrice && project.totalPrice > 500000) riskScore += 2; // Proyectos grandes
    if (project.projectType === 'roofing') riskScore += 1; // Techos tienen más riesgo
    if (!project.permitStatus || project.permitStatus === 'pending') riskScore += 1; // Sin permisos
    if (!project.clientEmail) riskScore += 1; // Falta información del cliente
    
    if (riskScore >= 3) return { level: 'alto', color: 'red', text: 'Alto Riesgo' };
    if (riskScore >= 2) return { level: 'medio', color: 'yellow', text: 'Riesgo Medio' };
    return { level: 'bajo', color: 'green', text: 'Bajo Riesgo' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Seleccionar Proyecto para Contrato Legal
          </h2>
          <p className="text-muted-foreground mt-1">
            El abogado defensor digital convertirá tu estimado aprobado en un contrato que te protege
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, dirección o tipo de proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Aprobados por Cliente</SelectItem>
            <SelectItem value="all">Todos los Proyectos</SelectItem>
            <SelectItem value="pending">Pendientes de Aprobación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Proyectos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyectos disponibles</h3>
            <p className="text-muted-foreground">
              No se encontraron proyectos que necesiten contratos con los filtros actuales
            </p>
          </div>
        ) : (
          filteredProjects.map((project: Project) => {
            const risk = getRiskLevel(project);
            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.clientName}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {getStatusIcon(project.projectProgress || 'draft')}
                        {getStatusLabel(project.projectProgress || 'draft')}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        risk.color === 'red' ? 'border-red-500 text-red-700' :
                        risk.color === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                        'border-green-500 text-green-700'
                      }`}
                    >
                      {risk.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{project.projectType || 'Proyecto General'}</p>
                    <p className="text-xs text-muted-foreground">{project.address}</p>
                  </div>
                  
                  {project.totalPrice && (
                    <p className="text-lg font-bold text-green-600">
                      ${(project.totalPrice / 100).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2 text-xs">
                    {project.permitStatus && (
                      <Badge variant="secondary" className="text-xs">
                        Permisos: {project.permitStatus}
                      </Badge>
                    )}
                    {project.projectType && (
                      <Badge variant="secondary" className="text-xs">
                        {project.projectType}
                      </Badge>
                    )}
                  </div>

                  <Button 
                    className="w-full mt-4" 
                    onClick={() => onProjectSelected(project)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Generar Contrato Protector
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Información sobre el Abogado Defensor */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-8 h-8 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                🤖 Abogado Defensor Digital - Mervin AI
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Nuestro motor legal DeepSearch analiza cada proyecto y genera contratos que te protegen como contratista:
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Cláusulas de protección contra cambios de alcance</li>
                <li>• Términos de pago que aseguran tu flujo de efectivo</li>
                <li>• Protección contra responsabilidades excesivas</li>
                <li>• Lenguaje legal que favorece al contratista</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectToContractSelector;