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
import { Loader2, Search, AlertTriangle, CheckCircle2, FileText, ListChecks, HardHat, CalendarClock, DollarSign, Building2, Ruler, Scale } from "lucide-react";
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';

// Tipos para los datos de permisos
interface PermitData {
  name: string;
  issuingAuthority: string;
  estimatedTimeline: string;
  averageCost?: string;
  description?: string;
  url?: string;
}

interface LicenseRequirement {
  type: string;
  obtainingProcess: string;
  fees: string;
  renewalInfo?: string;
  url?: string;
}

interface CodeRegulation {
  type: string;
  details: string;
  restrictions?: string;
  applicableAreas?: string[];
}

interface InspectionRequirement {
  type: string;
  timing: string;
  contactInfo?: string;
  description?: string;
}

interface PermitResponse {
  requiredPermits: PermitData[];
  licenseRequirements: LicenseRequirement[];
  buildingCodeRegulations: CodeRegulation[];
  inspectionRequirements: InspectionRequirement[];
  specialConsiderations: string[];
  process: string[];
  links: { name: string; url: string }[];
  meta: {
    sources: string[];
    generated: string;
    projectType: string;
    location: string;
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
        <h1 className="text-3xl font-bold">Mervin DeepSearch</h1>
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
                    className: "rounded-md border border-input z-100"
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h3 className="text-xl font-semibold">Consultando información legal...</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              Estamos analizando las regulaciones y permisos aplicables a tu proyecto en esta ubicación.
              Esto puede tomar unos momentos.
            </p>
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
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <div className="px-6">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
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
                <TabsTrigger value="process" className="text-xs md:text-sm">
                  <HardHat className="h-4 w-4 mr-1 hidden sm:inline" />
                  Proceso
                </TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="h-[500px]">
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
                          {code.applicableAreas && code.applicableAreas.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium">Áreas aplicables:</h4>
                              <ul className="list-disc pl-5 text-sm">
                                {code.applicableAreas.map((area, i) => (
                                  <li key={i}>{area}</li>
                                ))}
                              </ul>
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
                    <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-border"></div>
                    <ol className="relative space-y-4">
                      {permitData.process.map((step, idx) => (
                        <li key={idx} className="ml-8 relative">
                          <div className="absolute -left-7 bg-background rounded-full h-6 w-6 flex items-center justify-center border border-border">
                            <span className="text-xs">{idx + 1}</span>
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
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Consideraciones Especiales</h3>
                  
                  {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                    <ul className="space-y-2">
                      {permitData.specialConsiderations.map((consideration, idx) => (
                        <li key={idx} className="flex">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{consideration}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No se identificaron consideraciones especiales para este proyecto.</p>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Enlaces Oficiales</h3>
                  
                  {permitData.links && permitData.links.length > 0 ? (
                    <ul className="space-y-2">
                      {permitData.links.map((link, idx) => (
                        <li key={idx}>
                          <Button 
                            variant="link" 
                            className="px-0 h-auto text-sm" 
                            onClick={() => window.open(link.url, '_blank')}
                          >
                            {link.name}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No se proporcionaron enlaces oficiales.</p>
                  )}
                  
                  <div className="mt-4 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Fuentes consultadas: {permitData.meta.sources.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Información generada: {new Date(permitData.meta.generated).toLocaleString()}
                    </p>
                  </div>
                </div>
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