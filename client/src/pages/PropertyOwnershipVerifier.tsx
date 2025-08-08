import { useState, useEffect, useCallback, useMemo } from "react";
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
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Ruler,
  Clock as HistoryIcon,
  Clock,
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
  Scan,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import {
  propertyVerifierService,
  PropertyDetails,
  OwnerHistoryEntry,
} from "@/services/propertyVerifierService";
// Removed PropertySearchHistory import - implementing directly
import { useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

// Simple step tracking
interface Step {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

// History interface for direct implementation
interface PropertySearchHistoryItem {
  id: number;
  userId: number;
  address: string;
  ownerName: string | null;
  parcelNumber: string | null;
  results: any;
  title: string | null;
  notes: string | null;
  tags: string[] | null;
  isFavorite: boolean;
  createdAt: string;
}

export default function PropertyOwnershipVerifier() {
  // 🛡️ PERMISOS: Sistema de permisos integrado
  const permissions = usePermissions();
  const { canUse, getRemainingUsage, isLimitReached, showUpgradeModal, incrementUsage, userPlan } = permissions;

  // Simple states
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [activeTab, setActiveTab] = useState("search");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🔍 PERMISOS: Obtener información de uso para Property Verifications
  const remaining = getRemainingUsage('propertyVerifications');
  const isLimited = isLimitReached('propertyVerifications');
  const canSearch = canUse('propertyVerifications');

  // Load property history
  const { data: historyItems = [], isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: ['/api/property/history'],
    staleTime: 30000,
  });

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

  // 🛡️ MAIN SEARCH FUNCTION WITH PERMISSION SYSTEM
  const handleSearch = useCallback(async () => {
    // 🔒 VERIFICAR PERMISOS ANTES DE LA BÚSQUEDA
    if (!canSearch) {
      showUpgradeModal('propertyVerifications', 
        userPlan?.name === 'Primo Chambeador' 
          ? `Has alcanzado tu límite de 5 verificaciones de propiedad. Upgrade para obtener hasta 50 verificaciones mensuales.`
          : `Has alcanzado tu límite mensual. Upgrade a Master Contractor para verificaciones ilimitadas.`
      );
      return;
    }

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
      
      // 📊 INCREMENTAR USO DESPUÉS DE BÚSQUEDA EXITOSA
      await incrementUsage('propertyVerifications', 1);
      
      queryClient.invalidateQueries({ queryKey: ["/api/property/history"] });

      toast({
        title: "✅ Verificación Completada",
        description: `Datos obtenidos exitosamente. ${remaining > 0 ? `Te quedan ${remaining - 1} verificaciones este mes.` : ''}`,
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
  }, [selectedPlace, queryClient, toast, canSearch, showUpgradeModal, userPlan, remaining, incrementUsage]);

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

  // Filter history items based on search term
  const filteredHistoryItems = useMemo(() => {
    if (!historyItems || !Array.isArray(historyItems)) return [];
    
    if (!historySearchTerm) return historyItems;
    
    const searchLower = historySearchTerm.toLowerCase();
    return historyItems.filter((item: PropertySearchHistoryItem) => {
      const addressMatch = item.address?.toLowerCase().includes(searchLower);
      const titleMatch = item.title?.toLowerCase().includes(searchLower);
      const ownerMatch = item.ownerName?.toLowerCase().includes(searchLower);
      return addressMatch || titleMatch || ownerMatch;
    });
  }, [historyItems, historySearchTerm]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-6xl">
        {/* Header - Futuristic Holographic Design */}
        <div className="mb-6 sm:mb-8 relative">
          {/* Holographic Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 rounded-2xl blur-xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-slate-800/20 rounded-2xl backdrop-blur-sm"></div>
          
          {/* 📊 PERMISSIONS: Usage Counter */}
          <div className="absolute top-4 right-4 z-10">
            <div className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
              isLimited 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : remaining <= 2 && remaining > 0
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
            }`}>
              {userPlan?.limits.propertyVerifications === -1 
                ? '∞ Ilimitado'
                : `${remaining}/${userPlan?.limits.propertyVerifications || 0} verificaciones`
              }
            </div>
          </div>
          <div className="relative p-4 sm:p-6 border border-cyan-400/30 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              {/* Compact Scan Icon with Holographic Effects */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-blue-400/30 rounded-lg blur-sm group-hover:blur-md transition-all duration-300"></div>
                <div className="relative p-2 bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-lg border border-cyan-400/50 backdrop-blur-sm">
                  <Scan className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                  <div className="absolute inset-0 bg-cyan-400/10 rounded-lg animate-pulse"></div>
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight">
                  Property Ownership Verifier
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"></div>
                  <div className="h-0.5 w-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                </div>
              </div>
            </div>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium opacity-90">
              AI-powered property intelligence with quantum verification
            </p>
            
            {/* Holographic Corner Accents */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-lg"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-purple-400/50 rounded-tr-lg"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-400/50 rounded-bl-lg"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-purple-400/50 rounded-br-lg"></div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-slate-600/50 backdrop-blur-sm">
            <TabsTrigger 
              value="search" 
              className="text-xs sm:text-sm py-2 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600/20 data-[state=active]:to-blue-600/20 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/50"
            >
              <span className="hidden sm:inline">Neural Verification</span>
              <span className="sm:hidden">Verify</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="text-xs sm:text-sm py-2 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-pink-600/20 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-400/50"
            >
              <span className="hidden sm:inline">Data Archives</span>
              <span className="sm:hidden">Archives</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 sm:space-y-6">
            {/* Search Interface - Holographic Design */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-slate-600/20 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300"></div>
              <Card className="relative border-2 border-slate-600/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm hover:border-slate-500/70 transition-all duration-300">
                {/* Holographic Corner Accents */}
                <div className="absolute top-3 left-3 w-6 h-6 border-l border-t border-slate-400/50"></div>
                <div className="absolute top-3 right-3 w-6 h-6 border-r border-t border-slate-400/50"></div>
                <div className="absolute bottom-3 left-3 w-6 h-6 border-l border-b border-slate-400/50"></div>
                <div className="absolute bottom-3 right-3 w-6 h-6 border-r border-b border-slate-400/50"></div>
                
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Property Verification Interface
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-slate-400">
                    Enter property address to initiate quantum verification protocol
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full">
                    <MapboxPlacesAutocomplete
                      value={address}
                      onChange={setAddress}
                      onPlaceSelect={handlePlaceSelect}
                      placeholder="Enter property address for verification..."
                      countries={["mx", "us", "es"]}
                      language="es"
                      className="w-full"
                    />
                  </div>
                  
                  <Button
                    onClick={handleSearch}
                    disabled={loading || !selectedPlace || !canSearch}
                    className={`w-full shadow-lg transition-all duration-300 ${
                      !canSearch 
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-600 hover:to-gray-700 border-gray-500/50 shadow-gray-500/20'
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 border-slate-500/50 shadow-slate-500/20'
                    } text-white`}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        <span className="text-sm sm:text-base">Quantum Scanning...</span>
                      </>
                    ) : !canSearch ? (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm sm:text-base">Límite Alcanzado - Upgrade Requerido</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        <span className="text-sm sm:text-base">
                          Initiate Verification ({userPlan?.limits.propertyVerifications === -1 ? '∞ Ilimitado' : `${remaining} restantes`})
                        </span>
                      </>
                    )}
                  </Button>
                  
                  {/* 🚨 UPGRADE PROMPT cuando se alcanza el límite */}
                  {!canSearch && (
                    <div className="relative mt-4">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg blur-sm"></div>
                      <Alert className="relative border-orange-500/50 bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm">
                        <AlertCircle className="h-4 w-4 text-orange-400" />
                        <AlertDescription className="text-sm text-orange-200">
                          <div className="font-medium mb-2">Límite de verificaciones alcanzado</div>
                          <div className="text-xs text-orange-300/80 mb-3">
                            {userPlan?.name === 'Primo Chambeador' 
                              ? 'Has usado tus 5 verificaciones gratuitas mensuales. Upgrade a Mero Patrón para obtener 50 verificaciones.'
                              : userPlan?.name === 'Mero Patrón'
                                ? 'Has usado tus 50 verificaciones mensuales. Upgrade a Master Contractor para verificaciones ilimitadas.'
                                : 'Has alcanzado tu límite mensual de verificaciones.'
                            }
                          </div>
                          <Button 
                            onClick={() => showUpgradeModal('propertyVerifications', 
                              `Upgrade tu plan para obtener ${userPlan?.name === 'Primo Chambeador' ? '50' : 'ilimitadas'} verificaciones mensuales`
                            )}
                            variant="outline"
                            size="sm" 
                            className="border-orange-500/30 hover:bg-orange-500/10 text-orange-300 hover:text-orange-200"
                          >
                            Ver Planes de Upgrade
                          </Button>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {error && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg blur-sm"></div>
                      <Alert variant="destructive" className="relative border-red-500/50 bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm break-words">{error}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
                          <p className="text-slate-400 text-xs sm:text-sm mt-1">Información verificada exitosamente</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Compact Verification Summary */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                  <Card className="relative border-2 border-cyan-400/60 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm hover:border-cyan-300/80 transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 sm:gap-3">
                        <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-bold text-base sm:text-lg">
                          Resumen de Verificación
                        </span>
                        <Badge 
                          variant="default" 
                          className="bg-green-500/20 text-green-400 border-green-500/50 ml-auto text-xs"
                        >
                          ✓ Verificado
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Owner & Address Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <Users className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Propietario</div>
                            <div className="text-white font-medium text-sm truncate">{propertyDetails.owner}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <MapPin className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Dirección</div>
                            <div className="text-white font-medium text-sm truncate">{propertyDetails.address}</div>
                          </div>
                        </div>
                      </div>

                      {/* Property Details Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {propertyDetails.yearBuilt && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                            <Calendar className="h-3 w-3 text-purple-400" />
                            <div>
                              <div className="text-xs text-slate-400">Año</div>
                              <div className="text-white text-sm font-medium">{propertyDetails.yearBuilt}</div>
                            </div>
                          </div>
                        )}
                        
                        {propertyDetails.sqft && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                            <Ruler className="h-3 w-3 text-purple-400" />
                            <div>
                              <div className="text-xs text-slate-400">Área</div>
                              <div className="text-white text-sm font-medium">{propertyDetails.sqft.toLocaleString()}</div>
                            </div>
                          </div>
                        )}

                        {propertyDetails.bedrooms > 0 && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                            <Bed className="h-3 w-3 text-purple-400" />
                            <div>
                              <div className="text-xs text-slate-400">Cuartos</div>
                              <div className="text-white text-sm font-medium">{propertyDetails.bedrooms}</div>
                            </div>
                          </div>
                        )}

                        {propertyDetails.purchasePrice && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                            <DollarSign className="h-3 w-3 text-purple-400" />
                            <div>
                              <div className="text-xs text-slate-400">Precio</div>
                              <div className="text-white text-sm font-medium">${(propertyDetails.purchasePrice / 1000).toFixed(0)}k</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
            <div className="relative group w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-slate-600/20 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300"></div>
              <Card className="relative border-2 border-slate-600/50 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm hover:border-slate-500/70 transition-all duration-300 w-full overflow-hidden">
                {/* Holographic Corner Accents */}
                <div className="absolute top-2 left-2 w-4 h-4 sm:w-6 sm:h-6 border-l border-t border-slate-400/50"></div>
                <div className="absolute top-2 right-2 w-4 h-4 sm:w-6 sm:h-6 border-r border-t border-slate-400/50"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 sm:w-6 sm:h-6 border-l border-b border-slate-400/50"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 sm:w-6 sm:h-6 border-r border-b border-slate-400/50"></div>
                
                <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                    <HistoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300 flex-shrink-0" />
                    <span className="truncate">Verification Archives</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm lg:text-base text-slate-400 leading-relaxed">
                    Historical database of all property verification protocols
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  {/* Search Filter - Mobile Optimized */}
                  <div className="relative w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg blur-sm"></div>
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-purple-400 z-10" />
                      <Input
                        placeholder="Search by address or owner..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gradient-to-br from-slate-900/70 to-slate-800/70 border-purple-400/30 text-slate-200 placeholder:text-slate-500 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* History Content */}
                  {historyLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-700/20 rounded-lg blur-sm"></div>
                          <div className="relative p-4 border border-slate-600/30 rounded-lg bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-sm">
                            <Skeleton className="h-4 w-3/4 mb-2 bg-slate-700" />
                            <Skeleton className="h-3 w-1/2 mb-2 bg-slate-700" />
                            <Skeleton className="h-3 w-1/3 bg-slate-700" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : historyError ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg blur-sm"></div>
                      <div className="relative p-6 text-center border border-red-500/30 rounded-lg bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-sm">
                        <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-3" />
                        <p className="text-red-300 font-medium">Archive Access Error</p>
                        <p className="text-red-400/80 text-sm mt-1">Unable to access verification archives</p>
                      </div>
                    </div>
                  ) : filteredHistoryItems.length === 0 ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-slate-600/10 rounded-lg blur-sm"></div>
                      <div className="relative p-8 text-center border border-slate-600/30 rounded-lg bg-gradient-to-br from-slate-900/40 to-slate-800/40 backdrop-blur-sm">
                        <Database className="mx-auto h-12 w-12 text-slate-400 mb-4 opacity-50" />
                        <p className="text-slate-300 font-medium mb-2">No Archive Entries Found</p>
                        <p className="text-slate-500 text-sm">
                          {historySearchTerm ? 'No results match your search criteria' : 'Your verification history will appear here'}
                        </p>
                        {historySearchTerm && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setHistorySearchTerm('')}
                            className="mt-4 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                          >
                            Clear Search
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px] sm:h-[400px]">
                      <div className="space-y-3 px-1">
                        {filteredHistoryItems.map((item: PropertySearchHistoryItem) => (
                          <div
                            key={item.id}
                            className="relative group cursor-pointer w-full"
                            onClick={() => handleSelectHistory(item)}
                          >
                            {/* Holographic Background Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-cyan-500/10 rounded-lg blur-sm group-hover:blur-md transition-all duration-300"></div>
                            
                            <div className="relative p-3 sm:p-4 border border-purple-400/20 rounded-lg bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-sm hover:border-purple-400/40 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-slate-900/80 group-hover:to-slate-800/80 overflow-hidden">
                              {/* Corner Accents */}
                              <div className="absolute top-2 left-2 w-3 h-3 sm:w-4 sm:h-4 border-l border-t border-purple-400/30 group-hover:border-purple-400/60 transition-colors"></div>
                              <div className="absolute top-2 right-2 w-3 h-3 sm:w-4 sm:h-4 border-r border-t border-pink-400/30 group-hover:border-pink-400/60 transition-colors"></div>
                              <div className="absolute bottom-2 left-2 w-3 h-3 sm:w-4 sm:h-4 border-l border-b border-purple-400/30 group-hover:border-purple-400/60 transition-colors"></div>
                              <div className="absolute bottom-2 right-2 w-3 h-3 sm:w-4 sm:h-4 border-r border-b border-pink-400/30 group-hover:border-pink-400/60 transition-colors"></div>
                              
                              <div className="space-y-2 min-w-0 w-full">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Home className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                      <h4 className="font-medium text-slate-200 truncate text-sm sm:text-base min-w-0">
                                        {item.title || item.address}
                                      </h4>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-400 min-w-0">
                                      <MapPin className="h-3 w-3 opacity-70 flex-shrink-0 mt-0.5" />
                                      <span className="break-words leading-4 min-w-0 flex-1">{item.address}</span>
                                    </div>
                                  </div>
                                  
                                  <Badge 
                                    variant="secondary" 
                                    className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs flex-shrink-0 w-fit self-start"
                                  >
                                    Verified
                                  </Badge>
                                </div>
                                
                                {/* Details */}
                                <div className="space-y-1">
                                  {item.ownerName && (
                                    <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-400 min-w-0">
                                      <User className="h-3 w-3 opacity-70 flex-shrink-0 mt-0.5" />
                                      <span className="break-words leading-4 min-w-0 flex-1">{item.ownerName}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                                    <Clock className="h-3 w-3 opacity-70 flex-shrink-0" />
                                    <span className="truncate">{formatDate(item.createdAt)}</span>
                                  </div>
                                </div>
                                
                                {/* Action */}
                                <div className="pt-2 border-t border-slate-700/50">
                                  <div className="flex items-center justify-between text-xs text-purple-400">
                                    <span className="hidden sm:inline">Click to load verification</span>
                                    <span className="sm:hidden">Tap to load</span>
                                    <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}