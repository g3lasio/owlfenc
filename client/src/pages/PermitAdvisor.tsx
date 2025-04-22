import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, AlertTriangle, CheckCircle2, FileText, ListChecks, HardHat, CalendarClock, DollarSign, Building2, Clock, Link2, Phone, Mail, MapPin, Clock8, ExternalLink, Ruler, Scale, Info, BookOpen, Landmark } from "lucide-react";
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';

// Tipos para los datos de permisos - Versión mejorada
interface PermitData {
  name: string;
  issuingAuthority: string;
  estimatedTimeline: string;
  averageCost?: string;
  description?: string;
  requirements?: string;
  url?: string;
}

interface LicenseRequirement {
  type: string;
  obtainingProcess: string;
  fees: string;
  renewalInfo?: string;
  bondingInsurance?: string;
  verificationProcess?: string;
  url?: string;
}

interface CodeRegulation {
  type: string;
  details: string;
  codeReference?: string;
  restrictions?: string;
  measurements?: string;
  applicableAreas?: string[];
}

interface InspectionRequirement {
  type: string;
  timing: string;
  contactInfo?: string;
  schedulingProcess?: string;
  preparationNeeded?: string;
  commonIssues?: string;
  description?: string;
}

interface TimelineInfo {
  totalEstimatedTime: string;
  criticalPathItems: string[];
  bestTimeToApply?: string;
  expirationPeriods?: string;
}

interface CostAnalysis {
  totalEstimatedCost: string;
  variableFactors: string[];
  feeScheduleUrl?: string;
  paymentMethods?: string[];
}

interface ResourceLink {
  name: string;
  url: string;
  description?: string;
  relevance?: string;
}

interface OfficialContact {
  department: string;
  purpose: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
}

interface PermitResponse {
  requiredPermits: PermitData[];
  licenseRequirements: LicenseRequirement[];
  buildingCodeRegulations: CodeRegulation[];
  inspectionRequirements: InspectionRequirement[];
  specialConsiderations: string[];
  process: string[];
  timeline?: TimelineInfo;
  costAnalysis?: CostAnalysis;
  links: ResourceLink[];
  contactInformation?: OfficialContact[];
  meta: {
    sources: string[];
    generated: string;
    projectType: string;
    projectTypeDescription?: string;
    location: string;
    fullAddress?: string;
  };
  [key: string]: any;
}

