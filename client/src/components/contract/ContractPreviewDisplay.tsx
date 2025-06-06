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

  const defensiveClauses = extractDefensiveClauses(contract.html);

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
              Legal Defense Contract - Classic Structure
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
            <div className="text-center p-4 bg-gray-800 rounded-lg cyberpunk-corner-frame">
              <Shield className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
              <div className="font-semibold text-cyan-300">Protección Legal</div>
              <div className="text-sm text-gray-300">Cláusulas defensivas incluidas</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg cyberpunk-corner-frame">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-400" />
              <div className="font-semibold text-blue-300">Cumplimiento</div>
              <div className="text-sm text-gray-300">Códigos locales aplicados</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg cyberpunk-corner-frame">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <div className="font-semibold text-purple-300">Validado</div>
              <div className="text-sm text-gray-300">IA + Revisión legal</div>
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
              <div className="bg-gray-900 border border-cyan-500 p-6 rounded-lg cyberpunk-corner-frame max-h-96 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-gray-100 prose-headings:text-cyan-300 prose-strong:text-white prose-p:text-gray-200">
                  {/* Classic Legal Document Structure */}
                  <div className="legal-contract-structure">
                    
                    {/* 1. Title, Date and Parties */}
                    <div className="contract-header text-center mb-8">
                      <h1 className="text-2xl font-bold text-cyan-300 mb-4">CONSTRUCTION SERVICES AGREEMENT</h1>
                      <p className="text-gray-300 mb-2">Agreement Date: {new Date().toLocaleDateString()}</p>
                      <div className="parties-section mt-6 text-left">
                        <p className="mb-2"><strong className="text-cyan-300">CONTRACTOR:</strong> {contract.contractData.contractorName || '[Contractor Name]'}</p>
                        <p className="mb-2"><strong className="text-cyan-300">CLIENT:</strong> {contract.contractData.clientName || '[Client Name]'}</p>
                        <p className="mb-4"><strong className="text-cyan-300">PROJECT LOCATION:</strong> {contract.contractData.projectLocation || '[Project Address]'}</p>
                      </div>
                    </div>

                    {/* 2. Recital/Background */}
                    <div className="recital-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">RECITAL</h2>
                      <p className="text-gray-200 leading-relaxed">
                        WHEREAS, Contractor is a {contract.contractData.contractorLicense ? 'licensed' : 'unlicensed'} construction professional 
                        capable of providing construction services; and WHEREAS, Client desires to engage Contractor to perform 
                        {contract.contractData.projectType || 'construction services'} at the above-referenced location; 
                        NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, 
                        the parties agree as follows:
                      </p>
                    </div>

                    {/* 3. Services and Scope */}
                    <div className="services-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">SCOPE OF SERVICES</h2>
                      <p className="text-gray-200 mb-3">
                        Contractor agrees to provide the following services:
                      </p>
                      <div className="bg-gray-800 p-4 rounded border-l-4 border-cyan-400">
                        <p className="text-gray-200">{contract.contractData.projectDescription || 'Construction services as specified in attached plans and specifications'}</p>
                      </div>
                      <p className="text-gray-200 mt-3">
                        All work shall be performed in accordance with applicable building codes, industry standards, and local regulations.
                      </p>
                    </div>

                    {/* 4. Duration/Timeline */}
                    <div className="duration-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">PROJECT TIMELINE</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-300"><strong>Start Date:</strong> {typeof contract.contractData.startDate === 'string' ? contract.contractData.startDate : contract.contractData.startDate?.toLocaleDateString() || 'To be determined'}</p>
                          <p className="text-gray-300"><strong>Completion Date:</strong> {typeof contract.contractData.completionDate === 'string' ? contract.contractData.completionDate : contract.contractData.completionDate?.toLocaleDateString() || 'As specified in schedule'}</p>
                        </div>
                        <div>
                          <p className="text-gray-300"><strong>Estimated Duration:</strong> {'As specified'}</p>
                        </div>
                      </div>
                      <div className="mt-3 bg-yellow-900/20 border border-yellow-400/30 rounded p-3">
                        <p className="text-yellow-200 text-sm">
                          <strong>Force Majeure:</strong> Time shall be extended for delays due to weather, 
                          governmental actions, material shortages, or other circumstances beyond Contractor's control.
                        </p>
                      </div>
                    </div>

                    {/* 5. Compensation and Payment */}
                    <div className="compensation-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">COMPENSATION AND PAYMENT TERMS</h2>
                      <div className="payment-details bg-gray-800 p-4 rounded">
                        <p className="text-gray-200 mb-2"><strong>Total Contract Amount:</strong> ${contract.contractData.totalAmount || '[Amount]'}</p>
                        <div className="payment-schedule mt-4">
                          <p className="text-gray-300 mb-2"><strong>Payment Schedule:</strong></p>
                          <ul className="list-disc pl-6 text-gray-200">
                            <li>Down Payment: 10% upon signing</li>
                            <li>Progress Payments: As work progresses</li>
                            <li>Final Payment: 10% upon completion</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-3 bg-red-900/20 border border-red-400/30 rounded p-3">
                        <p className="text-red-200 text-sm">
                          <strong>Late Payment:</strong> Payments not received within 10 days of due date will incur 1.5% monthly service charge.
                          Contractor may suspend work for non-payment exceeding 15 days.
                        </p>
                      </div>
                    </div>

                    {/* 6. Confidentiality and Intellectual Property */}
                    <div className="confidentiality-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">CONFIDENTIALITY AND INTELLECTUAL PROPERTY</h2>
                      <p className="text-gray-200 leading-relaxed">
                        Each party agrees to maintain confidentiality of the other party's proprietary information. 
                        All plans, specifications, and work product created under this agreement shall remain the property 
                        of the Client upon full payment. Contractor retains rights to general methodologies and techniques.
                      </p>
                    </div>

                    {/* 7. Subcontracting and Independence */}
                    <div className="subcontracting-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">SUBCONTRACTING AND INDEPENDENCE</h2>
                      <p className="text-gray-200 leading-relaxed mb-3">
                        Contractor may engage qualified subcontractors as necessary to complete the work. 
                        Contractor shall remain fully responsible for all subcontracted work.
                      </p>
                      <p className="text-gray-200 leading-relaxed">
                        Contractor is an independent contractor and not an employee of Client. 
                        Contractor shall provide own tools, equipment, and supervision of work.
                      </p>
                    </div>

                    {/* 8. Exclusivity */}
                    <div className="exclusivity-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">NON-EXCLUSIVITY</h2>
                      <p className="text-gray-200 leading-relaxed">
                        This agreement is non-exclusive. Contractor may perform similar services for other clients, 
                        provided such work does not interfere with performance under this agreement.
                      </p>
                    </div>

                    {/* 9. Notifications and Contact Information */}
                    <div className="notifications-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">NOTICES AND COMMUNICATIONS</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="contractor-contact bg-gray-800 p-3 rounded">
                          <p className="text-cyan-300 font-semibold mb-2">CONTRACTOR</p>
                          <p className="text-gray-200">{contract.contractData.contractorName}</p>
                          <p className="text-gray-200">{contract.contractData.contractorAddress}</p>
                          <p className="text-gray-200">{contract.contractData.contractorPhone}</p>
                        </div>
                        <div className="client-contact bg-gray-800 p-3 rounded">
                          <p className="text-cyan-300 font-semibold mb-2">CLIENT</p>
                          <p className="text-gray-200">{contract.contractData.clientName}</p>
                          <p className="text-gray-200">{contract.contractData.clientAddress}</p>
                          <p className="text-gray-200">{contract.contractData.clientPhone}</p>
                        </div>
                      </div>
                    </div>

                    {/* 10. Indemnification */}
                    <div className="indemnification-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">INDEMNIFICATION</h2>
                      <div className="bg-red-900/20 border border-red-400/30 rounded p-4">
                        <p className="text-red-200 leading-relaxed">
                          <strong>Mutual Indemnification:</strong> Each party agrees to indemnify and hold harmless the other party 
                          from claims arising from their own negligent acts or omissions. Contractor's liability shall be limited 
                          to the contract amount for any single occurrence.
                        </p>
                      </div>
                    </div>

                    {/* 11. Modifications */}
                    <div className="modifications-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">MODIFICATIONS</h2>
                      <p className="text-gray-200 leading-relaxed">
                        No modifications to this agreement shall be valid unless in writing and signed by both parties. 
                        Change orders must specify scope, cost, and time adjustments before work commences.
                      </p>
                    </div>

                    {/* 12. Entire Agreement and Legal Terms */}
                    <div className="entire-agreement-section mb-6">
                      <h2 className="text-xl font-semibold text-cyan-300 mb-3">ENTIRE AGREEMENT</h2>
                      <p className="text-gray-200 leading-relaxed mb-3">
                        This agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, 
                        representations, or agreements. This agreement shall be governed by California law.
                      </p>
                      <p className="text-gray-200 leading-relaxed">
                        <strong>Severability:</strong> If any provision is deemed invalid, the remainder shall remain in full effect. 
                        <strong>Jurisdiction:</strong> Any disputes shall be resolved in the courts of California.
                      </p>
                    </div>

                    {/* 13. California Legal Notices */}
                    <div className="legal-notices-section mb-6">
                      <h2 className="text-xl font-semibold text-red-300 mb-3">CALIFORNIA LEGAL NOTICES</h2>
                      
                      {/* Three-Day Right to Cancel */}
                      <div className="notice-block bg-red-900/20 border border-red-400/30 rounded p-4 mb-4">
                        <h3 className="text-red-300 font-semibold mb-2">THREE-DAY RIGHT TO CANCEL</h3>
                        <p className="text-red-200 text-sm leading-relaxed">
                          You, the buyer, have the right to cancel this contract within three business days. 
                          You may cancel by e-mailing, mailing, faxing or delivering a written notice to the contractor 
                          at the contractor's place of business by midnight of the third business day after you received 
                          a signed copy of the contract that includes this notice.
                        </p>
                      </div>

                      {/* Preliminary Lien Notice */}
                      <div className="notice-block bg-yellow-900/20 border border-yellow-400/30 rounded p-4 mb-4">
                        <h3 className="text-yellow-300 font-semibold mb-2">PRELIMINARY NOTICE</h3>
                        <p className="text-yellow-200 text-sm leading-relaxed">
                          As required by the Mechanics Lien Law of the state of California, you are hereby notified that 
                          a Preliminary Notice may be served upon you. Even though you have paid your contractor in full, 
                          if the contractor fails to pay subcontractors or material suppliers, they may look to your 
                          property for satisfaction by filing liens against your property.
                        </p>
                      </div>

                      {/* License Disclaimer */}
                      <div className="notice-block bg-blue-900/20 border border-blue-400/30 rounded p-4 mb-4">
                        <h3 className="text-blue-300 font-semibold mb-2">LICENSE DISCLOSURE</h3>
                        <p className="text-blue-200 text-sm leading-relaxed">
                          {contract.contractData.contractorLicense 
                            ? `This contractor is licensed under the Contractors' State License Law (Chapter 9 of Division 3 of the Business and Professions Code). License Number: ${contract.contractData.contractorLicense || '[License Number]'}.`
                            : "This contractor is not licensed under the Contractors' State License Law (Chapter 9 of Division 3 of the Business and Professions Code)."
                          }
                        </p>
                      </div>
                    </div>

                    {/* 14. Electronic Signatures */}
                    <div className="signatures-section">
                      <h2 className="text-xl font-semibold text-green-300 mb-3">ELECTRONIC SIGNATURES</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="signature-block border border-gray-600 rounded p-4">
                          <p className="text-green-300 font-semibold mb-3">CONTRACTOR SIGNATURE</p>
                          <div className="signature-area bg-gray-800 border border-gray-600 rounded p-3 mb-3 h-16 flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Electronic Signature Required</span>
                          </div>
                          <div className="signature-details">
                            <p className="text-gray-300">Print Name: {contract.contractData.contractorName || '________________________'}</p>
                            <p className="text-gray-300">Date: ________________________</p>
                          </div>
                        </div>
                        <div className="signature-block border border-gray-600 rounded p-4">
                          <p className="text-green-300 font-semibold mb-3">CLIENT SIGNATURE</p>
                          <div className="signature-area bg-gray-800 border border-gray-600 rounded p-3 mb-3 h-16 flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Electronic Signature Required</span>
                          </div>
                          <div className="signature-details">
                            <p className="text-gray-300">Print Name: {contract.contractData.clientName || '________________________'}</p>
                            <p className="text-gray-300">Date: ________________________</p>
                          </div>
                        </div>
                      </div>
                      <div className="electronic-signature-notice mt-4 bg-green-900/20 border border-green-400/30 rounded p-3">
                        <p className="text-green-200 text-sm">
                          <strong>Electronic Signature Disclosure:</strong> By signing electronically, both parties agree that 
                          electronic signatures will have the same legal effect as handwritten signatures under federal and 
                          state electronic signature laws.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="clauses" className="mt-6">
              <div className="space-y-4">
                <div className="bg-gray-800 border border-amber-400 rounded-lg p-4 cyberpunk-corner-frame">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <span className="font-semibold text-amber-300">
                      Cláusulas de Protección Legal
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
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
                  <div className="space-y-3 bg-gray-800 p-4 rounded-lg cyberpunk-corner-frame">
                    <h4 className="font-semibold text-cyan-300">Información del Cliente</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium text-gray-300">Nombre:</span> <span className="text-white">{contract.contractData.clientName}</span></p>
                      <p><span className="font-medium text-gray-300">Proyecto:</span> <span className="text-white">{contract.contractData.projectType}</span></p>
                      <p><span className="font-medium text-gray-300">Ubicación:</span> <span className="text-white">{contract.contractData.projectLocation}</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-gray-800 p-4 rounded-lg cyberpunk-corner-frame">
                    <h4 className="font-semibold text-cyan-300">Términos Financieros</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium text-gray-300">Valor Total:</span> <span className="text-white">{contract.contractData.totalAmount}</span></p>
                      <p><span className="font-medium text-gray-300">Fecha de Inicio:</span> <span className="text-white">{typeof contract.contractData.startDate === 'string' ? contract.contractData.startDate : contract.contractData.startDate?.toLocaleDateString() || 'Por determinar'}</span></p>
                      <p><span className="font-medium text-gray-300">Garantía:</span> <span className="text-white">12 meses</span></p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-green-400 rounded-lg p-4 cyberpunk-corner-frame">
                  <h4 className="font-semibold text-green-300 mb-2">Protecciones Incluidas</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
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

      {/* Final Actions: Email, Save, Download */}
      <Card className="border-2 border-green-400/50 bg-green-900/20">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            CONTRACT READY - FINAL ACTIONS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            {/* Email Contract */}
            <div className="bg-gray-900/50 border border-blue-400/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-3 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Send via Email
              </h3>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Client email address"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                  defaultValue={contract.contractData.clientEmail || ''}
                />
                <input
                  type="email"
                  placeholder="CC: Your email (optional)"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                />
                <Button 
                  onClick={async () => {
                    try {
                      // Send contract via Resend
                      const response = await fetch('/api/email/send-contract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contractData: contract,
                          clientEmail: contract.contractData.clientEmail,
                          contractHtml: contract.html
                        })
                      });
                      
                      if (response.ok) {
                        alert('Contract sent successfully via email');
                      } else {
                        throw new Error('Failed to send email');
                      }
                    } catch (error) {
                      alert('Failed to send contract. Please check your email settings.');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Send Contract Email
                </Button>
              </div>
            </div>

            {/* Save to History */}
            <div className="bg-gray-900/50 border border-purple-400/30 rounded-lg p-4">
              <h3 className="text-purple-400 font-semibold mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Save to History
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Contract name/reference"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none"
                  defaultValue={`${contract.contractData.clientName || 'Client'} - ${contract.contractData.projectType || 'Project'}`}
                />
                <div className="text-xs text-gray-400">
                  Save this contract for future reference and tracking
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      // Save contract to history
                      const response = await fetch('/api/contracts/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contractData: contract,
                          name: `${contract.contractData.clientName || 'Client'} - ${contract.contractData.projectType || 'Project'}`,
                          status: 'generated'
                        })
                      });
                      
                      if (response.ok) {
                        alert('Contract saved to history successfully');
                      } else {
                        throw new Error('Failed to save contract');
                      }
                    } catch (error) {
                      alert('Failed to save contract to history.');
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Save to History
                </Button>
              </div>
            </div>

            {/* Download PDF */}
            <div className="bg-gray-900/50 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-3 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-300">
                  <div>Client: {contract.contractData.clientName}</div>
                  <div>Project: {contract.contractData.projectType}</div>
                  <div>Amount: ${contract.contractData.totalAmount}</div>
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      // Generate and download PDF
                      const response = await fetch('/api/contracts/generate-pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contractHtml: contract.html,
                          contractData: contract.contractData,
                          fileName: `Contract_${contract.contractData.clientName?.replace(/\s+/g, '_') || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`
                        })
                      });
                      
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Contract_${contract.contractData.clientName?.replace(/\s+/g, '_') || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                        
                        alert('PDF downloaded successfully');
                      } else {
                        throw new Error('Failed to generate PDF');
                      }
                    } catch (error) {
                      alert('Failed to generate PDF. Please try again.');
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-500 text-white"
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Original Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Button 
              onClick={onApprove}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Approve Contract
            </Button>
            
            <Button 
              onClick={onEdit}
              variant="outline"
              size="lg"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit Contract
            </Button>
            
            <Button 
              onClick={onRegenerate}
              variant="secondary"
              size="lg"
            >
              <FileText className="h-5 w-5 mr-2" />
              Regenerate with AI
            </Button>
          </div>

          {/* Success Message */}
          <div className="bg-green-900/20 border border-green-400/30 rounded p-4">
            <div className="text-green-400 font-semibold mb-2">Contract Generation Complete</div>
            <div className="text-gray-300 text-sm">
              Your California-compliant construction contract has been generated with all required legal protections. 
              You can now send it to your client, save it for your records, or download a PDF copy.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractPreviewDisplay;