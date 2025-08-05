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
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Property Ownership Verifier
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Verificación profesional de propiedad y análisis de titularidad para proyectos legales y de construcción.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Verificación de Propiedad</TabsTrigger>
            <TabsTrigger value="history">Historial de Búsquedas</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            {/* Simple Search Interface */}
            <Card>
              <CardHeader>
                <CardTitle>Verificación de Propiedad</CardTitle>
                <CardDescription>
                  Ingrese la dirección para verificar información de propiedad y titularidad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MapboxPlacesAutocomplete
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Ingrese la dirección de la propiedad..."
                  countries={["mx", "us", "es"]}
                  language="es"
                />
                
                <Button
                  onClick={handleSearch}
                  disabled={loading || !selectedPlace}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Verificar Propiedad
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {propertyDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Resultados de Verificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-primary">Información del Propietario</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Propietario:</strong> {propertyDetails.owner}</div>
                        <div><strong>Propiedad:</strong> {propertyDetails.address}</div>
                        <div>
                          <strong>Estado:</strong> 
                          <Badge variant={propertyDetails.verified ? "default" : "outline"} className="ml-2">
                            {propertyDetails.verified ? "Verificado" : "No Verificado"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="font-semibold text-primary">Detalles de la Propiedad</h3>
                      <div className="space-y-2 text-sm">
                        {propertyDetails.yearBuilt && (
                          <div><strong>Año de construcción:</strong> {propertyDetails.yearBuilt}</div>
                        )}
                        {propertyDetails.sqft && (
                          <div><strong>Tamaño:</strong> {propertyDetails.sqft.toLocaleString()} pies²</div>
                        )}
                        {propertyDetails.purchasePrice && (
                          <div><strong>Precio de compra:</strong> ${propertyDetails.purchasePrice.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={handleExportReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Reporte
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
                    >
                      Nueva Verificación
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-primary" />
                  Historial de Verificaciones
                </CardTitle>
                <CardDescription>
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