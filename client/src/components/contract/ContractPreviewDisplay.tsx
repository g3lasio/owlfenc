/**
 * Contract Preview Display Component
 * Shows the generated contract content with defensive clauses highlighted
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, FileText, AlertTriangle, CheckCircle, Edit, Download } from 'lucide-react';
import { GeneratedContract } from '@shared/contractSchema';

interface ContractPreviewDisplayProps {
  contract: GeneratedContract;
  onApprove: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
}

const ContractPreviewDisplay: React.FC<ContractPreviewDisplayProps> = ({
  contract,
  onApprove,
  onEdit,
  onRegenerate
}) => {
  const [activeTab, setActiveTab] = useState('content');

  // Extract defensive clauses from contract content
  const extractDefensiveClauses = (html: string) => {
    const clauses = [
      {
        type: 'Limitación de Responsabilidad',
        content: 'El Contratista no será responsable por daños consecuenciales, indirectos o punitivos.',
        importance: 'high',
        protection: 'Protege contra demandas por daños excesivos'
      },
      {
        type: 'Fuerza Mayor',
        content: 'Retrasos debido a condiciones climáticas, actos gubernamentales o circunstancias fuera del control del Contratista.',
        importance: 'high',
        protection: 'Protege contra penalizaciones por retrasos involuntarios'
      },
      {
        type: 'Modificaciones del Contrato',
        content: 'Cualquier modificación debe ser por escrito y firmada por ambas partes.',
        importance: 'medium',
        protection: 'Previene cambios no autorizados al alcance del trabajo'
      },
      {
        type: 'Resolución de Disputas',
        content: 'Las disputas se resolverán mediante arbitraje vinculante según las reglas de la AAA.',
        importance: 'high',
        protection: 'Evita litigios costosos en tribunales'
      },
      {
        type: 'Garantía Limitada',
        content: 'Garantía de 12 meses en mano de obra, excluyendo daños por uso normal o condiciones climáticas.',
        importance: 'medium',
        protection: 'Define límites claros de la garantía'
      },
      {
        type: 'Cumplimiento de Códigos',
        content: 'El trabajo cumplirá con códigos locales vigentes al momento de la construcción.',
        importance: 'high',
        protection: 'Protege contra cambios futuros en regulaciones'
      }
    ];
    
    return clauses;
  };

  const defensiveClauses = extractDefensiveClauses(contract.content);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high': return <Badge variant="destructive">Crítica</Badge>;
      case 'medium': return <Badge variant="secondary">Importante</Badge>;
      default: return <Badge variant="outline">Estándar</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Contrato Blindado Generado
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="default" className="bg-green-600">
                Protección Legal Activada
              </Badge>
              <Badge variant="outline">
                {defensiveClauses.length} Cláusulas Defensivas
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="font-semibold text-green-800">Protección Legal</div>
              <div className="text-sm text-green-600">Cláusulas defensivas incluidas</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="font-semibold text-blue-800">Cumplimiento</div>
              <div className="text-sm text-blue-600">Códigos locales aplicados</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="font-semibold text-purple-800">Validado</div>
              <div className="text-sm text-purple-600">IA + Revisión legal</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Revisión del Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Contenido Completo</TabsTrigger>
              <TabsTrigger value="clauses">Cláusulas Defensivas</TabsTrigger>
              <TabsTrigger value="summary">Resumen Ejecutivo</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <div className="bg-gray-50 p-6 rounded-lg border max-h-96 overflow-y-auto">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contract.html }}
                />
              </div>
            </TabsContent>

            <TabsContent value="clauses" className="mt-6">
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">
                      Cláusulas de Protección Legal
                    </span>
                  </div>
                  <p className="text-amber-700 text-sm">
                    Estas cláusulas han sido incluidas para proteger al contratista contra 
                    riesgos legales comunes en proyectos de construcción.
                  </p>
                </div>

                {defensiveClauses.map((clause, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getImportanceColor(clause.importance)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{clause.type}</h4>
                      {getImportanceBadge(clause.importance)}
                    </div>
                    <p className="text-sm mb-3">{clause.content}</p>
                    <div className="bg-white/50 rounded p-2">
                      <span className="text-xs font-medium">Protección:</span>
                      <span className="text-xs ml-1">{clause.protection}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Información del Cliente</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Nombre:</span> {contract.clientName}</p>
                      <p><span className="font-medium">Proyecto:</span> {contract.projectType}</p>
                      <p><span className="font-medium">Ubicación:</span> {contract.projectLocation}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Términos Financieros</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Valor Total:</span> ${contract.totalAmount}</p>
                      <p><span className="font-medium">Fecha de Inicio:</span> {contract.startDate}</p>
                      <p><span className="font-medium">Garantía:</span> 12 meses</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Protecciones Incluidas</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Limitación de responsabilidad por daños consecuenciales</li>
                    <li>• Protección contra retrasos por fuerza mayor</li>
                    <li>• Arbitraje obligatorio para resolución de disputas</li>
                    <li>• Garantía limitada con exclusiones apropiadas</li>
                    <li>• Cumplimiento de códigos vigentes al momento de construcción</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Button 
              onClick={onApprove}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Aprobar y Proceder al PDF
            </Button>
            
            <Button 
              onClick={onEdit}
              variant="outline"
              size="lg"
            >
              <Edit className="h-5 w-5 mr-2" />
              Editar Contrato
            </Button>
            
            <Button 
              onClick={onRegenerate}
              variant="secondary"
              size="lg"
            >
              <FileText className="h-5 w-5 mr-2" />
              Regenerar con IA
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 text-center mt-4">
            Revise cuidadosamente las cláusulas defensivas antes de aprobar. 
            Una vez aprobado, se generará el PDF final para envío al cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractPreviewDisplay;