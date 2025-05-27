/**
 * Página del Motor de Abogado Defensor Digital
 * 
 * Interfaz principal para generar contratos legales automáticamente desde estimados aprobados
 * usando el motor de IA especializado en protección legal del contratista.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  FileText,
  Shield,
  Brain,
  Zap,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Loader2
} from "lucide-react";
import EstimateToContractGenerator from "@/components/contract/EstimateToContractGenerator";

// Interfaz para los proyectos/estimados del backend
interface BackendProject {
  id: string;
  projectId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  fenceType: string;
  length?: number;
  height?: number;
  totalPrice?: number;
  status: string;
  estimateHtml?: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
}

const LegalContractEnginePage: React.FC = () => {
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const { toast } = useToast();

  // Obtener proyectos reales desde la API
  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['/api/estimates'],
    queryFn: () => fetch('/api/estimates').then(res => {
      if (!res.ok) throw new Error('Error al cargar estimados');
      return res.json();
    })
  });

  // Convertir datos del backend al formato esperado por el motor legal
  const convertBackendProject = (project: BackendProject) => {
    let details = {};
    try {
      details = project.details ? JSON.parse(project.details) : {};
    } catch (e) {
      console.warn('Error parsing project details:', e);
    }

    return {
      id: project.projectId,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone || '',
      projectAddress: `${project.address}${project.city ? ', ' + project.city : ''}${project.state ? ', ' + project.state : ''}${project.zip ? ' ' + project.zip : ''}`,
      projectType: project.fenceType || 'Fence Installation',
      projectDescription: `${project.fenceType} project${project.length ? ` - ${project.length} linear feet` : ''}${project.height ? ` at ${project.height} feet height` : ''}`,
      totalAmount: project.totalPrice ? project.totalPrice / 100 : 0, // Convert from cents
      items: [], // Podríamos extraer esto de details si está disponible
      timeline: "Por determinar",
      contractorName: "Owl Fence Pro Services", // Esto vendría del perfil del usuario
      contractorAddress: "Austin, TX", // Esto vendría del perfil del usuario
      contractorLicense: "TX-LIC-123456", // Esto vendría del perfil del usuario
      state: project.state || "Texas",
      createdAt: new Date(project.createdAt),
      status: project.status === 'completed' ? 'approved' as const : 'pending' as const
    };
  };

  // Convertir proyectos a formato de estimados
  const estimates = projects.map(convertBackendProject);
  
  // Filtrar estimados
  const filteredEstimates = estimates.filter(estimate =>
    estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.projectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Seleccionar el primer estimado disponible si no hay uno seleccionado
  useEffect(() => {
    if (estimates.length > 0 && !selectedEstimate) {
      setSelectedEstimate(estimates[0]);
    }
  }, [estimates, selectedEstimate]);

  const handleContractGenerated = (contractHtml: string) => {
    setGeneratedContract(contractHtml);
    toast({
      title: "🎉 Contrato legal generado",
      description: "El abogado defensor digital ha completado tu contrato",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="border-b border-cyan-500/30 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Scale className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400">Legal Contract Engine</h1>
              <p className="text-cyan-300/80">Abogado Defensor Digital - Powered by Anthropic AI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="bg-black/50 border border-cyan-500/30">
            <TabsTrigger value="generator" className="text-cyan-400">
              <Brain className="h-4 w-4 mr-2" />
              Generador de Contratos
            </TabsTrigger>
            <TabsTrigger value="estimates" className="text-cyan-400">
              <FileText className="h-4 w-4 mr-2" />
              Estimados Disponibles
            </TabsTrigger>
          </TabsList>

          {/* Generador de Contratos */}
          <TabsContent value="generator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel de Características */}
              <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Características del Motor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Análisis automático</strong> de estimados aprobados
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Protección legal</strong> especializada para contratistas
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Cláusulas adaptativas</strong> por jurisdicción y tipo de proyecto
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Análisis de riesgo</strong> automático e inteligente
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="text-sm">
                      <strong>Formato descargable</strong> HTML y PDF
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generador Principal */}
              <div className="lg:col-span-2">
                {isLoading ? (
                  <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
                      <p className="text-cyan-400">Cargando estimados desde tu base de datos...</p>
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card className="border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
                      <p className="text-red-400 mb-4">Error al cargar estimados</p>
                      <p className="text-sm text-red-300/80">
                        No se pudieron obtener los datos del backend. Verifica la conexión.
                      </p>
                    </CardContent>
                  </Card>
                ) : estimates.length === 0 ? (
                  <Card className="border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <FileText className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
                      <p className="text-yellow-400 mb-4">No hay estimados disponibles</p>
                      <p className="text-sm text-yellow-300/80 mb-4">
                        Necesitas tener estimados aprobados para generar contratos.
                      </p>
                      <Button 
                        onClick={() => window.location.href = '/estimates-wizard'}
                        className="bg-yellow-500 text-black hover:bg-yellow-400"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Nuevo Estimado
                      </Button>
                    </CardContent>
                  </Card>
                ) : selectedEstimate ? (
                  <EstimateToContractGenerator
                    estimate={selectedEstimate}
                    onContractGenerated={handleContractGenerated}
                  />
                ) : (
                  <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <FileText className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                      <p className="text-cyan-400">Selecciona un estimado para generar su contrato</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Lista de Estimados */}
          <TabsContent value="estimates" className="space-y-6">
            {/* Búsqueda */}
            <Card className="border-cyan-500/30 bg-black/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search" className="text-cyan-400">Buscar Estimados</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Buscar por cliente, proyecto o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-cyan-500/30 bg-black/50"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Estimados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEstimates.map((estimate) => (
                <Card
                  key={estimate.id}
                  className={`border cursor-pointer transition-all ${
                    selectedEstimate.id === estimate.id
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-cyan-500/30 bg-black/50 hover:border-cyan-400/50'
                  }`}
                  onClick={() => setSelectedEstimate(estimate)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-cyan-400">{estimate.clientName}</h3>
                        <p className="text-sm text-gray-300">ID: {estimate.id}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs ${
                          estimate.status === 'approved' 
                            ? 'bg-green-500/20 text-green-400'
                            : estimate.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {estimate.status === 'approved' ? 'Aprobado' : 
                           estimate.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div><strong>Proyecto:</strong> {estimate.projectType}</div>
                      <div><strong>Valor:</strong> ${estimate.totalAmount.toLocaleString()}</div>
                      <div><strong>Ubicación:</strong> {estimate.projectAddress}</div>
                    </div>
                    
                    {estimate.status === 'approved' && (
                      <div className="mt-3 flex items-center text-green-400 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Listo para generar contrato
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredEstimates.length === 0 && (
              <Card className="border-cyan-500/30 bg-black/50">
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No se encontraron estimados que coincidan con tu búsqueda</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LegalContractEnginePage;