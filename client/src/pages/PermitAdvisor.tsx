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
  MapPin,
  ExternalLink,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Building,
  ArrowLeft,
  Info,
  RotateCcw,
  BookOpen,
  Home,
  History,
  RefreshCw,
} from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";

// Tipos básicos para el componente
interface PermitData {
  name: string;
  issuingAuthority: string;
  estimatedTimeline: string;
  averageCost?: string;
  description?: string;
  requirements?: string;
  url?: string;
}

interface SearchHistoryItem {
  id: number;
  userId: number;
  address: string;
  projectType: string;
  projectDescription?: string;
  title: string;
  results: any;
  createdAt: string;
}

interface PermitResponse {
  requiredPermits: PermitData[];
  specialConsiderations: string[];
  process: string[];
  meta: {
    sources: string[];
    generated: string;
    projectType: string;
    location: string;
    fullAddress?: string;
  };
  [key: string]: any;
}

// Componente principal
export default function PermitAdvisor() {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [projectType, setProjectType] = useState("fence");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [activeTab, setActiveTab] = useState("permits");
  const [showHistory, setShowHistory] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(true);
  const [projectDescription, setProjectDescription] = useState("");

  // Mutación para buscar permisos
  const permitMutation = useMutation({
    mutationFn: async (data: {
      address: string;
      projectType: string;
      projectDescription?: string;
    }) => {
      return apiRequest("/api/permit/search", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setPermitData(data);
      setShowSearchForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/permit/history'] });
      toast({
        title: "Consulta exitosa",
        description: "Se encontró información de permisos para tu proyecto.",
      });
    },
    onError: (error: any) => {
      console.error('Error en consulta de permisos:', error);
      toast({
        title: "Error en la consulta",
        description: error.message || "No se pudo obtener información de permisos.",
        variant: "destructive",
      });
    },
  });

  // Consulta para obtener el historial
  const historyQuery = useQuery({
    queryKey: ['/api/permit/history'],
    queryFn: async () => {
      const response = await fetch('/api/permit/history');
      if (!response.ok) {
        throw new Error('Error al obtener el historial de búsquedas');
      }
      return response.json() as Promise<SearchHistoryItem[]>;
    },
    enabled: true,
  });

  // Handler para el autocompletado de Mapbox
  const handlePlaceSelect = (placeData: any) => {
    if (placeData?.place_name) {
      setAddress(placeData.place_name);
    }
  };

  // Handler para la búsqueda
  const handleSearch = () => {
    if (!address.trim()) {
      toast({
        title: "Dirección requerida",
        description: "Por favor ingresa una dirección para continuar.",
        variant: "destructive",
      });
      return;
    }

    permitMutation.mutate({
      address: address.trim(),
      projectType,
      projectDescription: projectDescription.trim() || undefined,
    });
  };

  // Handler para volver al formulario
  const handleBackToSearch = () => {
    setShowSearchForm(true);
  };

  // Handler para cargar un elemento del historial
  const handleLoadHistoryItem = (item: SearchHistoryItem) => {
    setAddress(item.address);
    setProjectType(item.projectType);
    setProjectDescription(item.projectDescription || "");
    setPermitData(item.results);
    setShowHistory(false);
    setShowSearchForm(false);
    toast({
      title: "Búsqueda cargada",
      description: `Se cargó la búsqueda: ${item.title}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏗️ Asesor de Permisos de Construcción
          </h1>
          <p className="text-lg text-gray-600">
            Obtén información detallada sobre permisos y regulaciones para tu proyecto
          </p>
        </div>

        {/* Formulario de búsqueda */}
        {showSearchForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Información del Proyecto
              </CardTitle>
              <CardDescription>
                Ingresa los detalles de tu proyecto para obtener información específica sobre permisos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Botón de historial */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Ver Historial
                </Button>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="address">Dirección del Proyecto</Label>
                <MapboxPlacesAutocomplete
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Ingresa la dirección del proyecto"
                  countries={["mx", "us", "es"]}
                  language="es"
                />
              </div>

              {/* Tipo de proyecto */}
              <div className="space-y-2">
                <Label htmlFor="projectType">Tipo de Proyecto</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fence">Cerca/Valla</SelectItem>
                    <SelectItem value="addition">Adición a la Casa</SelectItem>
                    <SelectItem value="deck">Terraza/Deck</SelectItem>
                    <SelectItem value="pool">Piscina</SelectItem>
                    <SelectItem value="shed">Cobertizo</SelectItem>
                    <SelectItem value="garage">Garaje</SelectItem>
                    <SelectItem value="renovation">Renovación</SelectItem>
                    <SelectItem value="driveway">Entrada de Autos</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción del proyecto */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción del Proyecto (Opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe los detalles específicos de tu proyecto..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSearch}
                disabled={permitMutation.isPending}
                className="w-full"
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
        )}

        {/* Resultados */}
        {permitData && !showSearchForm && (
          <div className="space-y-6">
            {/* Header de resultados */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBackToSearch}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Nueva Búsqueda
              </Button>
              <div className="text-right">
                <h2 className="text-lg font-semibold">Resultados para:</h2>
                <p className="text-sm text-muted-foreground">{permitData.meta?.location}</p>
              </div>
            </div>

            {/* Contenido de resultados */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Permisos</CardTitle>
                <CardDescription>
                  Proyecto: {permitData.meta?.projectType} en {permitData.meta?.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="permits">Permisos</TabsTrigger>
                    <TabsTrigger value="process">Proceso</TabsTrigger>
                    <TabsTrigger value="considerations">Consideraciones</TabsTrigger>
                  </TabsList>

                  <TabsContent value="permits" className="space-y-4">
                    {permitData.requiredPermits && permitData.requiredPermits.length > 0 ? (
                      <div className="space-y-4">
                        {permitData.requiredPermits.map((permit: PermitData, idx: number) => (
                          <Card key={idx}>
                            <CardHeader>
                              <CardTitle className="text-lg">{permit.name}</CardTitle>
                              <CardDescription>{permit.issuingAuthority}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Tiempo Estimado</h4>
                                  <p className="text-sm">{permit.estimatedTimeline}</p>
                                </div>
                                {permit.averageCost && (
                                  <div>
                                    <h4 className="font-medium mb-2">Costo Promedio</h4>
                                    <p className="text-sm">{permit.averageCost}</p>
                                  </div>
                                )}
                                {permit.description && (
                                  <div className="col-span-1 md:col-span-2">
                                    <h4 className="font-medium mb-2">Descripción</h4>
                                    <p className="text-sm">{permit.description}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No se requieren permisos específicos</h3>
                        <p className="text-muted-foreground">
                          Según la información disponible, tu proyecto puede no requerir permisos especiales.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="process" className="space-y-4">
                    {permitData.process && permitData.process.length > 0 ? (
                      <div className="space-y-3">
                        {permitData.process.map((step: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {idx + 1}
                            </div>
                            <p className="text-sm">{step}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">Proceso no especificado</h3>
                        <p className="text-muted-foreground">
                          Consulta con las autoridades locales para obtener información específica del proceso.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="considerations" className="space-y-4">
                    {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                      <div className="space-y-3">
                        {permitData.specialConsiderations.map((consideration: string, idx: number) => (
                          <Alert key={idx}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{consideration}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">Sin consideraciones especiales</h3>
                        <p className="text-muted-foreground">
                          No se identificaron consideraciones especiales para tu proyecto.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de historial */}
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
                  <p className="text-sm text-muted-foreground">Cargando historial...</p>
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
                              <span className="font-medium block text-xs">Tipo:</span>
                              <span className="text-muted-foreground text-xs">{item.projectType}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => handleLoadHistoryItem(item)}
                          >
                            Cargar Búsqueda
                          </Button>
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
    </div>
  );
}