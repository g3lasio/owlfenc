import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  ScrollText, 
  Clock,
  Shield,
  User,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface ContractSection {
  id: string;
  title: string;
  content: string;
  critical: boolean;
  readTime: number; // estimated seconds
}

interface ContractData {
  client: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
  };
  contractor: {
    name: string;
    company: string;
    address: string;
    email?: string;
    phone?: string;
    license?: string;
  };
  project: {
    description: string;
    type: string;
    total: number;
  };
  timeline: {
    startDate: string;
    completionDate: string;
  };
  terms: {
    warranty: string;
    payment: string;
    cancellation: string;
  };
  legalClauses: any[];
}

interface ContractPreviewProps {
  contractData: ContractData;
  onReadingComplete: (confirmed: boolean) => void;
  onSectionComplete: (sectionId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export default function ContractPreviewRenderer({
  contractData,
  onReadingComplete,
  onSectionComplete,
  isLoading = false,
  className = ""
}: ContractPreviewProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [sectionsRead, setSectionsRead] = useState<Set<string>>(new Set());
  const [readingConfirmations, setReadingConfirmations] = useState<{[key: string]: boolean}>({});
  const [allSectionsRead, setAllSectionsRead] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());
  const [timeSpentReading, setTimeSpentReading] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Generate contract sections from data
  const generateContractSections = (): ContractSection[] => {
    return [
      {
        id: 'parties',
        title: 'PARTES DEL CONTRATO',
        content: `
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="border border-gray-300 p-4 rounded">
                <h4 class="font-semibold text-lg mb-3 text-blue-600">CONTRATISTA</h4>
                <p><strong>Nombre/Empresa:</strong> ${contractData.contractor.company || contractData.contractor.name}</p>
                <p><strong>Dirección:</strong> ${contractData.contractor.address}</p>
                ${contractData.contractor.phone ? `<p><strong>Teléfono:</strong> ${contractData.contractor.phone}</p>` : ''}
                ${contractData.contractor.email ? `<p><strong>Email:</strong> ${contractData.contractor.email}</p>` : ''}
                ${contractData.contractor.license ? `<p><strong>Licencia:</strong> ${contractData.contractor.license}</p>` : ''}
              </div>
              <div class="border border-gray-300 p-4 rounded">
                <h4 class="font-semibold text-lg mb-3 text-green-600">CLIENTE</h4>
                <p><strong>Nombre:</strong> ${contractData.client.name}</p>
                <p><strong>Dirección:</strong> ${contractData.client.address}</p>
                ${contractData.client.phone ? `<p><strong>Teléfono:</strong> ${contractData.client.phone}</p>` : ''}
                ${contractData.client.email ? `<p><strong>Email:</strong> ${contractData.client.email}</p>` : ''}
              </div>
            </div>
          </div>
        `,
        critical: true,
        readTime: 30
      },
      {
        id: 'project',
        title: 'DESCRIPCIÓN DEL PROYECTO',
        content: `
          <div class="space-y-4">
            <div class="bg-gray-50 p-4 rounded">
              <h4 class="font-semibold text-lg mb-2">Tipo de Proyecto</h4>
              <p class="text-lg">${contractData.project.type}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded">
              <h4 class="font-semibold text-lg mb-2">Descripción Detallada</h4>
              <p>${contractData.project.description}</p>
            </div>
            <div class="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
              <h4 class="font-semibold text-lg mb-2">Valor Total del Proyecto</h4>
              <p class="text-2xl font-bold text-blue-600">$${contractData.project.total.toLocaleString()}</p>
            </div>
          </div>
        `,
        critical: true,
        readTime: 45
      },
      {
        id: 'timeline',
        title: 'CRONOGRAMA Y FECHAS',
        content: `
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-green-50 p-4 rounded border-l-4 border-green-500">
                <h4 class="font-semibold text-lg mb-2">Fecha de Inicio</h4>
                <p class="text-lg">${new Date(contractData.timeline.startDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
              <div class="bg-red-50 p-4 rounded border-l-4 border-red-500">
                <h4 class="font-semibold text-lg mb-2">Fecha de Finalización</h4>
                <p class="text-lg">${new Date(contractData.timeline.completionDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
            </div>
            <div class="bg-yellow-50 p-4 rounded border-l-4 border-yellow-500">
              <h4 class="font-semibold text-lg mb-2">Duración Estimada</h4>
              <p>${Math.ceil((new Date(contractData.timeline.completionDate).getTime() - new Date(contractData.timeline.startDate).getTime()) / (1000 * 60 * 60 * 24))} días hábiles</p>
            </div>
          </div>
        `,
        critical: true,
        readTime: 25
      },
      {
        id: 'financial',
        title: 'TÉRMINOS FINANCIEROS',
        content: `
          <div class="space-y-4">
            <div class="bg-blue-50 p-6 rounded border-2 border-blue-200">
              <h4 class="font-semibold text-xl mb-4 text-blue-800">Estructura de Pagos</h4>
              <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-white rounded border">
                  <span class="font-medium">Depósito Inicial (50%)</span>
                  <span class="text-lg font-bold text-green-600">$${(contractData.project.total * 0.5).toLocaleString()}</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-white rounded border">
                  <span class="font-medium">Pago Final (50%)</span>
                  <span class="text-lg font-bold text-blue-600">$${(contractData.project.total * 0.5).toLocaleString()}</span>
                </div>
                <div class="border-t-2 border-gray-300 pt-3">
                  <div class="flex justify-between items-center p-3 bg-gray-100 rounded">
                    <span class="font-bold text-lg">TOTAL</span>
                    <span class="text-xl font-bold text-gray-800">$${contractData.project.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-red-50 p-4 rounded border border-red-200">
              <h4 class="font-semibold text-lg mb-2 text-red-800">Términos de Pago</h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Los pagos deben realizarse según el cronograma establecido</li>
                <li>Retrasos en el pago pueden resultar en suspensión de trabajos</li>
                <li>Se aplicarán cargos por mora del 1.5% mensual</li>
              </ul>
            </div>
          </div>
        `,
        critical: true,
        readTime: 60
      },
      {
        id: 'legal',
        title: 'CLÁUSULAS LEGALES Y PROTECCIONES',
        content: `
          <div class="space-y-4">
            <div class="bg-red-50 p-4 rounded border-l-4 border-red-500">
              <h4 class="font-semibold text-lg mb-3 text-red-800">IMPORTANTE: Limitaciones de Responsabilidad</h4>
              <ul class="list-disc pl-5 space-y-2">
                ${contractData.legalClauses.map(clause => `<li>${clause.title}: ${clause.description}</li>`).join('')}
              </ul>
            </div>
            <div class="bg-yellow-50 p-4 rounded border-l-4 border-yellow-500">
              <h4 class="font-semibold text-lg mb-2 text-yellow-800">Garantías</h4>
              <p>${contractData.terms.warranty || 'Garantía estándar de 1 año en mano de obra'}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded">
              <h4 class="font-semibold text-lg mb-2">Términos de Cancelación</h4>
              <p>${contractData.terms.cancellation || 'Cancelación requiere notificación por escrito con 48 horas de anticipación'}</p>
            </div>
          </div>
        `,
        critical: true,
        readTime: 90
      },
      {
        id: 'signatures',
        title: 'FIRMAS Y ACEPTACIÓN',
        content: `
          <div class="space-y-6">
            <div class="bg-blue-50 p-6 rounded border-2 border-blue-200">
              <h4 class="font-semibold text-xl mb-4 text-blue-800">Confirmación de Lectura y Aceptación</h4>
              <div class="space-y-3">
                <p class="text-sm text-gray-700">
                  Al firmar este contrato, usted confirma que:
                </p>
                <ul class="list-disc pl-5 space-y-1 text-sm">
                  <li>Ha leído y comprendido todos los términos y condiciones</li>
                  <li>Acepta el alcance del trabajo y cronograma especificados</li>
                  <li>Está de acuerdo con los términos financieros y de pago</li>
                  <li>Entiende sus derechos y responsabilidades</li>
                </ul>
              </div>
            </div>
            <div class="text-center text-sm text-gray-600 bg-gray-50 p-4 rounded">
              <p>Este contrato será legalmente vinculante una vez firmado por ambas partes</p>
              <p class="mt-2">Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        `,
        critical: true,
        readTime: 45
      }
    ];
  };

  const contractSections = generateContractSections();

  // Track reading time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpentReading(Date.now() - readingStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [readingStartTime]);

  // Monitor scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const element = scrollRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      setReadProgress(Math.min(progress, 100));

      // Check if current section is fully visible
      const currentSectionElement = sectionRefs.current[contractSections[currentSection]?.id];
      if (currentSectionElement) {
        const rect = currentSectionElement.getBoundingClientRect();
        const containerRect = element.getBoundingClientRect();
        
        if (rect.bottom <= containerRect.bottom && !sectionsRead.has(contractSections[currentSection].id)) {
          const newSectionsRead = new Set(sectionsRead);
          newSectionsRead.add(contractSections[currentSection].id);
          setSectionsRead(newSectionsRead);
          onSectionComplete(contractSections[currentSection].id);
        }
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [currentSection, contractSections, sectionsRead, onSectionComplete]);

  // Check if all sections have been read
  useEffect(() => {
    const allRead = contractSections.every(section => sectionsRead.has(section.id));
    setAllSectionsRead(allRead);
  }, [sectionsRead, contractSections]);

  const handleConfirmationChange = (sectionId: string, checked: boolean) => {
    setReadingConfirmations(prev => ({
      ...prev,
      [sectionId]: checked
    }));
  };

  const allConfirmationsChecked = contractSections
    .filter(section => section.critical)
    .every(section => readingConfirmations[section.id]);

  const canProceedToSign = allSectionsRead && allConfirmationsChecked && readProgress >= 95;

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Reading Progress Header */}
      <Card className="cyberpunk-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <span>Vista Previa del Contrato</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">{formatTime(timeSpentReading)}</span>
              </div>
              <Badge variant={canProceedToSign ? "default" : "secondary"} className="bg-cyan-600">
                {sectionsRead.size}/{contractSections.length} Secciones
              </Badge>
            </div>
          </CardTitle>
          
