import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Search, Clock, Trash2, Brain } from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

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

export default function PermitAdvisor() {
  const [selectedAddress, setSelectedAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [projectType, setProjectType] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("permits");
  const [showHistory, setShowHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const { toast } = useToast();

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Query para obtener historial real de Firebase
  const {
    data: historyData = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["permitHistory", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) return [];

      try {
        // Intentar diferentes estrategias para cargar el historial
        let q;
        try {
          // Primero intentar con orderBy
          q = query(
            collection(db, "permit_search_history"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(50),
          );
        } catch (error) {
          // Si falla orderBy, intentar sin él
          console.log("⚠️ OrderBy failed, trying without...");
          q = query(
            collection(db, "permit_search_history"),
            where("userId", "==", currentUser.uid),
            limit(50),
          );
        }

        const querySnapshot = await getDocs(q);
        const history: any[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            ...data,
            // Asegurar compatibilidad con timestamps
            createdAt: data.createdAt || data.timestamp || new Date(),
          });
        });

        // Ordenar manualmente por fecha si no se pudo hacer en la query
        history.sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        console.log(
          `📋 Historial cargado: ${history.length} búsquedas encontradas`,
        );
        return history;
      } catch (error) {
        console.error("❌ Error obteniendo historial:", error);

        // Fallback: intentar obtener todas las búsquedas sin filtros complejos
        try {
          console.log("🔄 Intentando fallback simple...");
          const simpleQuery = collection(db, "permit_search_history");
          const snapshot = await getDocs(simpleQuery);
          const fallbackHistory: any[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId === currentUser.uid) {
              fallbackHistory.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt || data.timestamp || new Date(),
              });
            }
          });

          console.log(
            `📋 Fallback cargado: ${fallbackHistory.length} búsquedas`,
          );
          return fallbackHistory.slice(0, 50); // Limitar a 50
        } catch (fallbackError) {
          console.error("❌ Fallback también falló:", fallbackError);
          return [];
        }
      }
    },
    enabled: !!currentUser?.uid,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Funciones para el historial de Firebase con retry automático
  const saveToHistory = async (results: any, retryCount = 3) => {
    if (!currentUser?.uid || !selectedAddress || !projectType) {
      console.log(
        "⚠️ No se puede guardar: faltan datos del usuario o búsqueda",
      );
      return;
    }

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const title = `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} en ${selectedAddress}`;

        const historyItem = {
          userId: currentUser.uid,
          address: selectedAddress,
          projectType,
          projectDescription: projectDescription || "",
          results,
          title,
          createdAt: Timestamp.now(),
          timestamp: new Date().toISOString(), // Backup timestamp
        };

        const docRef = await addDoc(
          collection(db, "permit_search_history"),
          historyItem,
        );
        console.log(
          `✅ Búsqueda guardada en historial de Firebase (ID: ${docRef.id})`,
        );

        // Actualizar la lista inmediatamente
        setTimeout(() => {
          refetchHistory();
        }, 500);

        return docRef.id; // Éxito, salir del loop
      } catch (error) {
        console.error(
          `❌ Error al guardar en historial (intento ${attempt}/${retryCount}):`,
          error,
        );

        if (attempt === retryCount) {
          // En el último intento, mostrar el error al usuario
          toast({
            title: "⚠️ History Save Warning",
            description:
              "Search completed but couldn't save to history. Your results are still available.",
            variant: "default",
          });
        } else {
          // Esperar antes del siguiente intento
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  };

  // Filtrar historial según búsqueda
  const filteredHistory = historyData.filter((item: any) => {
    if (!searchFilter) return true;
    const searchTerm = searchFilter.toLowerCase();
    return (
      item.address?.toLowerCase().includes(searchTerm) ||
      item.projectType?.toLowerCase().includes(searchTerm) ||
      item.title?.toLowerCase().includes(searchTerm)
    );
  });

  const getProjectIcon = (type: string) => {
    const icons: Record<string, string> = {
      electrical: "⚡",
      plumbing: "🚿",
      roofing: "🏠",
      bathroom: "🛁",
      kitchen: "🍳",
      addition: "🏗️",
      concrete: "🧱",
      default: "🔧",
    };
    return icons[type.toLowerCase()] || icons.default;
  };

  const getProjectTypeColor = (projectType: string): string => {
    const colors: Record<string, string> = {
      electrical: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      plumbing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      roofing: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      bathroom: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      kitchen: "bg-green-500/20 text-green-300 border-green-500/30",
      addition: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      concrete: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      default: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    };
    return colors[projectType.toLowerCase()] || colors.default;
  };

  const loadFromHistory = (historyItem: any) => {
    setSelectedAddress(historyItem.address);
    setProjectType(historyItem.projectType);
    setProjectDescription(historyItem.projectDescription || "");
    setPermitData(historyItem.results);
    setShowHistory(false);
    toast({
      title: "Search Loaded",
      description: `Loaded: ${historyItem.title}`,
    });
  };

  // Enhance project description with Mervin AI
  const enhanceProjectWithAI = async () => {
    if (!projectDescription.trim()) {
      toast({
        title: "Descripción Requerida",
        description: "Por favor escribe una descripción básica del proyecto para mejorar con Mervin AI",
        variant: "destructive",
      });
      return;
    }

    setIsAIProcessing(true);

    try {
      console.log('🤖 Starting Mervin AI enhancement...');
      
      const response = await fetch('/api/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalText: projectDescription,
          projectType: projectType || 'construction permit project'
        }),
      });

      if (!response.ok) {
        throw new Error('Error al procesar con Mervin AI');
      }
      
      const result = await response.json();
      console.log('✅ Mervin AI Response:', result);
      
      if (result.enhancedDescription) {
        setProjectDescription(result.enhancedDescription);
        
        toast({
          title: '✨ Mejorado con Mervin AI',
          description: 'La descripción del proyecto ha sido mejorada profesionalmente'
        });
      } else {
        throw new Error('No se pudo generar contenido mejorado');
      }
      
    } catch (error) {
      console.error('Error enhancing with AI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar con Mervin AI. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
    }
  };

  const formatHistoryDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60),
      );

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });
    } catch (error) {
      return "Unknown";
    }
  };

  const handleAddressSelect = (addressData: any) => {
    console.log(
      "📍 [MapboxPlaces] Dirección seleccionada:",
      addressData.address,
    );
    console.log("✅ [MapboxPlaces] Datos del lugar:", addressData);

    setSelectedAddress(addressData.address);
    setCoordinates(addressData.coordinates);
  };

  const handleSearch = async () => {
    if (!selectedAddress.trim()) {
      setError("Please enter an address");
      return;
    }
    if (!projectType) {
      setError("Please select a project type");
      return;
    }

    setIsLoading(true);
    setError("");
    setPermitData(null);

    try {
      console.log("===== INICIANDO SOLICITUD MERVIN DEEPSEARCH =====");

      const response = await apiRequest("POST", "/api/permit/check", {
        address: selectedAddress,
        projectType,
        projectDescription: projectDescription || `${projectType} project`,
        coordinates,
      });

      const data = await response.json();
      console.log("✅ Respuesta recibida del servidor:", data);
      setPermitData(data);

      // Guardar automáticamente en historial
      await saveToHistory(data);

      toast({
        title: "✅ DeepSearch Complete",
        description: "Permit analysis generated and saved to history!",
      });
    } catch (error) {
      console.error("Error in permit search:", error);
      setError("Failed to analyze permits. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const historyQuery = useQuery({
    queryKey: ["/api/permit/history"],
    enabled: showHistory,
  });

  const handleLoadHistoryItem = (item: SearchHistoryItem) => {
    setSelectedAddress(item.address);
    setProjectType(item.projectType);
    setProjectDescription(item.projectDescription || "");
    setPermitData(item.results);
    setShowHistory(false);

    toast({
      title: "History Loaded",
      description: `Loaded search for ${item.address}`,
    });
  };

  return (
    <div 
      className="mb-40 bg-black text-white p-6 relative"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* Fondo limpio */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header simplificado - estilo Legal Defense */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-cyan-400">
              Mervin DeepSearch
            </h1>
          </div>
          <p className="text-gray-400 font-mono text-xs md:text-sm">
            AI-Powered Permit Analysis & Regulatory Intelligence
          </p>
        </div>

        {/* Navigation Buttons - estilo Legal Defense */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-6 rounded-lg"
            onClick={() => setActiveTab("analysis")}
          >
            📄 New Analysis
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800 py-3 px-6 rounded-lg"
              >
                🕒 History
                {filteredHistory.length > 0 && (
                  <Badge className="ml-2 bg-cyan-400 text-black">
                    {filteredHistory.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-cyan-400 flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center text-black">
                    📋
                  </div>
                  Recent Searches
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                {/* Buscador de historial */}
                <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
                  <Input
                    placeholder="Search history... (address, project type)"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {historyLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading history...</p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      📋
                    </div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No search history found
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Your recent permit searches will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHistory.map((item: any, index: number) => (
                      <div key={item.id}>
                        <div
                          onClick={() => loadFromHistory(item)}
                          className="group p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded-lg cursor-pointer transition-all duration-300"
                        >
                          <div className="space-y-3">
                            {/* Header with project type and date */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getProjectIcon(item.projectType)}
                                </span>
                                <Badge className="bg-cyan-400 text-black text-xs font-medium">
                                  {item.projectType.charAt(0).toUpperCase() + item.projectType.slice(1)}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-400 font-mono">
                                {formatHistoryDate(item.createdAt)}
                              </span>
                            </div>

                            {/* Address */}
                            <div className="space-y-1">
                              <p className="text-cyan-400 font-medium text-sm">
                                {item.address}
                              </p>
                            </div>

                            {/* Quick stats */}
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              {item.results?.requiredPermits && (
                                <span className="flex items-center gap-1">
                                  🏛️ {item.results.requiredPermits.length} permits
                                </span>
                              )}
                              {item.results?.contactInformation && (
                                <span className="flex items-center gap-1">
                                  📞 {item.results.contactInformation.length} contacts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {index < filteredHistory.length - 1 && (
                          <Separator className="my-3 bg-gray-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {filteredHistory.length > 0 && (
                <div className="flex justify-center pt-4 border-t border-gray-600">
                  <p className="text-xs text-gray-400">
                    Showing {filteredHistory.length} of {historyData.length} searches
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Interface - estilo Legal Defense */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="text-center px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl text-cyan-400 flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
              <span className="truncate">Step 1: Select Project</span>
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              Enter property details for comprehensive permit analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Address Input - estilo Legal Defense */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-400">
                  Property Address
                </label>
                <MapboxPlacesAutocomplete
                  onPlaceSelect={handleAddressSelect}
                  onChange={() => {}}
                  className="w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 min-h-[44px]"
                  placeholder="Enter property address..."
                />
              </div>

              {/* Project Type - estilo Legal Defense */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-400">
                  Project Type
                </label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white focus:border-cyan-400 min-h-[44px]">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 max-h-[200px]">
                    <SelectItem value="fence">Fence Installation</SelectItem>
                    <SelectItem value="deck">Deck Construction</SelectItem>
                    <SelectItem value="addition">Home Addition</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="electrical">Electrical Work</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="hvac">HVAC Installation</SelectItem>
                    <SelectItem value="concrete">Concrete Work</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                    <SelectItem value="pool">Pool Installation</SelectItem>
                    <SelectItem value="solar">Solar Panel Installation</SelectItem>
                    <SelectItem value="siding">Siding</SelectItem>
                    <SelectItem value="windows">Window Replacement</SelectItem>
                    <SelectItem value="demolition">Demolition</SelectItem>
                    <SelectItem value="garage">Garage Construction</SelectItem>
                    <SelectItem value="shed">Shed Installation</SelectItem>
                    <SelectItem value="driveway">Driveway</SelectItem>
                    <SelectItem value="bathroom">Bathroom Remodel</SelectItem>
                    <SelectItem value="kitchen">Kitchen Remodel</SelectItem>
                    <SelectItem value="basement">Basement Finishing</SelectItem>
                    <SelectItem value="attic">Attic Conversion</SelectItem>
                    <SelectItem value="porch">Porch/Patio</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-cyan-400">
                  Project Description (Optional)
                </label>
                <Button
                  onClick={enhanceProjectWithAI}
                  disabled={isAIProcessing || !projectDescription.trim()}
                  className="bg-cyan-400 hover:bg-cyan-300 text-black font-medium text-xs px-3 py-1 h-7"
                  size="sm"
                >
                  {isAIProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black mr-1"></div>
                      <span className="hidden sm:inline">Procesando...</span>
                      <span className="sm:hidden">AI...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Enhance with Mervin AI</span>
                      <span className="sm:hidden">Mervin AI</span>
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project in detail (e.g., materials, scope, square footage)..."
                className="w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 min-h-[80px] resize-none"
              />
              <div className="flex items-start gap-2 mt-2 p-3 bg-gray-800/50 border border-cyan-400/30 rounded-lg">
                <Brain className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                  <strong className="text-cyan-400">💡 Tip:</strong> Escribe una descripción básica de tu proyecto y usa <strong className="text-cyan-400">"Enhance with Mervin AI"</strong> para generar automáticamente una descripción profesional completa con terminología de construcción técnica.
                </p>
              </div>
            </div>

            {/* Responsive button layout */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !selectedAddress || !projectType}
                className="w-full sm:flex-1 bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-6 rounded-lg h-12"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>🔍 Run DeepSearch Analysis</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message - estilo Legal Defense */}
        {error && (
          <Card className="mt-6 bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="bg-red-900/20 border border-red-400/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <p className="text-red-400 font-medium">Error</p>
                </div>
                <p className="text-gray-300 mt-2">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Analysis Results - estilo Legal Defense */}
        {permitData && (
          <Card className="mt-6 bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                Advanced Permit Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Project Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-cyan-400 text-sm font-medium">Property Address</h3>
                  <p className="text-gray-300">{permitData?.propertyAddress || selectedAddress}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-cyan-400 text-sm font-medium">Project Type</h3>
                  <p className="text-gray-300">{permitData?.projectType || projectType}</p>
                </div>
              </div>

              {/* Jurisdiction Analysis */}
              {permitData?.jurisdictionAnalysis && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    🏛️ Jurisdiction Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gray-800 border-gray-600">
                      <CardContent className="p-4">
                        <h4 className="text-white font-medium mb-3">Government Authorities</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong className="text-cyan-400">City:</strong> {permitData.jurisdictionAnalysis.city}</p>
                          <p><strong className="text-cyan-400">County:</strong> {permitData.jurisdictionAnalysis.county}</p>
                          <p><strong className="text-cyan-400">State:</strong> {permitData.jurisdictionAnalysis.state}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800 border-gray-600">
                      <CardContent className="p-4">
                        <h4 className="text-white font-medium mb-3">Key Departments</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong className="text-cyan-400">Building:</strong> {permitData.jurisdictionAnalysis.buildingDepartment}</p>
                          <p><strong className="text-cyan-400">Planning:</strong> {permitData.jurisdictionAnalysis.planningDepartment}</p>
                          <p><strong className="text-cyan-400">Fire Authority:</strong> {permitData.jurisdictionAnalysis.fireAuthority}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Building Codes Section */}
              {permitData?.buildingCodes && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    📋 Building Codes & Regulations
                  </h3>
                  
                  {/* Applicable Codes */}
                  {permitData.buildingCodes.applicableCodes && permitData.buildingCodes.applicableCodes.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-white font-medium">Applicable Building Codes</h4>
                      {permitData.buildingCodes.applicableCodes.map((code: any, idx: number) => (
                        <Card key={idx} className="bg-gray-800 border-gray-600">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-white font-medium">{code.codeName}</h5>
                              <Badge className="bg-cyan-400 text-black text-xs">{code.codeEdition}</Badge>
                            </div>
                            {code.specificSections && code.specificSections.length > 0 && (
                              <div className="mb-3">
                                <p className="text-cyan-400 text-sm font-medium mb-1">Specific Sections:</p>
                                <div className="flex flex-wrap gap-2">
                                  {code.specificSections.map((section: string, sIdx: number) => (
                                    <Badge key={sIdx} variant="outline" className="border-gray-500 text-gray-300 text-xs">
                                      {section}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {code.keyRequirements && code.keyRequirements.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-cyan-400 text-sm font-medium">Key Requirements:</p>
                                <ul className="text-gray-300 text-sm space-y-1">
                                  {code.keyRequirements.map((req: string, rIdx: number) => (
                                    <li key={rIdx} className="flex items-start gap-2">
                                      <span className="text-cyan-400 mt-1">•</span>
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* State and Federal Requirements */}
                  {(permitData.buildingCodes.stateRegulations?.length > 0 || permitData.buildingCodes.federalRequirements?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permitData.buildingCodes.stateRegulations?.length > 0 && (
                        <Card className="bg-gray-800 border-gray-600">
                          <CardContent className="p-4">
                            <h5 className="text-white font-medium mb-3">State Regulations</h5>
                            <ul className="text-gray-300 text-sm space-y-1">
                              {permitData.buildingCodes.stateRegulations.map((reg: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-cyan-400 mt-1">•</span>
                                  <span>{reg}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                      
                      {permitData.buildingCodes.federalRequirements?.length > 0 && (
                        <Card className="bg-gray-800 border-gray-600">
                          <CardContent className="p-4">
                            <h5 className="text-white font-medium mb-3">Federal Requirements</h5>
                            <ul className="text-gray-300 text-sm space-y-1">
                              {permitData.buildingCodes.federalRequirements.map((req: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-cyan-400 mt-1">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* OSHA Requirements Section */}
              {permitData?.oshaRequirements && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    ⚠️ OSHA Safety Requirements
                  </h3>
                  
                  {permitData.oshaRequirements.applicableStandards && permitData.oshaRequirements.applicableStandards.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-white font-medium">Applicable OSHA Standards</h4>
                      {permitData.oshaRequirements.applicableStandards.map((standard: any, idx: number) => (
                        <Card key={idx} className="bg-gray-800 border-gray-600">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-white font-medium">{standard.title}</h5>
                              <Badge className="bg-yellow-400 text-black text-xs">{standard.standardNumber}</Badge>
                            </div>
                            {standard.specificRequirements && standard.specificRequirements.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-cyan-400 text-sm font-medium">Specific Requirements:</p>
                                <ul className="text-gray-300 text-sm space-y-1">
                                  {standard.specificRequirements.map((req: string, rIdx: number) => (
                                    <li key={rIdx} className="flex items-start gap-2">
                                      <span className="text-yellow-400 mt-1">•</span>
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Required Permits Section */}
              {permitData?.requiredPermits && permitData.requiredPermits.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    📄 Required Permits & Process
                  </h3>
                  <div className="space-y-4">
                    {permitData.requiredPermits.map((permit: any, idx: number) => (
                      <Card key={idx} className="bg-gray-800 border-gray-600">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-medium text-lg">{permit.permitName}</h4>
                            <div className="flex gap-2">
                              <Badge className="bg-green-400 text-black">{permit.cost}</Badge>
                              <Badge variant="outline" className="border-gray-500 text-gray-300">{permit.timeline}</Badge>
                            </div>
                          </div>
                          
                          <p className="text-cyan-400 text-sm mb-4">
                            <strong>Issuing Authority:</strong> {permit.issuingAuthority}
                          </p>

                          {/* Application Process */}
                          {permit.applicationProcess && permit.applicationProcess.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-white font-medium">Application Process:</h5>
                              <div className="space-y-3">
                                {permit.applicationProcess.map((step: any, stepIdx: number) => (
                                  <div key={stepIdx} className="flex gap-4 p-3 bg-gray-700/50 rounded-lg">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-cyan-400 text-black rounded-full flex items-center justify-center text-sm font-bold">
                                        {step.step}
                                      </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <p className="text-white font-medium">{step.description}</p>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <p className="text-cyan-400 font-medium">Responsible Party:</p>
                                          <p className="text-gray-300">{step.responsibleParty}</p>
                                        </div>
                                        <div>
                                          <p className="text-cyan-400 font-medium">Estimated Time:</p>
                                          <p className="text-gray-300">{step.estimatedTime}</p>
                                        </div>
                                        <div>
                                          <p className="text-cyan-400 font-medium">Required Documents:</p>
                                          <p className="text-gray-300">{step.requiredDocuments?.join(', ')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspector Contacts Section */}
              {permitData?.inspectorContacts && permitData.inspectorContacts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    👨‍🔧 Inspector Contacts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permitData.inspectorContacts.map((contact: any, idx: number) => (
                      <Card key={idx} className="bg-gray-800 border-gray-600">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-3">{contact.department}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-400 font-medium">Inspector:</span>
                              <span className="text-gray-300">{contact.inspectorName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-400 font-medium">Title:</span>
                              <span className="text-gray-300">{contact.title}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-400 font-medium">Direct Phone:</span>
                              <a href={`tel:${contact.directPhone}`} className="text-green-400 hover:text-green-300">
                                {contact.directPhone}
                              </a>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-400 font-medium">Email:</span>
                              <a href={`mailto:${contact.email}`} className="text-green-400 hover:text-green-300 truncate">
                                {contact.email}
                              </a>
                            </div>
                            <div className="flex items-start justify-between">
                              <span className="text-cyan-400 font-medium">Office:</span>
                              <span className="text-gray-300 text-right">{contact.officeAddress}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-400 font-medium">Hours:</span>
                              <span className="text-gray-300">{contact.availability}</span>
                            </div>
                            {contact.specialties && contact.specialties.length > 0 && (
                              <div className="mt-3">
                                <p className="text-cyan-400 font-medium mb-2">Specialties:</p>
                                <div className="flex flex-wrap gap-1">
                                  {contact.specialties.map((specialty: string, sIdx: number) => (
                                    <Badge key={sIdx} variant="outline" className="border-gray-500 text-gray-300 text-xs">
                                      {specialty}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost Analysis Section */}
              {permitData?.costAnalysis && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    💰 Cost Analysis
                  </h3>
                  
                  {permitData.costAnalysis.totalEstimatedCosts && (
                    <Card className="bg-gray-800 border-gray-600">
                      <CardContent className="p-4">
                        <h4 className="text-white font-medium mb-3">Total Estimated Costs</h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-green-400 text-lg font-bold">{permitData.costAnalysis.totalEstimatedCosts.minimum}</p>
                            <p className="text-gray-400 text-xs">Minimum</p>
                          </div>
                          <div>
                            <p className="text-cyan-400 text-lg font-bold">{permitData.costAnalysis.totalEstimatedCosts.typical}</p>
                            <p className="text-gray-400 text-xs">Typical</p>
                          </div>
                          <div>
                            <p className="text-red-400 text-lg font-bold">{permitData.costAnalysis.totalEstimatedCosts.maximum}</p>
                            <p className="text-gray-400 text-xs">Maximum</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {permitData.costAnalysis.permitFees && permitData.costAnalysis.permitFees.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-white font-medium">Permit Fee Breakdown</h4>
                      {permitData.costAnalysis.permitFees.map((fee: any, idx: number) => (
                        <Card key={idx} className="bg-gray-700/50 border-gray-600">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-white font-medium">{fee.permitType}</h5>
                              <span className="text-green-400 font-bold">{fee.baseFee}</span>
                            </div>
                            {fee.additionalFees && fee.additionalFees.length > 0 && (
                              <p className="text-gray-400 text-sm">
                                Additional fees: {fee.additionalFees.join(', ')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Analysis */}
              {permitData?.timelineAnalysis && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    ⏱️ Timeline Analysis
                  </h3>
                  
                  <Card className="bg-gray-8800 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div>
                          <p className="text-cyan-400 font-medium">Total Estimated Time</p>
                          <p className="text-white text-lg font-bold">{permitData.timelineAnalysis.totalEstimatedTime}</p>
                        </div>
                      </div>

                      {permitData.timelineAnalysis.criticalPath && permitData.timelineAnalysis.criticalPath.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-white font-medium">Critical Path</h4>
                          <div className="space-y-2">
                            {permitData.timelineAnalysis.criticalPath.map((phase: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                <div>
                                  <p className="text-white font-medium">{phase.phase}</p>
                                  <p className="text-gray-400 text-sm">Duration: {phase.duration}</p>
                                </div>
                                {phase.permits && phase.permits.length > 0 && (
                                  <div className="text-right">
                                    <p className="text-cyan-400 text-sm">Permits:</p>
                                    <p className="text-gray-300 text-sm">{phase.permits.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Risk Assessment */}
              {permitData?.riskAssessment && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    ⚠️ Risk Assessment
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permitData.riskAssessment.commonViolations && permitData.riskAssessment.commonViolations.length > 0 && (
                      <Card className="bg-red-900/20 border-red-400/50">
                        <CardContent className="p-4">
                          <h4 className="text-red-400 font-medium mb-3">Common Violations</h4>
                          <ul className="text-gray-300 text-sm space-y-1">
                            {permitData.riskAssessment.commonViolations.map((violation: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-red-400 mt-1">•</span>
                                <span>{violation}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {permitData.riskAssessment.mitigation && permitData.riskAssessment.mitigation.length > 0 && (
                      <Card className="bg-green-900/20 border-green-400/50">
                        <CardContent className="p-4">
                          <h4 className="text-green-400 font-medium mb-3">Risk Mitigation</h4>
                          <ul className="text-gray-300 text-sm space-y-1">
                            {permitData.riskAssessment.mitigation.map((strategy: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-400 mt-1">•</span>
                                <span>{strategy}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Official Resources */}
              {permitData?.officialResources && (
                <div className="space-y-4">
                  <h3 className="text-cyan-400 text-lg font-medium flex items-center gap-2">
                    🔗 Official Resources
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permitData.officialResources.permitPortals && permitData.officialResources.permitPortals.length > 0 && (
                      <Card className="bg-gray-800 border-gray-600">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-3">Permit Portals</h4>
                          <div className="space-y-2">
                            {permitData.officialResources.permitPortals.map((portal: any, idx: number) => (
                              <div key={idx} className="p-2 bg-gray-700/50 rounded">
                                <p className="text-cyan-400 font-medium">{portal.name}</p>
                                <a href={portal.url} target="_blank" rel="noopener noreferrer" 
                                   className="text-green-400 hover:text-green-300 text-sm truncate block">
                                  {portal.url}
                                </a>
                                <p className="text-gray-400 text-sm">{portal.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {permitData.officialResources.contactDirectory && permitData.officialResources.contactDirectory.length > 0 && (
                      <Card className="bg-gray-800 border-gray-600">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-3">Official Contacts</h4>
                          <div className="space-y-3">
                            {permitData.officialResources.contactDirectory.map((contact: any, idx: number) => (
                              <div key={idx} className="p-2 bg-gray-700/50 rounded">
                                <p className="text-cyan-400 font-medium">{contact.department}</p>
                                <div className="text-sm space-y-1">
                                  <p><strong className="text-cyan-400">Phone:</strong> 
                                    <a href={`tel:${contact.phone}`} className="text-green-400 hover:text-green-300 ml-1">
                                      {contact.phone}
                                    </a>
                                  </p>
                                  <p><strong className="text-cyan-400">Email:</strong> 
                                    <a href={`mailto:${contact.email}`} className="text-green-400 hover:text-green-300 ml-1">
                                      {contact.email}
                                    </a>
                                  </p>
                                  <p><strong className="text-cyan-400">Hours:</strong> <span className="text-gray-300">{contact.hours}</span></p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Cerrar contenedor principal */}
      </div>
    </div>
  );
}
