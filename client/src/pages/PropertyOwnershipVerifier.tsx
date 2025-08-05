import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Home,
  Check,
  User,
  Users,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Ruler,
  Clock as HistoryIcon,
  DollarSign,
  Info,
  BedDouble as Bed,
  Trees,
  Search,
  Shield,
  Database,
  Eye,
  FileText,
  Download,
  Building,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import {
  propertyVerifierService,
  PropertyDetails,
  OwnerHistoryEntry,
} from "@/services/propertyVerifierService";
import PropertySearchHistory from "@/components/property/PropertySearchHistory";
import { useQueryClient } from "@tanstack/react-query";

// Simple step tracking
interface Step {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function PropertyOwnershipVerifier() {
  // Obtener la suscripción del usuario
  const { data: userSubscription } = useQuery({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Simple states
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [activeTab, setActiveTab] = useState("search");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define simple 3-step flow
  const steps: Step[] = [
    {
      number: 1,
      title: "Property Address",
      description: "Enter or select the property address",
      icon: <MapPin className="h-5 w-5" />,
      completed: !!selectedPlace,
    },
    {
      number: 2,
      title: "Run Ownership",
      description: "Verify ownership and property details",
      icon: <Search className="h-5 w-5" />,
      completed: !!propertyDetails,
    },
    {
      number: 3,
      title: "Export Results",
      description: "Export ownership and property details",
      icon: <Download className="h-5 w-5" />,
      completed: false,
    },
  ];

  // Main search function
  const handleSearch = useCallback(async () => {
    if (!selectedPlace || !selectedPlace.address) {
      setError("Por favor, selecciona una dirección válida del autocompletado.");
      return;
    }

    setLoading(true);
    setError(null);
    setPropertyDetails(null);
    setCurrentStep(2);

    try {
      const addressComponents = selectedPlace.context || {};
      
      const searchParams = {
        address: selectedPlace.address,
        city: addressComponents.city,
        state: addressComponents.state || addressComponents.region,
        zip: addressComponents.zipcode || addressComponents.postcode,
        country: addressComponents.country,
        coordinates: selectedPlace.coordinates,
        fullContext: selectedPlace.context
      };

      const response = await propertyVerifierService.verifyProperty(
        searchParams.address,
        searchParams
      );

      setPropertyDetails(response);
      setCurrentStep(3);
      
      queryClient.invalidateQueries({ queryKey: ["/api/property/history"] });

      toast({
        title: "✅ Verificación Completada",
        description: "Los datos de la propiedad han sido obtenidos exitosamente.",
      });
    } catch (err: any) {
      setError(err.message || "Error al verificar la propiedad. Por favor, intenta nuevamente.");
      toast({
        title: "❌ Error de Verificación",
        description: err.message || "No se pudo completar la verificación de la propiedad.",
        variant: "destructive",
      });
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  }, [selectedPlace, queryClient, toast]);

  // Manejar la selección de lugar desde el autocompletado
  const handlePlaceSelect = useCallback((placeData: any) => {
    console.log("📍 [PropertyVerifier] Lugar seleccionado:", placeData);

    if (placeData && placeData.address) {
      setSelectedPlace(placeData);
      setError(null);
      setAddress(placeData.address);
    }
  }, []);

  // Manejar la selección de un elemento del historial
  const handleSelectHistory = useCallback((historyItem: any) => {
    if (historyItem && historyItem.results) {
      setAddress(historyItem.address);
      setPropertyDetails(historyItem.results);
      setError(null);
      setCurrentStep(3);
      setActiveTab("search");
      
      toast({
        title: "Historial cargado",
        description: `Cargada información de: ${historyItem.address}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No se pudieron cargar los datos del historial",
      });
    }
  }, [toast]);

  // Export property details
  const handleExportReport = useCallback(() => {
    if (!propertyDetails) return;
    
    const reportData = {
      property: propertyDetails,
      exportDate: new Date().toISOString(),
      searchedAddress: address,
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `property-report-${propertyDetails.address?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "✅ Reporte Exportado",
      description: "El reporte de propiedad ha sido descargado exitosamente.",
    });
  }, [propertyDetails, address, toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-6xl">
        {/* Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Building className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                Property Ownership Verifier
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed">
            Verificación profesional de propiedad y análisis de titularidad para proyectos legales y de construcción.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="search" className="text-xs sm:text-sm py-2 sm:py-3">
              <span className="hidden sm:inline">Verificación de Propiedad</span>
              <span className="sm:hidden">Verificación</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm py-2 sm:py-3">
              <span className="hidden sm:inline">Historial de Búsquedas</span>
              <span className="sm:hidden">Historial</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 sm:space-y-6">
            {/* Simple Search Interface - Mobile Optimized */}
            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Verificación de Propiedad</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Ingrese la dirección para verificar información de propiedad y titularidad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full">
                  <MapboxPlacesAutocomplete
                    value={address}
                    onChange={setAddress}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Ingrese la dirección de la propiedad..."
                    countries={["mx", "us", "es"]}
                    language="es"
                    className="w-full"
                  />
                </div>
                
                <Button
                  onClick={handleSearch}
                  disabled={loading || !selectedPlace}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      <span className="text-sm sm:text-base">Verificando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      <span className="text-sm sm:text-base">Verificar Propiedad</span>
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm break-words">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Results - Futuristic Holographic Design */}
            {propertyDetails && (
              <div className="space-y-4 sm:space-y-6">
                {/* Success Header - Mobile Optimized */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-xl blur-sm md:blur-md"></div>
                  <Card className="relative border-2 border-cyan-400/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        <div className="relative flex-shrink-0">
                          <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400 animate-pulse" />
                          <div className="absolute inset-0 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-green-400/20 animate-ping"></div>
                        </div>
                        <div className="text-center sm:text-left">
                          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            Verificación Completada
                          </h2>
                          <p className="text-slate-400 text-xs sm:text-sm mt-1">Datos extraídos de ATTOM Data API</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Ownership Information - Mobile Optimized */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 sm:from-cyan-500/30 to-blue-500/20 sm:to-blue-500/30 rounded-xl blur-sm sm:blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <Card className="relative border-2 border-cyan-400/60 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm hover:border-cyan-300/80 transition-all duration-300">
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="flex items-center gap-2 sm:gap-3">
                          <div className="relative">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                            <div className="absolute inset-0 h-5 w-5 sm:h-6 sm:w-6 bg-cyan-400/20 rounded-full animate-pulse"></div>
                          </div>
                          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-bold text-sm sm:text-base">
                            Información de Titularidad
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="group/item">
                            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition-colors">
                              <Users className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Propietario(s)</div>
                                <div className="text-white font-medium mt-1 text-sm sm:text-base break-words">{propertyDetails.owner}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="group/item">
                            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition-colors">
                              <MapPin className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dirección</div>
                                <div className="text-white font-medium mt-1 text-sm sm:text-base break-words leading-relaxed">{propertyDetails.address}</div>
                              </div>
                            </div>
                          </div>

                          <div className="group/item">
                            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition-colors">
                              <Shield className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estado de Verificación</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant={propertyDetails.verified ? "default" : "outline"} 
                                    className={`text-xs ${propertyDetails.verified 
                                      ? "bg-green-500/20 text-green-400 border-green-500/50" 
                                      : "bg-red-500/20 text-red-400 border-red-500/50"
                                    }`}
                                  >
                                    {propertyDetails.verified ? "✓ Verificado" : "⚠ No Verificado"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Property Details - Mobile Optimized */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 sm:from-purple-500/30 to-pink-500/20 sm:to-pink-500/30 rounded-xl blur-sm sm:blur-md group-hover:blur-lg transition-all duration-300"></div>
                    <Card className="relative border-2 border-purple-400/60 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm hover:border-purple-300/80 transition-all duration-300">
                      <CardHeader className="pb-2 sm:pb-3">
                        <CardTitle className="flex items-center gap-2 sm:gap-3">
                          <div className="relative">
                            <Home className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                            <div className="absolute inset-0 h-5 w-5 sm:h-6 sm:w-6 bg-purple-400/20 rounded-full animate-pulse"></div>
                          </div>
                          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-sm sm:text-base">
                            Detalles de la Propiedad
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4">
                        <div className="space-y-2 sm:space-y-3">
                          {propertyDetails.yearBuilt && (
                            <div className="group/item">
                              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                                <Calendar className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Año de Construcción</div>
                                  <div className="text-white font-medium mt-1 text-sm sm:text-base">{propertyDetails.yearBuilt}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {propertyDetails.sqft && (
                            <div className="group/item">
                              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                                <Ruler className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Área Total</div>
                                  <div className="text-white font-medium mt-1 text-sm sm:text-base">{propertyDetails.sqft.toLocaleString()} pies²</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {propertyDetails.bedrooms > 0 && (
                            <div className="group/item">
                              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                                <Bed className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Habitaciones</div>
                                  <div className="text-white font-medium mt-1 text-sm sm:text-base">{propertyDetails.bedrooms} dormitorios</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {propertyDetails.purchasePrice && (
                            <div className="group/item">
                              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                                <DollarSign className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Precio de Compra</div>
                                  <div className="text-white font-medium mt-1 text-sm sm:text-base">${propertyDetails.purchasePrice.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-slate-600/20 rounded-xl blur-sm"></div>
                  <Card className="relative border border-slate-600/50 bg-slate-900/90 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                        <Button 
                          onClick={handleExportReport}
                          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          <span className="text-sm">Exportar Reporte</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setCurrentStep(1);
                            setPropertyDetails(null);
                            setSelectedPlace(null);
                            setAddress("");
                            setError(null);
                          }}
                          className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto"
                          size="sm"
                        >
                          <span className="text-sm">Nueva Verificación</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <HistoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span className="truncate">Historial de Verificaciones</span>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Historial de todas las verificaciones de propiedad realizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PropertySearchHistory onSelectHistory={handleSelectHistory} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}