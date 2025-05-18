import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ListChecks,
  HardHat,
  CalendarClock,
  DollarSign,
  Building2,
  Clock,
  Link2,
  Phone,
  Mail,
  MapPin,
  Clock8,
  ExternalLink,
  Ruler,
  Scale,
  Info,
  BookOpen,
  Landmark,
  CheckSquare,
  History,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";

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

// Interfaz para el historial de búsqueda
interface SearchHistoryItem {
  id: number;
  userId: number;
  address: string;
  projectType: string;
  projectDescription?: string;
  title: string;
  results: PermitResponse;
  createdAt: string;
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
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<SearchHistoryItem | null>(null);

  // Estado para controlar el valor de Google Places Autocomplete
  const [placeValue, setPlaceValue] = useState<any>(null);
  
  // Estados para detalles del proyecto
  const [projectDescription, setProjectDescription] = useState("");
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Verificar si la API key de Google Maps está configurada
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [apiError, setApiError] = useState(!googleMapsApiKey);
  
  // Estado para controlar la visualización del formulario
  const [showSearchForm, setShowSearchForm] = useState(true);
  
  // Solicitud de permisos
  const permitMutation = useMutation({
    mutationFn: async ({
      address,
      projectType,
      projectDescription,
    }: {
      address: string;
      projectType: string;
      projectDescription?: string;
    }) => {
      const response = await apiRequest("POST", "/api/permit/check", {
        address,
        projectType,
        projectDescription,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al consultar permisos");
      }

      return response.json();
    },
    onSuccess: (data: PermitResponse) => {
      console.log("Datos recibidos del API:", data);
      setPermitData(data);
      queryClient.invalidateQueries({ queryKey: ['/api/permit/history'] });
      toast({
        title: "Información obtenida correctamente",
        description: `Se encontraron ${data.requiredPermits?.length || 0} permisos para tu proyecto.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al consultar permisos",
        description: error.message || "Ocurrió un error inesperado",
      });
    },
  });

  // Al recibir resultados, ocultar el formulario
  useEffect(() => {
    if (permitData && !permitMutation.isPending) {
      setShowSearchForm(false);
    }
  }, [permitData, permitMutation.isPending]);
  
  // Función para volver al formulario de búsqueda
  const handleBackToSearch = () => {
    setShowSearchForm(true);
  };
  
  // Consulta para obtener el historial de búsquedas
  const historyQuery = useQuery({
    queryKey: ['/api/permit/history'],
    queryFn: async () => {
      const response = await fetch('/api/permit/history');
      if (!response.ok) {
        throw new Error('Error al obtener el historial de búsquedas');
      }
      return response.json() as Promise<SearchHistoryItem[]>;
    },
    enabled: true, // Siempre habilitado para cargar automáticamente el historial
  });

  // Handler para el autocompletado de Google Places
  const handlePlaceSelect = (place: any) => {
    if (place?.value?.description) {
      setAddress(place.value.description);
    }
  };

  // Handler para seleccionar archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setProjectFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handler para remover un archivo
  const handleRemoveFile = (index: number) => {
    setProjectFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handler para abrir el historial de búsquedas
  const handleOpenHistory = () => {
    // Refrescar los datos del historial antes de abrir el modal
    queryClient.invalidateQueries({ queryKey: ['/api/permit/history'] });
    setShowHistory(true);
  };
  
  // Handler para cargar un elemento del historial
  const handleLoadHistoryItem = (item: SearchHistoryItem) => {
    // Procesar los datos de la misma manera que lo hacemos con permitMutation
    const processedData = item.results;
    setPermitData(processedData);
    
    // También actualizamos los campos del formulario
    setProjectType(item.projectType);
    if (item.projectDescription) {
      setProjectDescription(item.projectDescription);
    }
    
    // Determinar cómo establecer la dirección
    if (useManualInput) {
      setManualAddress(item.address);
    } else {
      setAddress(item.address);
      // Restablecer el valor del autocompletado de Google Places
      setPlaceValue(null);
    }
    
    // Cerrar el modal del historial
    setShowHistory(false);
    setSelectedHistoryItem(item);
    
    toast({
      title: "Búsqueda cargada del historial",
      description: `Se ha cargado la búsqueda: ${item.title}`,
    });
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

    // Aquí deberíamos cargar archivos al servidor si hubiera, pero por ahora
    // solo enviamos la información básica incluyendo la descripción del proyecto
    permitMutation.mutate({ 
      address: finalAddress, 
      projectType,
      projectDescription
    });
  };

  // Tipos de proyectos disponibles
  const projectTypes = [
    { value: "fence", label: "Fence or Gate" },
    { value: "deck", label: "Deck" },
    { value: "remodel", label: "Interior Remodel" },
    { value: "addition", label: "Home Addition" },
    { value: "newConstruction", label: "New Construction" },
    { value: "pool", label: "Swimming Pool" },
    { value: "garage", label: "Garage" },
    { value: "solarPanel", label: "Solar Panels" },
    { value: "roofing", label: "Roofing" },
    { value: "plumbing", label: "Plumbing" },
    { value: "electrical", label: "Electrical Installation" },
    { value: "hvac", label: "HVAC System" },
    { value: "driveway", label: "Driveway" },
    { value: "landscaping", label: "Landscaping" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg">
            <Search className="h-6 w-6 text-primary" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
              <FileText className="h-3 w-3 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Mervin Permit Advisor</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Tu asesor legal instantáneo para permisos y regulaciones de
          construcción
        </p>
      </div>
      
      {/* Botones de acción principales - Siempre visibles */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {!showSearchForm && (
          <Button 
            variant="outline" 
            onClick={handleBackToSearch}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Volver a búsqueda
          </Button>
        )}
        
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          title="Ver historial de búsquedas"
          onClick={handleOpenHistory}
          disabled={historyQuery.isLoading || historyQuery.isError || !historyQuery.data || historyQuery.data.length === 0}
        >
          <History className="h-4 w-4" />
        </Button>
      </div>

      {/* Formulario de búsqueda - Visible solo cuando showSearchForm es true */}
      {showSearchForm && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Consultar Requisitos Legales</CardTitle>
            <CardDescription className="mx-auto max-w-lg">
              Ingresa los detalles de tu proyecto para conocer los permisos,
              licencias y regulaciones aplicables
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
                  <SelectValue placeholder="Select project type" />
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
                <label className="text-sm font-medium">
                  Dirección del Proyecto
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setUseManualInput(!useManualInput)}
                >
                  {useManualInput
                    ? "Usar autocompletado"
                    : "Ingresar manualmente"}
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
                      language: "es",
                      region: "mx",
                      libraries: ["places"],
                    }}
                    autocompletionRequest={{
                      componentRestrictions: { country: ["mx", "us", "es"] },
                      types: ["address"],
                    }}
                    selectProps={{
                      value: placeValue,
                      onChange: (value) => {
                        setPlaceValue(value);
                        handlePlaceSelect(value);
                      },
                      placeholder: "Type Address Project",
                      noOptionsMessage: () => "No se encontraron resultados",
                      loadingMessage: () => "Cargando resultados...",
                      className: "rounded-md border border-input z-100",
                      classNamePrefix: "react-select",
                      styles: {
                        control: (base) => ({
                          ...base,
                          background: "white",
                          border: "1px solid hsl(var(--input))",
                          boxShadow: "none",
                          "&:hover": {
                            border: "1px solid hsl(var(--primary))",
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          color: "rgb(15, 23, 42)",
                          fontWeight: 500,
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "hsl(var(--primary) / 0.1)"
                            : "white",
                          color: "rgb(15, 23, 42)",
                          fontWeight: 500,
                          "&:hover": {
                            backgroundColor: "hsl(var(--primary) / 0.15)",
                          },
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "rgb(15, 23, 42)",
                          fontWeight: 500,
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "rgb(100, 116, 139)",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                          background: "white",
                        }),
                      },
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
                      El autocompletado de direcciones no está disponible. Por
                      favor ingresa la dirección manualmente.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-6 pt-4 border-t border-gray-100">
              <label className="text-sm font-medium">
                Descripción del Proyecto
              </label>
              <Textarea
                placeholder="Describe los detalles específicos de tu proyecto (dimensiones, materiales, alcance del trabajo, etc.)"
                value={projectDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProjectDescription(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Una descripción detallada ayudará a Mervin a proporcionar información más precisa y personalizada sobre los permisos necesarios.
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary/70" />
                Archivos Adjuntos (opcional)
              </label>
              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Adjunta planos, dibujos, diseños o documentos de alcance del trabajo
                  </p>
                  <Input 
                    type="file" 
                    multiple 
                    onChange={handleFileSelect}
                    className="max-w-xs"
                    id="project-files"
                  />
                  <Label htmlFor="project-files" className="cursor-pointer text-xs text-primary">
                    Seleccionar archivos
                  </Label>
                </div>

                {projectFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Archivos seleccionados:</p>
                    <div className="mt-2 space-y-2">
                      {projectFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-primary/70" />
                            <span className="text-sm truncate max-w-[20ch] md:max-w-[30ch]">{file.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({Math.round(file.size / 1024)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveFile(idx)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Nota: Estos archivos no se cargarán al servidor en esta versión, pero ayudan a documentar el proyecto.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-center">
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
          
          {/* Modal de historial de búsquedas */}
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Historial de Búsquedas
                </DialogTitle>
                <DialogDescription>
                  Consulta y carga búsquedas anteriores para evitar realizar la misma búsqueda nuevamente.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {historyQuery.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Cargando historial de búsquedas...</p>
                  </div>
                ) : historyQuery.isError ? (
                  <div className="text-center p-4 border rounded-md bg-red-50">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="font-medium">Error al cargar el historial</h3>
                    <p className="text-sm text-muted-foreground">
                      {historyQuery.error instanceof Error ? historyQuery.error.message : 'Error desconocido'}
                    </p>
                  </div>
                ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                  <div className="text-center p-8 border rounded-md bg-gray-50">
                    <Info className="h-10 w-10 text-primary/50 mx-auto mb-2" />
                    <h3 className="font-medium text-lg">No hay búsquedas previas</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cuando realices consultas de permisos, se guardarán aquí para facilitar su acceso posterior.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[min(65vh,400px)] pr-4">
                    <div className="space-y-3">
                      {historyQuery.data.map((item) => (
                        <Card key={item.id} className="hover:bg-primary/5 transition-colors">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-medium block text-xs">Dirección:</span>
                                <span className="text-muted-foreground text-xs">{item.address}</span>
                              </div>
                              <div>
                                <span className="font-medium block text-xs">Tipo de proyecto:</span>
                                <span className="text-muted-foreground text-xs capitalize">{item.projectType}</span>
                              </div>
                              {item.projectDescription && (
                                <div className="col-span-2 mt-1">
                                  <span className="font-medium block text-xs">Descripción:</span>
                                  <span className="text-muted-foreground text-xs line-clamp-2">{item.projectDescription}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center mt-3">
                              <div className="text-xs text-primary">
                                {item.results.requiredPermits.length} permisos encontrados
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8"
                                onClick={() => handleLoadHistoryItem(item)}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Cargar resultados
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      {permitMutation.isPending && (
        <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 backdrop-blur-sm border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-10 relative">
            {/* Círculos animados en el fondo */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -left-20 -top-20 w-40 h-40 rounded-full bg-primary/5 animate-pulse"></div>
              <div
                className="absolute right-10 top-10 w-20 h-20 rounded-full bg-primary/10 animate-pulse"
                style={{ animationDelay: "0.5s" }}
              ></div>
              <div
                className="absolute left-20 bottom-10 w-32 h-32 rounded-full bg-primary/5 animate-pulse"
                style={{ animationDelay: "0.7s" }}
              ></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              {/* Anillo animado alrededor del spinner */}
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 rounded-full border-2 border-primary/30 border-dashed animate-spin"
                  style={{
                    width: "70px",
                    height: "70px",
                    animationDuration: "8s",
                  }}
                ></div>
                <div
                  className="absolute inset-0 rounded-full border-2 border-primary/20 border-dashed animate-spin"
                  style={{
                    width: "70px",
                    height: "70px",
                    animationDuration: "5s",
                    animationDirection: "reverse",
                  }}
                ></div>
                <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
              </div>

              <h3 className="text-xl font-semibold text-primary">
                Mervin Permit Advisor en acción
              </h3>
              <p className="text-muted-foreground text-center mt-4 max-w-md relative">
                Investigando regulaciones legales, permisos y normativas
                aplicables a tu proyecto en esta ubicación...
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
            <CardTitle>
              Resultados para {permitData.meta.projectType} en{" "}
              {permitData.meta.location}
            </CardTitle>
            <CardDescription>
              Información actualizada sobre requisitos legales para tu proyecto
            </CardDescription>
          </CardHeader>

          <div className="px-6 pt-2">
            <Alert className="mb-4 bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <AlertTitle className="text-primary">
                Análisis Completo
              </AlertTitle>
              <AlertDescription>
                {permitData.meta.projectTypeDescription
                  ? `Información específica para proyecto de ${permitData.meta.projectTypeDescription} en ${permitData.meta.fullAddress || permitData.meta.location}`
                  : `Información específica para proyecto de ${permitData.meta.projectType} en ${permitData.meta.location}`}
              </AlertDescription>
            </Alert>
          </div>

          <Tabs
            value={activeTab || "overview"}
            onValueChange={setActiveTab}
            className="mt-2"
          >
            <div className="px-6 pb-4">
              <TabsList className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
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

            <ScrollArea className="h-[500px] mt-4">
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
                        {permitData.requiredPermits &&
                        permitData.requiredPermits.length > 0 ? (
                          <div>
                            <p className="mb-2">
                              Se requieren {permitData.requiredPermits.length}{" "}
                              permisos para este proyecto.
                            </p>
                            <ul className="list-disc pl-5">
                              {permitData.requiredPermits
                                .slice(0, 3)
                                .map((permit, idx) => (
                                  <li key={idx} className="mb-1">
                                    {permit.name}
                                  </li>
                                ))}
                              {permitData.requiredPermits.length > 3 && (
                                <li className="text-muted-foreground">
                                  y {permitData.requiredPermits.length - 3}{" "}
                                  más...
                                </li>
                              )}
                            </ul>
                          </div>
                        ) : (
                          <p>
                            No se identificaron permisos específicos para este
                            proyecto.
                          </p>
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
                        ) : permitData.requiredPermits &&
                          permitData.requiredPermits.some(
                            (p) => p.averageCost,
                          ) ? (
                          <p>
                            Costos variables según los permisos específicos. Ver
                            detalles en la sección de costos.
                          </p>
                        ) : (
                          <p>
                            Información de costos no disponible. Se recomienda
                            contactar a la autoridad local.
                          </p>
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
                          <p>
                            El tiempo puede variar según la jurisdicción local.
                            Ver detalles en la sección de tiempos.
                          </p>
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
                        {permitData.specialConsiderations &&
                        permitData.specialConsiderations.length > 0 ? (
                          <ul className="list-disc pl-5">
                            {permitData.specialConsiderations
                              .slice(0, 3)
                              .map((consideration, idx) => (
                                <li key={idx} className="mb-1">
                                  {consideration}
                                </li>
                              ))}
                            {permitData.specialConsiderations.length > 3 && (
                              <li className="text-muted-foreground">
                                y {permitData.specialConsiderations.length - 3}{" "}
                                más...
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p>
                            No se identificaron consideraciones especiales para
                            este proyecto.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="permits" className="px-6 py-4">
                <h3 className="text-lg font-medium flex items-center mb-4">
                  <FileText className="mr-2 h-5 w-5 text-primary" />
                  Permisos Requeridos
                </h3>

                {permitData.requiredPermits &&
                permitData.requiredPermits.length > 0 ? (
                  <div className="space-y-6">
                    {permitData.requiredPermits.map((permit, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <CardHeader className="bg-primary/5 py-3">
                          <CardTitle className="text-base">
                            {permit.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Emitido por: {permit.issuingAuthority}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-primary/70" />
                                Tiempo estimado:
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {permit.estimatedTimeline}
                              </p>
                            </div>

                            {permit.averageCost && (
                              <div>
                                <h4 className="text-sm font-medium flex items-center">
                                  <DollarSign className="h-4 w-4 mr-1 text-primary/70" />
                                  Costo aproximado:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {permit.averageCost}
                                </p>
                              </div>
                            )}
                          </div>

                          {permit.description && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium">
                                Descripción:
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {permit.description}
                              </p>
                            </div>
                          )}

                          {permit.requirements && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium">
                                Requisitos:
                              </h4>
                              {Array.isArray(permit.requirements) ? (
                                <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-muted-foreground">
                                  {permit.requirements.map((req, idx) => (
                                    <li key={idx}>{req}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {permit.requirements}
                                </p>
                              )}
                            </div>
                          )}

                          {permit.url && (
                            <div className="mt-4 flex items-center text-primary text-sm">
                              <Link2 className="h-4 w-4 mr-1" />
                              <a
                                href={permit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center"
                              >
                                Más información
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-muted">
                    <AlertTitle>Sin permisos específicos</AlertTitle>
                    <AlertDescription>
                      No se identificaron permisos específicos para este tipo de
                      proyecto en esta ubicación. Aún así, se recomienda
                      consultar con la autoridad local para confirmar.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="licenses" className="px-6 py-4">
                <h3 className="text-lg font-medium flex items-center mb-4">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-primary" />
                  Licencias y Requisitos Profesionales
                </h3>

                {permitData.licenseRequirements &&
                permitData.licenseRequirements.length > 0 ? (
                  <div className="space-y-6">
                    {permitData.licenseRequirements.map((license, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <CardHeader className="bg-primary/5 py-3">
                          <CardTitle className="text-base">
                            {license.type}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium">
                                Proceso para obtener:
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {license.obtainingProcess}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium flex items-center">
                                <DollarSign className="h-4 w-4 mr-1 text-primary/70" />
                                Costos y tarifas:
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {license.fees}
                              </p>
                            </div>

                            {license.renewalInfo && (
                              <div>
                                <h4 className="text-sm font-medium flex items-center">
                                  <RefreshCw className="h-4 w-4 mr-1 text-primary/70" />
                                  Información de renovación:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {license.renewalInfo}
                                </p>
                              </div>
                            )}

                            {license.bondingInsurance && (
                              <div>
                                <h4 className="text-sm font-medium">
                                  Requisitos de fianza y seguro:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {license.bondingInsurance}
                                </p>
                              </div>
                            )}

                            {license.verificationProcess && (
                              <div>
                                <h4 className="text-sm font-medium">
                                  Proceso de verificación:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {license.verificationProcess}
                                </p>
                              </div>
                            )}

                            {license.url && (
                              <div className="mt-4 flex items-center text-primary text-sm">
                                <Link2 className="h-4 w-4 mr-1" />
                                <a
                                  href={license.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center"
                                >
                                  Más información
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-muted">
                    <AlertTitle>Sin requisitos específicos de licencia</AlertTitle>
                    <AlertDescription>
                      No se identificaron requisitos específicos de licencia profesional 
                      para este tipo de proyecto. Se recomienda verificar con la autoridad 
                      local para confirmar los requisitos específicos de contratistas.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="codes" className="px-6 py-4">
                <h3 className="text-lg font-medium flex items-center mb-4">
                  <Building2 className="mr-2 h-5 w-5 text-primary" />
                  Códigos y Regulaciones de Construcción
                </h3>

                {permitData.buildingCodeRegulations &&
                permitData.buildingCodeRegulations.length > 0 ? (
                  <div className="space-y-6">
                    {permitData.buildingCodeRegulations.map(
                      (regulation, idx) => (
                        <Card key={idx} className="overflow-hidden">
                          <CardHeader className="bg-primary/5 py-3">
                            <CardTitle className="text-base">
                              {regulation.type}
                            </CardTitle>
                            {regulation.codeReference && (
                              <CardDescription className="text-xs">
                                Referencia: {regulation.codeReference}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium">
                                  Detalles:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {regulation.details}
                                </p>
                              </div>

                              {regulation.restrictions && (
                                <div>
                                  <h4 className="text-sm font-medium">
                                    Restricciones:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {regulation.restrictions}
                                  </p>
                                </div>
                              )}

                              {regulation.measurements && (
                                <div>
                                  <h4 className="text-sm font-medium flex items-center">
                                    <Ruler className="h-4 w-4 mr-1 text-primary/70" />
                                    Medidas y dimensiones:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {regulation.measurements}
                                  </p>
                                </div>
                              )}

                              {regulation.applicableAreas && 
                                ((Array.isArray(regulation.applicableAreas) && regulation.applicableAreas.length > 0) || 
                                 (typeof regulation.applicableAreas === 'string' && regulation.applicableAreas !== '')) && (
                                  <div>
                                    <h4 className="text-sm font-medium">
                                      Áreas aplicables:
                                    </h4>
                                    <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-muted-foreground">
                                      {Array.isArray(regulation.applicableAreas) 
                                        ? regulation.applicableAreas.map(
                                            (area, idx) => (
                                              <li key={idx}>{area}</li>
                                            )
                                          )
                                        : regulation.applicableAreas && typeof regulation.applicableAreas === 'string'
                                          ? <li>{regulation.applicableAreas}</li>
                                          : <li>Información no disponible</li>
                                      }
                                    </ul>
                                  </div>
                                )}
                            </div>
                          </CardContent>
                        </Card>
                      ),
                    )}
                  </div>
                ) : (
                  <Alert className="bg-muted">
                    <AlertTitle>Sin códigos específicos</AlertTitle>
                    <AlertDescription>
                      No se identificaron códigos específicos para este tipo de
                      proyecto. Se recomienda consultar el código de construcción 
                      local para verificar requisitos generales.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="inspections" className="px-6 py-4">
                <h3 className="text-lg font-medium flex items-center mb-4">
                  <ListChecks className="mr-2 h-5 w-5 text-primary" />
                  Requisitos de Inspección
                </h3>

                {permitData.inspectionRequirements &&
                permitData.inspectionRequirements.length > 0 ? (
                  <div className="space-y-6">
                    {permitData.inspectionRequirements.map(
                      (inspection, idx) => (
                        <Card key={idx} className="overflow-hidden">
                          <CardHeader className="bg-primary/5 py-3">
                            <CardTitle className="text-base">
                              {inspection.type}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              {inspection.description && (
                                <div>
                                  <h4 className="text-sm font-medium">
                                    Descripción:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.description}
                                  </p>
                                </div>
                              )}

                              <div>
                                <h4 className="text-sm font-medium flex items-center">
                                  <Clock8 className="h-4 w-4 mr-1 text-primary/70" />
                                  Momento de la inspección:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {inspection.timing}
                                </p>
                              </div>

                              {inspection.schedulingProcess && (
                                <div>
                                  <h4 className="text-sm font-medium">
                                    Proceso para programar:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.schedulingProcess}
                                  </p>
                                </div>
                              )}

                              {inspection.preparationNeeded && (
                                <div>
                                  <h4 className="text-sm font-medium">
                                    Preparación necesaria:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.preparationNeeded}
                                  </p>
                                </div>
                              )}

                              {inspection.commonIssues && (
                                <div>
                                  <h4 className="text-sm font-medium">
                                    Problemas comunes:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.commonIssues}
                                  </p>
                                </div>
                              )}

                              {inspection.contactInfo && (
                                <div>
                                  <h4 className="text-sm font-medium flex items-center">
                                    <Phone className="h-4 w-4 mr-1 text-primary/70" />
                                    Información de contacto:
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.contactInfo}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ),
                    )}
                  </div>
                ) : (
                  <Alert className="bg-muted">
                    <AlertTitle>Sin requisitos específicos de inspección</AlertTitle>
                    <AlertDescription>
                      No se identificaron requisitos específicos de inspección para este tipo de
                      proyecto. Se recomienda consultar con la autoridad local para confirmar
                      los requisitos de inspección.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="process" className="px-6 py-4">
                <h3 className="text-lg font-medium flex items-center mb-4">
                  <HardHat className="mr-2 h-5 w-5 text-primary" />
                  Proceso de Permiso y Aprobación
                </h3>

                {permitData.process && permitData.process.length > 0 ? (
                  <div className="space-y-4">
                    <Alert className="bg-primary/5 border-primary/20">
                      <HardHat className="h-5 w-5 text-primary" />
                      <AlertTitle className="text-primary">
                        Proceso paso a paso
                      </AlertTitle>
                      <AlertDescription>
                        Los siguientes pasos detallan el proceso para la obtención de permisos
                        y las aprobaciones requeridas para tu proyecto.
                      </AlertDescription>
                    </Alert>

                    <div className="relative border-l-2 border-primary/30 ml-4 pl-8 pb-2 mt-6">
                      {permitData.process.map((step, idx) => {
                        // Verificar si el paso contiene información de responsabilidad
                        let responsibleParty = "Ambos";
                        let stepText = step;
                        
                        if (typeof step === "string") {
                          if (step.includes("(Propietario)")) {
                            responsibleParty = "Propietario";
                            stepText = step.replace("(Propietario)", "").trim();
                          } else if (step.includes("(Contratista)")) {
                            responsibleParty = "Contratista";
                            stepText = step.replace("(Contratista)", "").trim();
                          } else if (step.includes("(Ambos)")) {
                            responsibleParty = "Contractor/Owner";
                            stepText = step.replace("(Ambos)", "").trim();
                          }
                        }

                        return (
                          <li key={idx} className="ml-6 relative">
                            {/* Indicador de paso (círculo numerado) */}
                            <div
                              className={`absolute -left-12 flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                responsibleParty === "Propietario"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : responsibleParty === "Contratista"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            
                            {/* Línea vertical que conecta los pasos */}
                            {idx < permitData.process.length - 1 && (
                              <div
                                className="absolute -left-9 top-6 w-[1px] bg-dashed bg-primary/20"
                                style={{ height: "calc(100% - 10px)" }}
                              ></div>
                            )}
                            
                            {/* Contenido del paso */}
                            <div className={`rounded-lg border px-4 py-3 mb-5 ${
                              responsibleParty === "Propietario"
                                ? "border-yellow-200 bg-yellow-50"
                                : responsibleParty === "Contratista"
                                ? "border-blue-200 bg-blue-50"
                                : "border-primary/20 bg-primary/5"
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="text-sm">
                                  <p>{stepText}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-md ml-3 flex-shrink-0 ${
                                  responsibleParty === "Propietario"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : responsibleParty === "Contratista"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-primary/10 text-primary"
                                }`}>
                                  {responsibleParty}
                                </span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </div>

                    {/* Sección de cronograma */}
                    {permitData.timeline && (
                      <Card className="mt-6">
                        <CardHeader className="bg-primary/5 py-3">
                          <CardTitle className="text-md flex items-center">
                            <CalendarClock className="h-5 w-5 mr-2 text-primary" />
                            Información de Cronograma
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium">
                                Tiempo total estimado:
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {permitData.timeline.totalEstimatedTime}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium">
                                Elementos críticos:
                              </h4>
                              <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-muted-foreground">
                                {Array.isArray(permitData.timeline.criticalPathItems) 
                                  ? permitData.timeline.criticalPathItems.map(
                                      (item, idx) => (
                                        <li key={idx}>{item}</li>
                                      )
                                    )
                                  : permitData.timeline.criticalPathItems && typeof permitData.timeline.criticalPathItems === 'string'
                                    ? <li>{permitData.timeline.criticalPathItems}</li> 
                                    : <li>Información no disponible</li>
                                }
                              </ul>
                            </div>

                            {permitData.timeline.bestTimeToApply && (
                              <div>
                                <h4 className="text-sm font-medium">
                                  Mejor momento para aplicar:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {permitData.timeline.bestTimeToApply}
                                </p>
                              </div>
                            )}

                            {permitData.timeline.expirationPeriods && (
                              <div>
                                <h4 className="text-sm font-medium">
                                  Períodos de expiración:
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {permitData.timeline.expirationPeriods}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Sección de costos */}
                    {permitData.costAnalysis && (
                      <Card className="mt-4">
                        <CardHeader className="bg-primary/5 py-3">
                          <CardTitle className="text-md flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-primary" />
                            Análisis de Costos
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium">
                                Costo total estimado:
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {permitData.costAnalysis.totalEstimatedCost}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium">
                                Factores variables:
                              </h4>
                              <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-muted-foreground">
                                {Array.isArray(permitData.costAnalysis.variableFactors)
                                  ? permitData.costAnalysis.variableFactors.map(
                                      (factor, idx) => (
                                        <li key={idx}>{factor}</li>
                                      )
                                    )
                                  : permitData.costAnalysis.variableFactors && typeof permitData.costAnalysis.variableFactors === 'string'
                                    ? <li>{permitData.costAnalysis.variableFactors}</li>
                                    : <li>Información no disponible</li>
                                }
                              </ul>
                            </div>

                            {permitData.costAnalysis.feeScheduleUrl && (
                              <div className="mt-4 flex items-center text-primary text-sm">
                                <Link2 className="h-4 w-4 mr-1" />
                                <a
                                  href={permitData.costAnalysis.feeScheduleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center"
                                >
                                  Ver tabla de tarifas completa
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            )}

                            {permitData.costAnalysis.paymentMethods && (
                              <div>
                                <h4 className="text-sm font-medium">
                                  Métodos de pago aceptados:
                                </h4>
                                <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-muted-foreground">
                                  {Array.isArray(permitData.costAnalysis.paymentMethods)
                                    ? permitData.costAnalysis.paymentMethods.map(
                                        (method, idx) => (
                                          <li key={idx}>{method}</li>
                                        )
                                      )
                                    : permitData.costAnalysis.paymentMethods && typeof permitData.costAnalysis.paymentMethods === 'string'
                                      ? <li>{permitData.costAnalysis.paymentMethods}</li>
                                      : <li>Información no disponible</li>
                                  }
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Alert className="bg-muted">
                    <AlertTitle>Proceso no especificado</AlertTitle>
                    <AlertDescription>
                      No se ha detallado un proceso específico para este tipo de proyecto.
                      Se recomienda contactar a la oficina de permisos local para obtener
                      información detallada sobre el proceso de aprobación.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Contactos útiles */}
                {permitData.contactInformation &&
                permitData.contactInformation.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium flex items-center mb-4">
                      <Phone className="mr-2 h-5 w-5 text-primary" />
                      Contactos Importantes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permitData.contactInformation.map((contact, idx) => (
                        <Card key={idx}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm flex items-center">
                              {contact.department}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {contact.purpose}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="py-2">
                            <div className="text-sm space-y-2">
                              {contact.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-3.5 w-3.5 mr-2 text-primary/70" />
                                  <span>{typeof contact.phone === 'string' ? contact.phone : JSON.stringify(contact.phone)}</span>
                                </div>
                              )}
                              {contact.email && (
                                <div className="flex items-center">
                                  <Mail className="h-3.5 w-3.5 mr-2 text-primary/70" />
                                  <span>{typeof contact.email === 'string' ? contact.email : JSON.stringify(contact.email)}</span>
                                </div>
                              )}
                              {contact.address && (
                                <div className="flex items-center">
                                  <MapPin className="h-3.5 w-3.5 mr-2 text-primary/70" />
                                  <span>{typeof contact.address === 'string' ? contact.address : JSON.stringify(contact.address)}</span>
                                </div>
                              )}
                              {contact.hours && (
                                <div className="flex items-center">
                                  <Clock className="h-3.5 w-3.5 mr-2 text-primary/70" />
                                  <span>{typeof contact.hours === 'string' ? contact.hours : JSON.stringify(contact.hours)}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="px-6 py-4 bg-muted/40 mt-6">
            <div className="flex flex-col space-y-4">
              <div>
                <h3 className="text-sm font-medium flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-primary" />
                  Enlaces y Recursos Útiles
                </h3>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permitData.links && permitData.links.length > 0 ? (
                    permitData.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start p-2 bg-white rounded border hover:bg-primary/5 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium">{link.name}</div>
                          {link.description && (
                            <div className="text-xs text-muted-foreground">
                              {link.description}
                            </div>
                          )}
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground col-span-2">
                      No se han proporcionado enlaces específicos.
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-xs text-muted-foreground">
                  Información generada en: {permitData.meta.generated}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {permitData.meta.projectType}
                  </div>
                  <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {permitData.meta.location}
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium">Fuentes consultadas:</span>{" "}
                  {permitData.meta.sources.join(", ")}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Modal de historial de búsquedas común */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historial de Búsquedas
            </DialogTitle>
            <DialogDescription>
              Consulta y carga búsquedas anteriores para evitar realizar la misma búsqueda nuevamente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {historyQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Cargando historial de búsquedas...</p>
              </div>
            ) : historyQuery.isError ? (
              <div className="text-center p-4 border rounded-md bg-red-50">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <h3 className="font-medium">Error al cargar el historial</h3>
                <p className="text-sm text-muted-foreground">
                  {historyQuery.error instanceof Error ? historyQuery.error.message : 'Error desconocido'}
                </p>
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <div className="text-center p-8 border rounded-md bg-gray-50">
                <Info className="h-10 w-10 text-primary/50 mx-auto mb-2" />
                <h3 className="font-medium text-lg">No hay búsquedas previas</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Cuando realices consultas de permisos, se guardarán aquí para facilitar su acceso posterior.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {historyQuery.data.map((item) => (
                    <Card key={item.id} className="hover:bg-primary/5 transition-colors">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium block text-xs">Dirección:</span>
                            <span className="text-muted-foreground text-xs">{item.address}</span>
                          </div>
                          <div>
                            <span className="font-medium block text-xs">Tipo de proyecto:</span>
                            <span className="text-muted-foreground text-xs capitalize">{item.projectType}</span>
                          </div>
                          {item.projectDescription && (
                            <div className="col-span-2 mt-1">
                              <span className="font-medium block text-xs">Descripción:</span>
                              <span className="text-muted-foreground text-xs line-clamp-2">{item.projectDescription}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                          <div className="text-xs text-primary">
                            {item.results.requiredPermits.length} permisos encontrados
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            onClick={() => handleLoadHistoryItem(item)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Cargar resultados
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}