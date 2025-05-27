/**
 * Página del Motor de Abogado Defensor Digital
 * 
 * Interfaz principal para generar contratos legales automáticamente desde estimados aprobados
 * usando el motor de IA especializado en protección legal del contratista.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Scale,
  FileText,
  Shield,
  Brain,
  Zap,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus
} from "lucide-react";
import EstimateToContractGenerator from "@/components/contract/EstimateToContractGenerator";

// Datos de ejemplo para demostrar el flujo (en producción vendrían de la base de datos)
const sampleEstimates = [
  {
    id: "EST-2025-001",
    clientName: "Pancho Villa",
    clientEmail: "pancho.villa@email.com",
    clientPhone: "(555) 123-4567",
    projectAddress: "1234 Main Street, Austin, TX 78701",
    projectType: "Fence Installation",
    projectDescription: "Installation of 200 linear feet of 6-foot cedar privacy fence along the property line. Includes gate installation and removal of existing chain link fence.",
    totalAmount: 8500,
    items: [
      { description: "Cedar fence panels (6ft x 8ft)", quantity: 25, unitPrice: 180, total: 4500 },
      { description: "Fence posts (pressure treated)", quantity: 26, unitPrice: 35, total: 910 },
      { description: "Gate hardware and installation", quantity: 1, unitPrice: 350, total: 350 },
      { description: "Labor - fence installation", quantity: 16, unitPrice: 45, total: 720 },
      { description: "Removal of existing fence", quantity: 1, unitPrice: 500, total: 500 },
      { description: "Concrete for posts", quantity: 13, unitPrice: 25, total: 325 },
      { description: "Permits and fees", quantity: 1, unitPrice: 195, total: 195 }
    ],
    laborCost: 2220,
    materialCost: 6085,
    timeline: "5-7 business days",
    contractorName: "Owl Fence Pro Services",
    contractorAddress: "789 Contractor Ave, Austin, TX 78702",
    contractorLicense: "TX-LIC-123456",
    state: "Texas",
    createdAt: new Date("2025-01-15"),
    status: "approved" as const
  },
  {
    id: "EST-2025-002",
    clientName: "María González",
    clientEmail: "maria.gonzalez@email.com",
    projectAddress: "5678 Oak Avenue, San Antonio, TX 78201",
    projectType: "Deck Construction",
    projectDescription: "Construction of 12x16 composite deck with railing, stairs, and lighting installation.",
    totalAmount: 12400,
    items: [
      { description: "Composite decking materials", quantity: 192, unitPrice: 35, total: 6720 },
      { description: "Deck framing lumber", quantity: 1, unitPrice: 1200, total: 1200 },
      { description: "Railing system", quantity: 48, unitPrice: 45, total: 2160 },
      { description: "LED deck lighting", quantity: 8, unitPrice: 85, total: 680 },
      { description: "Labor - deck construction", quantity: 24, unitPrice: 50, total: 1200 },
      { description: "Permits and inspections", quantity: 1, unitPrice: 440, total: 440 }
    ],
    laborCost: 3600,
    materialCost: 8360,
    timeline: "7-10 business days",
    contractorName: "Owl Fence Pro Services",
    contractorAddress: "789 Contractor Ave, Austin, TX 78702",
    contractorLicense: "TX-LIC-123456",
    state: "Texas",
    createdAt: new Date("2025-01-20"),
    status: "pending" as const
  }
];

const LegalContractEnginePage: React.FC = () => {
  const [selectedEstimate, setSelectedEstimate] = useState(sampleEstimates[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const { toast } = useToast();

  const filteredEstimates = sampleEstimates.filter(estimate =>
    estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.projectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <EstimateToContractGenerator
                  estimate={selectedEstimate}
                  onContractGenerated={handleContractGenerated}
                />
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