          <div className="space-y-2">
            <Progress value={readProgress} className="h-2" />
            <p className="text-sm text-gray-400">
              Progreso de lectura: {readProgress.toFixed(0)}% • 
              {allSectionsRead ? ' ✅ Documento completo leído' : ' 📖 Continúe leyendo para habilitar firma'}
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Contract Content */}
      <Card className="cyberpunk-border max-h-96 overflow-hidden">
        <div 
          ref={scrollRef}
          className="max-h-96 overflow-y-auto p-6 space-y-8"
          style={{ scrollBehavior: 'smooth' }}
        >
          {contractSections.map((section, index) => (
            <div
              key={section.id}
              ref={el => sectionRefs.current[section.id] = el}
              className={`space-y-4 ${index !== contractSections.length - 1 ? 'border-b border-gray-200 pb-8' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  sectionsRead.has(section.id) ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  {sectionsRead.has(section.id) ? 
                    <CheckCircle className="h-5 w-5 text-white" /> : 
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  }
                </div>
                <h3 className="text-xl font-bold text-gray-800">{section.title}</h3>
                {section.critical && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Crítico
                  </Badge>
                )}
              </div>
              
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />

              {/* Confirmation Checkbox for Critical Sections */}
              {section.critical && sectionsRead.has(section.id) && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded border border-blue-200">
                  <Checkbox
                    id={`confirm-${section.id}`}
                    checked={readingConfirmations[section.id] || false}
                    onCheckedChange={(checked) => handleConfirmationChange(section.id, checked as boolean)}
                  />
                  <label 
                    htmlFor={`confirm-${section.id}`}
                    className="text-sm font-medium text-blue-800 cursor-pointer"
                  >
                    He leído y entendido esta sección crítica
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Reading Completion Actions */}
      <Card className="cyberpunk-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold">Estado de Revisión</h4>
                <p className="text-sm text-gray-600">
                  Complete la lectura y confirmaciones para proceder al firmado
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{readProgress.toFixed(0)}%</div>
                <div className="text-sm text-gray-500">Completado</div>
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${readProgress >= 95 ? 'text-green-600' : 'text-gray-500'}`}>
                {readProgress >= 95 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                Documento leído completamente (95%+)
              </div>
              <div className={`flex items-center gap-2 text-sm ${allSectionsRead ? 'text-green-600' : 'text-gray-500'}`}>
                {allSectionsRead ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                Todas las secciones visitadas
              </div>
              <div className={`flex items-center gap-2 text-sm ${allConfirmationsChecked ? 'text-green-600' : 'text-gray-500'}`}>
                {allConfirmationsChecked ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                Secciones críticas confirmadas
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => onReadingComplete(false)}
                className="flex-1"
              >
                <ScrollText className="h-4 w-4 mr-2" />
                Revisar Nuevamente
              </Button>
              
              <Button
                onClick={() => onReadingComplete(true)}
                disabled={!canProceedToSign}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Proceder al Firmado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}