import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  ArrowLeft,
  FileText,
  User,
  Building,
  MapPin,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';
import { deepSearchDefenseEngine } from '@/services/deepSearchDefenseEngine';
import type { DefenseClause, DefenseAnalysisResult } from '@/services/deepSearchDefenseEngine';

interface DefenseReviewPanelProps {
  projectData: any;
  onDefenseComplete: (approvedClauses: DefenseClause[], customizations: Record<string, any>) => void;
  onGoBack: () => void;
}

export function DefenseReviewPanel({ projectData, onDefenseComplete, onGoBack }: DefenseReviewPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<DefenseAnalysisResult | null>(null);
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(new Set());
  const [contractorData, setContractorData] = useState({
    name: projectData?.contractorName || '',
    address: projectData?.contractorAddress || '',
    phone: projectData?.contractorPhone || '',
    email: projectData?.contractorEmail || '',
    license: projectData?.contractorLicense || ''
  });
  const [clientData, setClientData] = useState({
    name: projectData?.clientName || '',
    address: projectData?.clientAddress || projectData?.projectLocation || '',
    phone: projectData?.clientPhone || '',
    email: projectData?.clientEmail || ''
  });

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        setIsAnalyzing(true);
        const result = await deepSearchDefenseEngine.analyzeContract(projectData);
        setAnalysisResult(result);
        
        // Auto-select mandatory clauses
        const mandatoryClauses = result.recommendedClauses
          .filter(clause => clause.applicability.mandatory)
          .map(clause => clause.id);
        setSelectedClauses(new Set(mandatoryClauses));
      } catch (error) {
        console.error('Error in defense analysis:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    runAnalysis();
  }, [projectData]);

  const toggleClause = (clauseId: string) => {
    const newSelected = new Set(selectedClauses);
    if (newSelected.has(clauseId)) {
      newSelected.delete(clauseId);
    } else {
      newSelected.add(clauseId);
    }
    setSelectedClauses(newSelected);
  };

  const handleComplete = () => {
    if (!analysisResult) return;
    
    const approvedClauses = analysisResult.recommendedClauses.filter(
      clause => selectedClauses.has(clause.id)
    );
    
    const customizations = {
      contractorData,
      clientData,
      projectData
    };
    
    onDefenseComplete(approvedClauses, customizations);
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-blue-400 bg-black/80 relative overflow-hidden mt-6">
        <CardHeader className="text-center px-4 md:px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 md:p-4 rounded-full border-2 border-blue-400">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-400 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold text-blue-400 mb-2">
            Analizando Protecciones del Contrato
          </CardTitle>
          <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
            Revisando opciones de protección legal y cláusulas de salvaguarda...
          </p>
        </CardHeader>
        <CardContent className="px-4 md:px-8 pb-6 md:pb-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Card className="border-2 border-red-400 bg-black/80 mt-6">
        <CardContent className="p-6 text-center">
          <p className="text-red-400">Error al analizar las opciones de protección del contrato. Intente nuevamente.</p>
        </CardContent>
      </Card>
    );
  }

  const mandatoryClauses = analysisResult.recommendedClauses.filter(clause => clause.applicability.mandatory);
  const optionalClauses = analysisResult.recommendedClauses.filter(clause => !clause.applicability.mandatory);

  return (
    <Card className="border-2 border-green-400 bg-black/80 relative overflow-hidden mt-6">
      <CardHeader className="text-center px-4 md:px-6">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 md:p-4 rounded-full border-2 border-green-400">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
          </div>
        </div>
        <CardTitle className="text-xl md:text-2xl font-bold text-green-400 mb-2">
          Revisión Final del Contrato
        </CardTitle>
        <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
          Verifique los datos y seleccione las cláusulas de protección antes de generar el contrato final.
        </p>
      </CardHeader>

      <CardContent className="px-4 md:px-8 pb-6 md:pb-8 space-y-6">
        
        {/* Preview de Datos del Contratista */}
        <Card className="bg-gray-900/50 border-cyan-400/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center text-lg">
              <Building className="h-5 w-5 mr-2" />
              Datos del Contratista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">Nombre de la Empresa</label>
                <Input
                  value={contractorData.name}
                  onChange={(e) => setContractorData(prev => ({...prev, name: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Dirección del Negocio</label>
                <Input
                  value={contractorData.address}
                  onChange={(e) => setContractorData(prev => ({...prev, address: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Teléfono</label>
                <Input
                  value={contractorData.phone}
                  onChange={(e) => setContractorData(prev => ({...prev, phone: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Email</label>
                <Input
                  value={contractorData.email}
                  onChange={(e) => setContractorData(prev => ({...prev, email: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview de Datos del Cliente */}
        <Card className="bg-gray-900/50 border-green-400/30">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center text-lg">
              <User className="h-5 w-5 mr-2" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">Nombre del Cliente</label>
                <Input
                  value={clientData.name}
                  onChange={(e) => setClientData(prev => ({...prev, name: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Dirección del Proyecto</label>
                <Input
                  value={clientData.address}
                  onChange={(e) => setClientData(prev => ({...prev, address: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Teléfono</label>
                <Input
                  value={clientData.phone}
                  onChange={(e) => setClientData(prev => ({...prev, phone: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Email</label>
                <Input
                  value={clientData.email}
                  onChange={(e) => setClientData(prev => ({...prev, email: e.target.value}))}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cláusulas Obligatorias por Ley */}
        <Card className="bg-gray-900/50 border-red-400/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Cláusulas Obligatorias por Ley de California
            </CardTitle>
            <p className="text-gray-400 text-sm">
              Estas cláusulas son requeridas por ley y se incluirán automáticamente en el contrato.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {mandatoryClauses.map((clause) => (
              <div key={clause.id} className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded border border-red-400/20">
                <Checkbox 
                  checked={true} 
                  disabled={true}
                  className="mt-1 border-red-400"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-300">{clause.title}</h4>
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                      Obligatoria
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-sm">{clause.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cláusulas Opcionales Sugeridas por IA */}
        {optionalClauses.length > 0 && (
          <Card className="bg-gray-900/50 border-yellow-400/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center text-lg">
                <Shield className="h-5 w-5 mr-2" />
                Cláusulas Opcionales Recomendadas
              </CardTitle>
              <p className="text-gray-400 text-sm">
                Seleccione las cláusulas adicionales que desea incluir para mayor protección.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {optionalClauses.map((clause) => (
                <div key={clause.id} className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded border border-yellow-400/20">
                  <Checkbox 
                    checked={selectedClauses.has(clause.id)}
                    onCheckedChange={() => toggleClause(clause.id)}
                    className="mt-1 border-yellow-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-yellow-300">{clause.title}</h4>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        Opcional
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm">{clause.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Controles de Navegación */}
        <div className="flex justify-between pt-6">
          <Button
            onClick={onGoBack}
            variant="outline"
            className="border-gray-600 hover:border-gray-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Regresar
          </Button>
          
          <Button
            onClick={handleComplete}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar Contrato Final
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}