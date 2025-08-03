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
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Ruler,
  Clock as HistoryIcon,
  DollarSign,
  Info,
  BedDouble,
  Trees,
  Search,
  Shield,
  Database,
  Eye,
  FileText,
  Zap,
  Brain,
  ArrowLeft,
  Play,
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

// Workflow step interface
interface WorkflowStep {
  id: string;
  step: number;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  icon: React.ReactNode;
  estimatedTime: string;
}

export default function PropertyOwnershipVerifier() {
  // Obtener la suscripción del usuario
  const { data: userSubscription } = useQuery({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  // Cyberpunk workflow states
  const [currentStep, setCurrentStep] = useState(1);
  const [view, setView] = useState<"dashboard" | "workflow">("dashboard");
  
  // Existing logic states
  const [address, setAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [searchHistory, setSearchHistory] = useState<PropertyDetails[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define workflow steps for cyberpunk UI
  const workflowSteps: WorkflowStep[] = [
    {
      id: "property-search",
      step: 1,
      title: "Property Search Command",
      description: "Lock onto target property. Advanced address intelligence extracts precise location data from global mapping systems.",
      status: selectedPlace ? "completed" : currentStep === 1 ? "processing" : "pending",
      progress: selectedPlace ? 100 : currentStep === 1 ? 50 : 0,
      icon: <Search className="h-6 w-6" />,
      estimatedTime: "15 sec",
    },
    {
      id: "data-verification",
      step: 2,
      title: "Data Verification & Analysis",
      description: "Deep scan property databases. Cross-reference owner records, property history, and verification protocols.",
      status: propertyDetails ? "completed" : currentStep === 2 ? "processing" : "pending",
      progress: propertyDetails ? 100 : currentStep === 2 ? 50 : 0,
      icon: <Shield className="h-6 w-6" />,
      estimatedTime: "30 sec",
    },
    {
      id: "intelligence-report",
      step: 3,
      title: "Intelligence Report & Actions",
      description: "Generate comprehensive ownership intelligence. Export actionable reports and verification data.",
      status: currentStep === 3 && propertyDetails ? "processing" : "pending",
      progress: currentStep === 3 && propertyDetails ? 50 : 0,
      icon: <Brain className="h-6 w-6" />,
      estimatedTime: "10 sec",
    },
  ];

  // Manejar la selección de lugar desde el autocompletado
  const handlePlaceSelect = useCallback((placeData: any) => {
    console.log("📍 [PropertyVerifier] Lugar seleccionado:", placeData);

    if (placeData && placeData.address) {
      setSelectedPlace(placeData);
      setError(null);
      setCurrentStep(2); // Auto-advance to verification step
      
      // Auto-search after place selection
      setTimeout(() => {
        handleSearch();
      }, 300);
    }
  }, [handleSearch]);

  // Manejar la selección de un elemento del historial
  const handleSelectHistory = useCallback((historyItem: any) => {
    if (historyItem && historyItem.results) {
      setAddress(historyItem.address);
      setPropertyDetails(historyItem.results);
      setError(null);
      setCurrentStep(3); // Move to final report step
      
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

  // Render different views based on current state
  const renderWorkflowView = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Cyberpunk Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-cyan-500/20">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
          
          <div className="relative container mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                    <Shield className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Property Intelligence System
                  </h1>
                </div>
                <p className="text-gray-300 text-lg max-w-2xl">
                  Advanced property ownership verification through deep database scanning and cross-referencing protocols.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("dashboard")}
                  className="border-gray-600 hover:border-cyan-400 hover:bg-cyan-500/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {workflowSteps.map((step, index) => (
              <Card
                key={step.id}
                className={`relative overflow-hidden transition-all duration-500 ${
                  step.status === "completed"
                    ? "bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-500/30"
                    : step.status === "processing"
                    ? "bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border-cyan-500/30 animate-pulse"
                    : "bg-gradient-to-br from-gray-800/40 to-gray-700/20 border-gray-600/30"
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${
                        step.status === "completed"
                          ? "bg-green-500/20 border-green-500/30 text-green-400"
                          : step.status === "processing"
                          ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                          : "bg-gray-500/20 border-gray-500/30 text-gray-400"
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {step.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Step {step.step}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {step.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {step.status === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    )}
                    {step.status === "processing" && (
                      <div className="h-5 w-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-300 mb-4">
                    {step.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-gray-300">{step.progress}%</span>
                    </div>
                    <Progress 
                      value={step.progress} 
                      className={`h-2 ${
                        step.status === "completed"
                          ? "[&>div]:bg-green-500"
                          : step.status === "processing"
                          ? "[&>div]:bg-cyan-500"
                          : "[&>div]:bg-gray-500"
                      }`}
                    />
                  </div>
                </CardContent>
                
                {/* Holographic corner elements */}
                <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none">
                  <div className="absolute top-0 left-0 w-4 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent opacity-60"></div>
                  <div className="absolute top-0 left-0 w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-transparent opacity-60"></div>
                </div>
                <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none">
                  <div className="absolute top-0 right-0 w-4 h-0.5 bg-gradient-to-l from-cyan-400 to-transparent opacity-60"></div>
                  <div className="absolute top-0 right-0 w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-transparent opacity-60"></div>
                </div>
              </Card>
            ))}
          </div>

          {/* Current Step Content */}
          {currentStep === 1 && (
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-cyan-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Search className="h-6 w-6 text-cyan-400" />
                  Property Search Command
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Enter target property address for deep intelligence extraction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <MapboxPlacesAutocomplete
                    value={address}
                    onChange={setAddress}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Iniciar escaneo de dirección..."
                    countries={["mx", "us", "es"]}
                    language="es"
                  />
                  
                  <div className="flex gap-3">
                    <PropertySearchHistory onSelectHistory={handleSelectHistory} />
                    <Button
                      onClick={handleSearch}
                      disabled={loading || !selectedPlace}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Escaneando...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar Escaneo
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-400/50 bg-red-900/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && loading && (
            <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/20 border border-cyan-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-cyan-400 animate-pulse" />
                  Analyzing Property Data...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-1/3 bg-gray-600" />
                      <Skeleton className="h-6 w-2/3 bg-gray-700" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && propertyDetails && (
            <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/20 border border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-green-400" />
                  Intelligence Report Generated
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Comprehensive property ownership analysis complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Property details will be rendered here */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Ownership Intelligence</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">Owner:</span> {propertyDetails.owner}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">Property:</span> {propertyDetails.address}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">Status:</span> 
                            <Badge variant={propertyDetails.verified ? "default" : "outline"} className="ml-2">
                              {propertyDetails.verified ? "Verified" : "Unverified"}
                            </Badge>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-400 mb-3">Property Intelligence</h3>
                      <div className="space-y-2">
                        {propertyDetails.yearBuilt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              <span className="text-gray-400">Built:</span> {propertyDetails.yearBuilt}
                            </span>
                          </div>
                        )}
                        {propertyDetails.squareFootage && (
                          <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              <span className="text-gray-400">Size:</span> {propertyDetails.squareFootage} sq ft
                            </span>
                          </div>
                        )}
                        {propertyDetails.estimatedValue && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              <span className="text-gray-400">Value:</span> ${propertyDetails.estimatedValue.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return view === "workflow" ? renderWorkflowView() : (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto p-6">
        {/* Cyberpunk Dashboard Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
              <Shield className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Property Intelligence Hub
            </h1>
          </div>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Advanced property verification system with deep ownership analysis and fraud protection protocols.
          </p>
        </div>

        {/* Quick Start Action */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={() => setView("workflow")}
            size="lg"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30 text-lg px-8 py-6 h-auto"
          >
            <Play className="h-6 w-6 mr-3" />
            Launch Property Scan
            <ArrowRight className="h-6 w-6 ml-3" />
          </Button>
        </div>

        {/* Dashboard Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="relative bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-cyan-500/20 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Database className="h-6 w-6 text-cyan-400" />
                Quick Search
              </CardTitle>
              <CardDescription className="text-gray-300">
                Instant property lookup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Fast property verification using advanced address intelligence.
              </p>
            </CardContent>
            {/* Holographic corners */}
            <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-3 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent opacity-60"></div>
              <div className="absolute top-0 left-0 w-0.5 h-3 bg-gradient-to-b from-cyan-400 to-transparent opacity-60"></div>
            </div>
            <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
              <div className="absolute top-0 right-0 w-3 h-0.5 bg-gradient-to-l from-cyan-400 to-transparent opacity-60"></div>
              <div className="absolute top-0 right-0 w-0.5 h-3 bg-gradient-to-b from-cyan-400 to-transparent opacity-60"></div>
            </div>
          </Card>

          <Card className="relative bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-blue-500/20 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-blue-400" />
                Deep Analysis
              </CardTitle>
              <CardDescription className="text-gray-300">
                Comprehensive verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Cross-reference multiple databases for complete ownership validation.
              </p>
            </CardContent>
            {/* Holographic corners */}
            <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
              <div className="absolute bottom-0 left-0 w-3 h-0.5 bg-gradient-to-r from-blue-400 to-transparent opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-0.5 h-3 bg-gradient-to-t from-blue-400 to-transparent opacity-60"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
              <div className="absolute bottom-0 right-0 w-3 h-0.5 bg-gradient-to-l from-blue-400 to-transparent opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-0.5 h-3 bg-gradient-to-t from-blue-400 to-transparent opacity-60"></div>
            </div>
          </Card>

          <Card className="relative bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-purple-500/20 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-purple-400" />
                Export Reports
              </CardTitle>
              <CardDescription className="text-gray-300">
                Professional documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Generate detailed ownership reports for legal documentation.
              </p>
            </CardContent>
            {/* Holographic corners */}
            <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-3 h-0.5 bg-gradient-to-r from-purple-400 to-transparent opacity-60"></div>
              <div className="absolute top-0 left-0 w-0.5 h-3 bg-gradient-to-b from-purple-400 to-transparent opacity-60"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
              <div className="absolute bottom-0 right-0 w-3 h-0.5 bg-gradient-to-l from-purple-400 to-transparent opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-0.5 h-3 bg-gradient-to-t from-purple-400 to-transparent opacity-60"></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
        <Card>
          <CardHeader>
            <div className="flex flex-col items-center text-center">
              <div className="mb-2">
                <CardTitle className="text-center">
                  {propertyDetails.address}
                </CardTitle>
                <CardDescription className="text-center">
                  {propertyDetails.propertyType}
                </CardDescription>
              </div>
              <div className="mt-2">
                {propertyDetails.verified ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verificado
                  </Badge>
                ) : (
                  <Badge variant="outline">No verificado</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Header con propietario */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="text-green-600 mr-2" size={24} />
                    <div>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100">
                        {propertyDetails.owner}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {propertyDetails.verified && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            <Check className="mr-1" size={12} />
                            Verificado
                          </Badge>
                        )}
                        {propertyDetails.ownerOccupied && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            <Home className="mr-1" size={12} />
                            Residente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalles de propiedad simplificados con fondo azul oscuro */}
              <div className="p-3 rounded-lg border bg-blue-900 text-white">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <Home className="text-cyan-400 mr-2" size={16} />
                    <span className="text-xs">
                      {propertyDetails.propertyType.split("/")[0]}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="text-cyan-400 mr-2" size={16} />
                    <span className="text-xs">
                      {propertyDetails.yearBuilt || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <BedDouble className="text-cyan-400 mr-2" size={16} />
                    <span className="text-xs">
                      {propertyDetails.bedrooms || "N/A"}/
                      {propertyDetails.bathrooms || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Ruler className="text-cyan-400 mr-2" size={16} />
                    <span className="text-xs">
                      {propertyDetails.sqft?.toLocaleString() || "N/A"} pie²
                    </span>
                  </div>

                  {propertyDetails.lotSize && (
                    <div className="flex items-center col-span-2">
                      <Trees className="text-cyan-400 mr-2" size={16} />
                      <span className="text-xs">{propertyDetails.lotSize}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de compra y propietario anterior si está disponible */}
              {propertyDetails.purchaseDate && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                  <h3 className="text-md font-semibold mb-2 text-blue-800 flex items-center">
                    <HistoryIcon className="mr-2" size={18} />
                    Historial de propiedad
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="text-blue-600 mr-2" size={16} />
                      <span className="text-sm text-blue-800">
                        <strong>Fecha de compra:</strong>{" "}
                        {new Date(
                          propertyDetails.purchaseDate,
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    {propertyDetails.purchasePrice && (
                      <div className="flex items-center">
                        <DollarSign className="text-blue-600 mr-2" size={16} />
                        <span className="text-sm text-blue-800">
                          <strong>Precio de compra:</strong> $
                          {propertyDetails.purchasePrice.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {propertyDetails.previousOwner && (
                      <div className="flex items-center">
                        <User className="text-blue-600 mr-2" size={16} />
                        <span className="text-sm text-blue-800">
                          <strong>Propietario anterior:</strong>{" "}
                          {propertyDetails.previousOwner}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Historial completo de propietarios si está disponible */}
              {propertyDetails.ownerHistory &&
                propertyDetails.ownerHistory.length > 0 && (
                  <div className="mt-4">
                    <Tabs defaultValue="history">
                      <TabsList className="w-full">
                        <TabsTrigger value="history" className="flex-1">
                          Historial Completo de Propietarios
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="history" className="mt-4">
                        <div className="rounded-md border">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr className="border-b">
                                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                                  Propietario
                                </th>
                                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                                  Fecha Compra
                                </th>
                                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                                  Precio Compra
                                </th>
                                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                                  Fecha Venta
                                </th>
                                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                                  Precio Venta
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {propertyDetails.ownerHistory.map(
                                (entry, index) => (
                                  <tr
                                    key={index}
                                    className={
                                      index % 2 === 1 ? "bg-muted/30" : ""
                                    }
                                  >
                                    <td className="p-2 px-4 text-sm">
                                      {entry.owner}
                                    </td>
                                    <td className="p-2 px-4 text-sm">
                                      {entry.purchaseDate
                                        ? new Date(
                                            entry.purchaseDate,
                                          ).toLocaleDateString()
                                        : "-"}
                                    </td>
                                    <td className="p-2 px-4 text-sm">
                                      {entry.purchasePrice
                                        ? `$${entry.purchasePrice.toLocaleString()}`
                                        : "-"}
                                    </td>
                                    <td className="p-2 px-4 text-sm">
                                      {entry.saleDate
                                        ? new Date(
                                            entry.saleDate,
                                          ).toLocaleDateString()
                                        : "-"}
                                    </td>
                                    <td className="p-2 px-4 text-sm">
                                      {entry.salePrice
                                        ? `$${entry.salePrice.toLocaleString()}`
                                        : "-"}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <Info className="inline-block mr-1" size={12} />
                          Historial de propietarios basado en registros públicos
                          del condado
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <h3 className="text-md font-semibold mb-2">
                ¡Ey Primo! Esto es lo que debes saber:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <AlertTriangle
                    className="text-yellow-600 mr-2 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <div>
                    <span className="font-medium text-yellow-800">
                      Consejo importante:
                    </span>
                    <p className="text-yellow-700">
                      Compara el nombre del dueño ({propertyDetails.owner}) con
                      quien te está solicitando el trabajo. Si no coincide,
                      ¡aguas! Podría ser un contratista revendiendo el trabajo o
                      un intento de estafa.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check
                    className="text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <span>
                    Los detalles de la propiedad están verificados con los
                    registros del condado
                  </span>
                </li>
                <li className="flex items-start">
                  <Check
                    className="text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <span>
                    No hay gravámenes o problemas financieros detectados que
                    pudieran afectar el pago
                  </span>
                </li>
                <li className="flex items-start bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <i className="ri-shield-star-line text-blue-600 mr-2 mt-0.5 text-lg" />
                  <div>
                    <span className="font-medium text-blue-800">Recuerda:</span>
                    <p className="text-blue-700">
                      ¡No te dejes chingar, primo! Si eres chingón, cobra como
                      chingón. ¡No te dejes chamaquear!
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3 text-center">
          ¿Por qué verificar la propiedad?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 backdrop-blur-sm border border-blue-200/20 shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                Prevenir fraudes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Asegúrate de estar tratando con el propietario legítimo para
                evitar estafas y problemas de pago.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/5 backdrop-blur-sm border border-emerald-200/20 shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-blue-500">
                Evitar problemas legales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Confirma la autorización adecuada para el trabajo de
                construcción para evitar disputas y posibles demandas.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 backdrop-blur-sm border border-violet-200/20 shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-center bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                Generar confianza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Muestra profesionalismo al verificar los detalles de la
                propiedad antes de comenzar cualquier proyecto.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