// Componente principal
export default function PermitAdvisor() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [projectType, setProjectType] = useState("fence");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [activeTab, setActiveTab] = useState("permits");
  const [useManualInput, setUseManualInput] = useState(false);
  
  // Estado para controlar el valor de Google Places Autocomplete
  const [placeValue, setPlaceValue] = useState<any>(null);
  
  // Verificar si la API key de Google Maps está configurada
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [apiError, setApiError] = useState(!googleMapsApiKey);
  
  // Solicitud de permisos
  const permitMutation = useMutation({
    mutationFn: async ({ address, projectType }: { address: string; projectType: string }) => {
      const response = await apiRequest("POST", "/api/permit/check", {
        address,
        projectType
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al consultar permisos");
      }
      
      return response.json();
    },
    onSuccess: (data: PermitResponse) => {
      setPermitData(data);
      toast({
        title: "Información obtenida correctamente",
        description: `Se encontraron ${data.requiredPermits.length} permisos para tu proyecto.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al consultar permisos",
        description: error.message || "Ocurrió un error inesperado",
      });
    }
  });

  // Handler para el autocompletado de Google Places
  const handlePlaceSelect = (place: any) => {
    if (place?.value?.description) {
      setAddress(place.value.description);
    }
  };

  // Handler para la búsqueda de permisos
  const handleSearch = () => {
    // Determinar qué dirección usar según el modo de entrada
    const finalAddress = useManualInput ? manualAddress : address;
    
    if (!finalAddress) {
      toast({
        variant: "destructive",
        title: "Dirección requerida",
        description: "Por favor ingresa una dirección válida",
      });
      return;
    }
    
    permitMutation.mutate({ address: finalAddress, projectType });
  };

  // Tipos de proyectos disponibles
  const projectTypes = [
    { value: "fence", label: "Cerca o Vallado" },
    { value: "deck", label: "Terraza / Deck" },
    { value: "remodel", label: "Remodelación Interior" },
    { value: "addition", label: "Ampliación" },
    { value: "newConstruction", label: "Nueva Construcción" },
    { value: "pool", label: "Piscina" },
    { value: "garage", label: "Garaje" },
    { value: "solarPanel", label: "Paneles Solares" },
    { value: "roofing", label: "Tejado" },
    { value: "plumbing", label: "Plomería" },
    { value: "electrical", label: "Instalación Eléctrica" },
    { value: "hvac", label: "HVAC (Climatización)" },
    { value: "driveway", label: "Entrada de Vehículos" },
    { value: "landscaping", label: "Paisajismo" }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg">
            <Search className="h-6 w-6 text-primary" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
              <FileText className="h-3 w-3 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Mervin DeepSearch</h1>
        </div>
        <p className="text-muted-foreground">
          Tu asesor legal instantáneo para permisos y regulaciones de construcción
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultar Requisitos Legales</CardTitle>
          <CardDescription>
            Ingresa los detalles de tu proyecto para conocer los permisos, licencias y regulaciones aplicables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Proyecto</label>
            <Select 
              value={projectType} 
              onValueChange={(value) => setProjectType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Dirección del Proyecto</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setUseManualInput(!useManualInput)}
              >
                {useManualInput ? "Usar autocompletado" : "Ingresar manualmente"}
              </Button>
            </div>
            
            {useManualInput ? (
              <Input
                placeholder="Ingresa la dirección completa (incluye ciudad, estado y código postal)"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
              />
            ) : googleMapsApiKey ? (
              <div className="relative z-10">
                <GooglePlacesAutocomplete
                  apiKey={googleMapsApiKey}
                  apiOptions={{ 
                    language: 'es',
                    region: 'mx',
                    libraries: ['places']
                  }}
                  autocompletionRequest={{
                    componentRestrictions: { country: ['mx', 'us', 'es'] },
                    types: ['address']
                  }}
                  selectProps={{
                    value: placeValue,
                    onChange: (value) => {
                      setPlaceValue(value);
                      handlePlaceSelect(value);
                    },
                    placeholder: "Ingresa la dirección completa del proyecto",
                    noOptionsMessage: () => "No se encontraron resultados",
                    loadingMessage: () => "Cargando resultados...",
                    className: "rounded-md border border-input z-100",
                    classNamePrefix: "react-select",
                    styles: {
                      control: (base) => ({
                        ...base,
                        border: '1px solid hsl(var(--input))',
                        boxShadow: 'none',
                        '&:hover': {
                          border: '1px solid hsl(var(--primary))',
                        },
                      }),
                      input: (base) => ({
                        ...base,
                        color: 'hsl(var(--foreground))',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused ? 'hsl(var(--primary) / 0.1)' : 'white',
                        color: 'hsl(var(--foreground))',
                        '&:hover': {
                          backgroundColor: 'hsl(var(--primary) / 0.15)',
                        },
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: 'hsl(var(--foreground))',
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: 'hsl(var(--muted-foreground))',
                      }),
                    }
                  }}
                />
              </div>
            ) : (
              <div>
                <Input
                  placeholder="Ingresa la dirección completa (incluye ciudad, estado y código postal)"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error de configuración</AlertTitle>
                  <AlertDescription>
                    El autocompletado de direcciones no está disponible. Por favor ingresa la dirección manualmente.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSearch} 
            disabled={permitMutation.isPending}
            className="w-full md:w-auto"
          >
            {permitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Consultar Permisos
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {permitMutation.isPending && (
        <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 backdrop-blur-sm border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-10 relative">
            {/* Círculos animados en el fondo */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -left-20 -top-20 w-40 h-40 rounded-full bg-primary/5 animate-pulse"></div>
              <div className="absolute right-10 top-10 w-20 h-20 rounded-full bg-primary/10 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute left-20 bottom-10 w-32 h-32 rounded-full bg-primary/5 animate-pulse" style={{ animationDelay: '0.7s' }}></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Anillo animado alrededor del spinner */}
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-dashed animate-spin" style={{ width: '70px', height: '70px', animationDuration: '8s' }}></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-dashed animate-spin" style={{ width: '70px', height: '70px', animationDuration: '5s', animationDirection: 'reverse' }}></div>
                <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
              </div>
              
              <h3 className="text-xl font-semibold text-primary">Mervin DeepSearch en acción</h3>
              <p className="text-muted-foreground text-center mt-4 max-w-md relative">
                Investigando regulaciones legales, permisos y normativas aplicables a tu proyecto en esta ubicación...
              </p>
              
              <div className="w-full max-w-md mt-6 space-y-2">
                <div className="h-2 bg-primary/10 rounded overflow-hidden">
                  <div className="h-full bg-primary/50 animate-pulse"></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Consultando fuentes oficiales</span>
                  <span>Analizando datos</span>
                </div>
              </div>
              
              <div className="mt-6 text-xs text-muted-foreground animate-pulse">
                Puede tomar hasta 30 segundos...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {permitData && !permitMutation.isPending && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle>Resultados para {permitData.meta.projectType} en {permitData.meta.location}</CardTitle>
            <CardDescription>
              Información actualizada sobre requisitos legales para tu proyecto
            </CardDescription>
          </CardHeader>
          
          <div className="px-6 pt-2">
            <Alert className="mb-4 bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <AlertTitle className="text-primary">Análisis Completo</AlertTitle>
              <AlertDescription>
                {permitData.meta.projectTypeDescription ? 
                  `Información específica para proyecto de ${permitData.meta.projectTypeDescription} en ${permitData.meta.fullAddress || permitData.meta.location}` :
                  `Información específica para proyecto de ${permitData.meta.projectType} en ${permitData.meta.location}`
                }
              </AlertDescription>
            </Alert>
          </div>
          
          <Tabs value={activeTab || "overview"} onValueChange={setActiveTab} className="mt-2">
            <div className="px-6">
              <TabsList className="grid grid-cols-2 md:grid-cols-9 mb-4 flex-wrap">
                <TabsTrigger value="overview" className="text-xs md:text-sm">
                  <Search className="h-4 w-4 mr-1 hidden sm:inline" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="permits" className="text-xs md:text-sm">
                  <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
                  Permisos
                </TabsTrigger>
                <TabsTrigger value="licenses" className="text-xs md:text-sm">
                  <CheckCircle2 className="h-4 w-4 mr-1 hidden sm:inline" />
                  Licencias
                </TabsTrigger>
                <TabsTrigger value="codes" className="text-xs md:text-sm">
                  <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
                  Códigos
                </TabsTrigger>
                <TabsTrigger value="inspections" className="text-xs md:text-sm">
                  <ListChecks className="h-4 w-4 mr-1 hidden sm:inline" />
                  Inspecciones
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs md:text-sm">
                  <CalendarClock className="h-4 w-4 mr-1 hidden sm:inline" />
                  Tiempos
                </TabsTrigger>
                <TabsTrigger value="costs" className="text-xs md:text-sm">
                  <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
                  Costos
                </TabsTrigger>
                <TabsTrigger value="process" className="text-xs md:text-sm">
                  <HardHat className="h-4 w-4 mr-1 hidden sm:inline" />
                  Proceso
                </TabsTrigger>
                <TabsTrigger value="contacts" className="text-xs md:text-sm">
                  <Phone className="h-4 w-4 mr-1 hidden sm:inline" />
                  Contactos
                </TabsTrigger>
                <TabsTrigger value="resources" className="text-xs md:text-sm">
                  <BookOpen className="h-4 w-4 mr-1 hidden sm:inline" />
                  Recursos
                </TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="h-[500px]">
              <TabsContent value="overview" className="px-6 py-4 space-y-6">
                <h3 className="text-lg font-medium flex items-center">
                  <Search className="mr-2 h-5 w-5 text-primary" />
                  Resumen General
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Tarjeta de permisos */}
                  <Card className="bg-primary/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-md flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        Permisos Requeridos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm">
                        {permitData.requiredPermits && permitData.requiredPermits.length > 0 ? (
                          <div>
                            <p className="mb-2">Se requieren {permitData.requiredPermits.length} permisos para este proyecto.</p>
                            <ul className="list-disc pl-5">
                              {permitData.requiredPermits.slice(0, 3).map((permit, idx) => (
                                <li key={idx} className="mb-1">{permit.name}</li>
                              ))}
                              {permitData.requiredPermits.length > 3 && (
                                <li className="text-muted-foreground">y {permitData.requiredPermits.length - 3} más...</li>
                              )}
                            </ul>
                          </div>
                        ) : (
                          <p>No se identificaron permisos específicos para este proyecto.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tarjeta de costos */}
                  <Card className="bg-primary/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-md flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-primary" />
                        Costos Aproximados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm">
                        {permitData.costAnalysis ? (
                          <p>{permitData.costAnalysis.totalEstimatedCost}</p>
                        ) : permitData.requiredPermits && permitData.requiredPermits.some(p => p.averageCost) ? (
                          <p>Costos variables según los permisos específicos. Ver detalles en la sección de costos.</p>
                        ) : (
                          <p>Información de costos no disponible. Se recomienda contactar a la autoridad local.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tarjeta de tiempo estimado */}
                  <Card className="bg-primary/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-md flex items-center">
                        <CalendarClock className="h-5 w-5 mr-2 text-primary" />
                        Tiempo Estimado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm">
                        {permitData.timeline ? (
                          <p>{permitData.timeline.totalEstimatedTime}</p>
                        ) : (
                          <p>El tiempo puede variar según la jurisdicción local. Ver detalles en la sección de tiempos.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tarjeta de consideraciones especiales */}
                  <Card className="bg-primary/5">
                    <CardHeader className="py-3">
                      <CardTitle className="text-md flex items-center">
                        <Info className="h-5 w-5 mr-2 text-primary" />
                        Consideraciones Especiales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="text-sm">
                        {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                          <ul className="list-disc pl-5">
                            {permitData.specialConsiderations.slice(0, 3).map((consideration, idx) => (
                              <li key={idx} className="mb-1">{consideration}</li>
                            ))}
                            {permitData.specialConsiderations.length > 3 && (
                              <li className="text-muted-foreground">y {permitData.specialConsiderations.length - 3} más...</li>
                            )}
                          </ul>
                        ) : (
                          <p>No se identificaron consideraciones especiales para este proyecto.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Proceso resumido */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center">
                      <HardHat className="h-5 w-5 mr-2 text-primary" />
                      Proceso Simplificado
                    </CardTitle>
                    <CardDescription>
                      Pasos clave para obtener los permisos necesarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {permitData.process && permitData.process.length > 0 ? (
                      <ol className="relative border-l border-primary/30 ml-3 space-y-6 py-2">
                        {permitData.process.slice(0, 4).map((step, idx) => (
                          <li key={idx} className="ml-6 relative">
                            <div className="absolute -left-3 bg-background rounded-full h-6 w-6 flex items-center justify-center border border-primary text-primary">
                              {idx + 1}
                            </div>
                            <p className="text-sm">{step}</p>
                          </li>
                        ))}
                        {permitData.process.length > 4 && (
                          <li className="ml-6 text-sm text-muted-foreground">
                            <div className="absolute -left-3 bg-muted text-muted-foreground rounded-full h-6 w-6 flex items-center justify-center border border-border">
                              ...
                            </div>
                            Ver todos los pasos en la sección de proceso
                          </li>
                        )}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Proceso no disponible para este tipo de proyecto.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Fuentes de información */}
                <div className="mt-6 bg-muted/30 p-4 rounded-lg border border-border">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <Landmark className="h-4 w-4 mr-2 text-primary" />
                    Fuentes de Información
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Información compilada de {permitData.meta.sources?.length || 0} fuentes oficiales incluyendo departamentos de construcción, 
                    códigos locales y agencias gubernamentales relevantes para {permitData.meta.location}.
                  </p>
                  <div className="flex items-center mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                    Última actualización: {new Date(permitData.meta.generated || Date.now()).toLocaleDateString()}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {permitData.meta.sources && permitData.meta.sources.length > 0 ? (
                      permitData.meta.sources.slice(0, 3).map((source, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/5 border border-border">
                          {source.includes('//') ? 
                            (function() {
                              try {
                                return new URL(source).hostname;
                              } catch {
                                return source;
                              }
                            })() : source}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/5 border border-border">
                        Fuentes verificadas
                      </span>
                    )}
                    {permitData.meta.sources && permitData.meta.sources.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 border border-border">
                        +{permitData.meta.sources.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="permits" className="px-6 py-4 space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-primary" />
                  Permisos Requeridos
                </h3>
                
                {permitData?.requiredPermits?.length > 0 ? (
                  permitData.requiredPermits.map((permit, idx) => (
                    <Card key={idx} className="mb-4">
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">{permit.name}</CardTitle>
                        <CardDescription>
                          Emitido por: {permit.issuingAuthority}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center">
                            <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">Tiempo estimado: {permit.estimatedTimeline}</span>
                          </div>
                          {permit.averageCost && (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm">Costo aproximado: {permit.averageCost}</span>
                            </div>
                          )}
                        </div>
                        {permit.description && (
                          <p className="text-sm mt-2">{permit.description}</p>
                        )}
                        {permit.url && (
                          <div className="mt-3">
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => window.open(permit.url, '_blank')}>
                              Ver formulario o información
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Sin permisos específicos</AlertTitle>
                    <AlertDescription>
                      No se identificaron permisos específicos para este tipo de proyecto en esta ubicación.
                      Esto podría significar que no se requieren permisos o que la información no está disponible.
                      Se recomienda contactar a la autoridad local para confirmar.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="licenses" className="px-6 py-4 space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-primary" />
                  Licencias de Contratista
                </h3>
                
                {permitData.licenseRequirements && permitData.licenseRequirements.length > 0 ? (
                  permitData.licenseRequirements.map((license, idx) => (
                    <Card key={idx} className="mb-4">
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">{license.type}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="space-y-2">
                          <p className="text-sm"><span className="font-medium">Proceso:</span> {license.obtainingProcess}</p>
                          <p className="text-sm"><span className="font-medium">Costos:</span> {license.fees}</p>
                          {license.renewalInfo && (
                            <p className="text-sm"><span className="font-medium">Renovación:</span> {license.renewalInfo}</p>
                          )}
                          {license.url && (
                            <div className="mt-3">
                              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => window.open(license.url, '_blank')}>
                                Ver más información
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Sin requisitos de licencia específicos</AlertTitle>
                    <AlertDescription>
                      No se identificaron requisitos de licencia específicos para contratistas en esta ubicación.
                      Recomendamos verificar con la autoridad local si se requiere alguna licencia comercial general.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="codes" className="px-6 py-4 space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-primary" />
                  Regulaciones y Códigos de Construcción
                </h3>
                
                {permitData.buildingCodeRegulations && permitData.buildingCodeRegulations.length > 0 ? (
                  permitData.buildingCodeRegulations.map((code, idx) => (
                    <Card key={idx} className="mb-4">
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">{code.type}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="space-y-2">
                          <p className="text-sm">{code.details}</p>
                          {code.restrictions && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium">Restricciones:</h4>
                              <p className="text-sm">{code.restrictions}</p>
                            </div>
                          )}
                          {code.applicableAreas && Array.isArray(code.applicableAreas) && code.applicableAreas.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium">Áreas aplicables:</h4>
                              <ul className="list-disc pl-5 text-sm">
                                {code.applicableAreas.map((area, i) => (
                                  <li key={i}>{area}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {code.applicableAreas && typeof code.applicableAreas === 'string' && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium">Áreas aplicables:</h4>
                              <p className="text-sm">{code.applicableAreas}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Sin regulaciones específicas</AlertTitle>
                    <AlertDescription>
                      No se identificaron regulaciones específicas para este tipo de proyecto.
                      Recomendamos verificar con el departamento de planificación local para más información.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="inspections" className="px-6 py-4 space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <ListChecks className="mr-2 h-5 w-5 text-primary" />
                  Requisitos de Inspección
                </h3>
                
                {permitData.inspectionRequirements && permitData.inspectionRequirements.length > 0 ? (
                  permitData.inspectionRequirements.map((inspection, idx) => (
                    <Card key={idx} className="mb-4">
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">{inspection.type}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="space-y-2">
                          <p className="text-sm"><span className="font-medium">Momento:</span> {inspection.timing}</p>
                          {inspection.contactInfo && (
                            <p className="text-sm"><span className="font-medium">Contacto:</span> {inspection.contactInfo}</p>
                          )}
                          {inspection.description && (
                            <p className="text-sm mt-2">{inspection.description}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Sin inspecciones específicas</AlertTitle>
                    <AlertDescription>
                      No se identificaron requisitos de inspección específicos para este proyecto.
                      Consulta con la oficina de permisos local si es necesario programar inspecciones.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="process" className="px-6 py-4 space-y-6">
                <h3 className="text-lg font-medium flex items-center">
                  <HardHat className="mr-2 h-5 w-5 text-primary" />
                  Proceso Paso a Paso
                </h3>
                
                {permitData.process && permitData.process.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-primary/30"></div>
                    <ol className="relative space-y-6">
                      {permitData.process.map((step, idx) => (
                        <li key={idx} className="ml-8 relative">
                          <div className="absolute -left-7 bg-background rounded-full h-6 w-6 flex items-center justify-center border border-primary text-primary font-medium">
                            {idx + 1}
                          </div>
                          <p className="text-sm">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Proceso no disponible</AlertTitle>
                    <AlertDescription>
                      No se pudo determinar un proceso específico para este tipo de proyecto.
                      Recomendamos contactar directamente con las autoridades locales.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Consideraciones especiales */}
                {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader className="py-4">
                      <CardTitle className="text-md flex items-center">
                        <Info className="h-5 w-5 mr-2 text-primary" />
                        Consideraciones Especiales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="list-disc pl-5 space-y-2">
                        {permitData.specialConsiderations.map((consideration, idx) => (
                          <li key={idx} className="text-sm">{consideration}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Evita Multas y Retrasos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Conoce todos los permisos necesarios antes de iniciar tu proyecto y evita costosas penalizaciones.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Normativas Actualizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Accede a información actualizada sobre regulaciones y códigos específicos para tu ubicación.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Asesoría Confiable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Obtén respuestas inmediatas sobre requisitos legales sin necesidad de consultar múltiples fuentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}