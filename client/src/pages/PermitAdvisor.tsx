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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Search, Clock, Trash2 } from "lucide-react";
import MapboxPlacesAutocomplete from "@/components/ui/mapbox-places-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [projectType, setProjectType] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [permitData, setPermitData] = useState<PermitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("permits");
  const [showHistory, setShowHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const { toast } = useToast();

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Query para obtener historial real de Firebase
  const { data: historyData = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['permitHistory', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) return [];
      
      try {
        // Intentar diferentes estrategias para cargar el historial
        let q;
        try {
          // Primero intentar con orderBy
          q = query(
            collection(db, 'permit_search_history'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
        } catch (error) {
          // Si falla orderBy, intentar sin él
          console.log('⚠️ OrderBy failed, trying without...');
          q = query(
            collection(db, 'permit_search_history'),
            where('userId', '==', currentUser.uid),
            limit(50)
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
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log(`📋 Historial cargado: ${history.length} búsquedas encontradas`);
        return history;
      } catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        
        // Fallback: intentar obtener todas las búsquedas sin filtros complejos
        try {
          console.log('🔄 Intentando fallback simple...');
          const simpleQuery = collection(db, 'permit_search_history');
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
          
          console.log(`📋 Fallback cargado: ${fallbackHistory.length} búsquedas`);
          return fallbackHistory.slice(0, 50); // Limitar a 50
        } catch (fallbackError) {
          console.error('❌ Fallback también falló:', fallbackError);
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
      console.log('⚠️ No se puede guardar: faltan datos del usuario o búsqueda');
      return;
    }
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const title = `${projectType.charAt(0).toUpperCase() + projectType.slice(1)} en ${selectedAddress}`;
        
        const historyItem = {
          userId: currentUser.uid,
          address: selectedAddress,
          projectType,
          projectDescription: projectDescription || '',
          results,
          title,
          createdAt: Timestamp.now(),
          timestamp: new Date().toISOString() // Backup timestamp
        };

        const docRef = await addDoc(collection(db, 'permit_search_history'), historyItem);
        console.log(`✅ Búsqueda guardada en historial de Firebase (ID: ${docRef.id})`);
        
        // Actualizar la lista inmediatamente
        setTimeout(() => {
          refetchHistory();
        }, 500);
        
        return docRef.id; // Éxito, salir del loop
      } catch (error) {
        console.error(`❌ Error al guardar en historial (intento ${attempt}/${retryCount}):`, error);
        
        if (attempt === retryCount) {
          // En el último intento, mostrar el error al usuario
          toast({
            title: "⚠️ History Save Warning",
            description: "Search completed but couldn't save to history. Your results are still available.",
            variant: "default"
          });
        } else {
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
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
      electrical: '⚡',
      plumbing: '🚿',
      roofing: '🏠',
      bathroom: '🛁',
      kitchen: '🍳',
      addition: '🏗️',
      concrete: '🧱',
      default: '🔧'
    };
    return icons[type.toLowerCase()] || icons.default;
  };

  const getProjectTypeColor = (projectType: string): string => {
    const colors: Record<string, string> = {
      electrical: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      plumbing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      roofing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      bathroom: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      kitchen: 'bg-green-500/20 text-green-300 border-green-500/30',
      addition: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      concrete: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      default: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    };
    return colors[projectType.toLowerCase()] || colors.default;
  };

  const loadFromHistory = (historyItem: any) => {
    setSelectedAddress(historyItem.address);
    setProjectType(historyItem.projectType);
    setProjectDescription(historyItem.projectDescription || '');
    setPermitData(historyItem.results);
    setShowHistory(false);
    toast({
      title: "Search Loaded",
      description: `Loaded: ${historyItem.title}`,
    });
  };

  const formatHistoryDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const handleAddressSelect = (addressData: any) => {
    console.log("📍 [MapboxPlaces] Dirección seleccionada:", addressData.address);
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
      
      const response = await apiRequest('POST', '/api/permit/check', {
        address: selectedAddress,
        projectType,
        projectDescription: projectDescription || `${projectType} project`,
        coordinates
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
    queryKey: ['/api/permit/history'],
    enabled: showHistory
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900">
      {/* Header with cyberpunk styling */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900/50 to-gray-900/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gray-800/10 opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-300 bg-clip-text text-transparent mb-4">
              Mervin DeepSearch
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              AI-Powered Permit Analysis & Regulatory Intelligence
            </p>
            <div className="flex items-center justify-center gap-2 text-teal-300">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono">Professional Grade Intelligence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Interface */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <Card className="bg-gray-800/50 border-teal-500/20 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl text-teal-300 flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse"></div>
              <span className="truncate">Property & Project Analysis</span>
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              Enter property details for comprehensive permit analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-300">Property Address</label>
                <MapboxPlacesAutocomplete
                  onPlaceSelect={handleAddressSelect}
                  onChange={() => {}} 
                  className="w-full bg-gray-700/50 border-teal-500/30 text-white placeholder-gray-400 focus:border-teal-400 focus:ring-teal-400/20 min-h-[44px]"
                  placeholder="Enter property address..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-teal-300">Project Type</label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="w-full bg-gray-700/50 border-teal-500/30 text-white focus:border-teal-400 min-h-[44px]">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-teal-500/30 max-h-[200px] overflow-y-auto">
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
              <label className="text-sm font-medium text-teal-300">Project Description (Optional)</label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe your project in detail (e.g., materials, scope, square footage)..."
                className="w-full bg-gray-700/50 border-teal-500/30 text-white placeholder-gray-400 focus:border-teal-400 focus:ring-teal-400/20 min-h-[80px] resize-none"
              />
            </div>

            {/* Responsive button layout */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !selectedAddress || !projectType}
                className="w-full sm:flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-medium transition-all duration-300 h-12 text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    🔍
                    <span className="hidden sm:inline">Run DeepSearch Analysis</span>
                    <span className="sm:hidden">Run Analysis</span>
                  </div>
                )}
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-teal-500/30 text-teal-300 hover:bg-teal-500/10 h-12 text-sm sm:text-base px-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-teal-500/20 rounded-md flex items-center justify-center">
                        📋
                      </div>
                      <span className="hidden sm:inline">Search History</span>
                      <span className="sm:hidden">History</span>
                    </div>
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl bg-gray-900/95 border-teal-400/30 backdrop-blur-md">
                  <DialogHeader>
                    <DialogTitle className="text-teal-300 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                        📋
                      </div>
                      Recent Searches
                    </DialogTitle>
                  </DialogHeader>

                  <ScrollArea className="max-h-[60vh] pr-4">
                    {/* Buscador de historial */}
                    <div className="mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                      <Input
                        placeholder="Buscar en historial... (dirección, tipo de proyecto)"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="bg-gray-900/50 border-gray-600/50 text-gray-300 placeholder-gray-500"
                      />
                    </div>

                    {historyLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto mb-4"></div>
                        <p className="text-gray-400">Cargando historial...</p>
                      </div>
                    ) : filteredHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                          📋
                        </div>
                        <h3 className="text-lg font-medium text-gray-400 mb-2">No search history found</h3>
                        <p className="text-gray-500 text-sm">Your recent permit searches will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredHistory.map((item: any, index: number) => (
                          <div key={item.id}>
                            <div 
                              onClick={() => loadFromHistory(item)}
                              className="group relative p-4 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-teal-400/30 rounded-lg cursor-pointer transition-all duration-300"
                            >
                              {/* Holographic border effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-300"></div>
                              
                              <div className="relative space-y-3">
                                {/* Header with project type and date */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getProjectIcon(item.projectType)}</span>
                                    <Badge className={`${getProjectTypeColor(item.projectType)} text-xs font-medium`}>
                                      {item.projectType.charAt(0).toUpperCase() + item.projectType.slice(1)}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-gray-400 font-mono">
                                    {formatHistoryDate(item.createdAt)}
                                  </span>
                                </div>

                                {/* Address */}
                                <div className="space-y-1">
                                  <p className="text-teal-300 font-medium text-sm line-clamp-1">
                                    {item.address}
                                  </p>
                                </div>

                                {/* Quick stats */}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
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

                              {/* Hover effect indicator */}
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            
                            {index < filteredHistory.length - 1 && (
                              <Separator className="my-3 bg-gray-700/30" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {filteredHistory.length > 0 && (
                    <div className="flex justify-center pt-4 border-t border-gray-700/30">
                      <p className="text-xs text-gray-500">
                        Showing {filteredHistory.length} of {historyData.length} searches
                      </p>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Search History */}
        {showHistory && (
          <Card className="mt-6 bg-gray-800/50 border-gray-600/30">
            <CardHeader>
              <CardTitle className="text-gray-300">Search History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                </div>
              )}
              
              {historyQuery.data && Array.isArray(historyQuery.data) && historyQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {historyQuery.data.map((item: SearchHistoryItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-teal-500/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-300">{item.title}</p>
                        <p className="text-sm text-gray-400">{item.address}</p>
                        <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadHistoryItem(item)}
                        className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
                      >
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No search history found</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results */}
      {permitData && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          <div className="space-y-4 sm:space-y-6">
            <Card className="bg-gray-800/50 border-teal-500/20 backdrop-blur-sm overflow-hidden">
              <CardHeader className="text-center px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-teal-300 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="truncate">DeepSearch Results</span>
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm sm:text-base">
                  Project: {permitData.meta?.projectType} at {permitData.meta?.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4 lg:px-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {/* Responsive tabs - fully visible on all screens */}
                  <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-teal-500/30">
                    <TabsList className="flex w-max min-w-full sm:grid sm:grid-cols-5 sm:w-full bg-gray-900/80 border border-teal-400/30 relative p-2 gap-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-cyan-500/10 animate-pulse"></div>
                    <TabsTrigger value="permits" className="relative text-teal-300 data-[state=active]:bg-teal-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/50 transition-all duration-300 whitespace-nowrap min-w-[90px] flex-shrink-0 text-sm font-medium px-4 py-2">
                      <span className="relative z-10">Permits</span>
                    </TabsTrigger>
                    <TabsTrigger value="contacts" className="relative text-teal-300 data-[state=active]:bg-cyan-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/50 transition-all duration-300 whitespace-nowrap min-w-[90px] flex-shrink-0 text-sm font-medium px-4 py-2">
                      <span className="relative z-10">Contacts</span>
                    </TabsTrigger>
                    <TabsTrigger value="codes" className="relative text-teal-300 data-[state=active]:bg-emerald-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/50 transition-all duration-300 whitespace-nowrap min-w-[90px] flex-shrink-0 text-sm font-medium px-4 py-2">
                      <span className="relative z-10">Codes</span>
                    </TabsTrigger>
                    <TabsTrigger value="process" className="relative text-teal-300 data-[state=active]:bg-blue-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50 transition-all duration-300 whitespace-nowrap min-w-[90px] flex-shrink-0 text-sm font-medium px-4 py-2">
                      <span className="relative z-10">Process</span>
                    </TabsTrigger>
                    <TabsTrigger value="considerations" className="relative text-teal-300 data-[state=active]:bg-amber-500/30 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/50 transition-all duration-300 whitespace-nowrap min-w-[90px] flex-shrink-0 text-sm font-medium px-4 py-2">
                      <span className="relative z-10">Alerts</span>
                    </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="permits" className="space-y-4">
                    {permitData.requiredPermits && permitData.requiredPermits.length > 0 ? (
                      <div className="space-y-4">
                        {permitData.requiredPermits.map((permit: any, idx: number) => (
                          <div key={idx} className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 via-cyan-400/20 to-blue-400/20 animate-pulse rounded-lg"></div>
                            <Card className="relative bg-gray-800/90 border-teal-400/30 backdrop-blur-sm hover:shadow-lg hover:shadow-teal-400/20 transition-all duration-300 m-1">
                              <CardHeader>
                                <CardTitle className="text-teal-300 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  {permit.name}
                                </CardTitle>
                                <CardDescription className="text-teal-200/70">
                                  {permit.issuingAuthority}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Responsible Party */}
                                {permit.responsibleParty && (
                                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                    <h4 className="text-amber-400 font-medium mb-1 flex items-center gap-2">
                                      👤 Who's Responsible
                                    </h4>
                                    <p className="text-amber-200 text-sm font-medium">{permit.responsibleParty}</p>
                                  </div>
                                )}

                                {permit.description && (
                                  <p className="text-gray-300 text-sm">{permit.description}</p>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4">
                                  {permit.estimatedTimeline && (
                                    <div>
                                      <h4 className="text-teal-400 font-medium mb-1">Timeline</h4>
                                      <p className="text-sm text-gray-300">{permit.estimatedTimeline}</p>
                                    </div>
                                  )}
                                  {permit.averageCost && (
                                    <div>
                                      <h4 className="text-teal-400 font-medium mb-1">Cost</h4>
                                      <p className="text-sm text-gray-300">{permit.averageCost}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Required Documents */}
                                {permit.requiredDocuments && permit.requiredDocuments.length > 0 && (
                                  <div>
                                    <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                      📋 Required Documents
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                      {permit.requiredDocuments.map((doc: string, docIdx: number) => (
                                        <div key={docIdx} className="flex items-center gap-2 text-sm bg-purple-500/10 p-2 rounded border-l-2 border-purple-400">
                                          <span className="text-purple-300">•</span>
                                          <span className="text-gray-300">{doc}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Official Links */}
                                <div className="space-y-3">
                                  {permit.applicationFormUrl && (
                                    <a 
                                      href={permit.applicationFormUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 hover:bg-blue-500/20 transition-colors group"
                                    >
                                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30">
                                        📄
                                      </div>
                                      <div>
                                        <h4 className="text-blue-300 font-medium">Application Form</h4>
                                        <p className="text-blue-200/70 text-sm">Download official permit application</p>
                                      </div>
                                      <div className="ml-auto text-blue-400">→</div>
                                    </a>
                                  )}

                                  {permit.website && (
                                    <a 
                                      href={permit.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 bg-green-500/10 border border-green-400/30 rounded-lg p-3 hover:bg-green-500/20 transition-colors group"
                                    >
                                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30">
                                        🌐
                                      </div>
                                      <div>
                                        <h4 className="text-green-300 font-medium">Official Website</h4>
                                        <p className="text-green-200/70 text-sm">Visit department website</p>
                                      </div>
                                      <div className="ml-auto text-green-400">→</div>
                                    </a>
                                  )}

                                  {permit.contactPhone && (
                                    <a 
                                      href={`tel:${permit.contactPhone.replace(/\D/g, '')}`}
                                      className="flex items-center gap-3 bg-teal-500/10 border border-teal-400/30 rounded-lg p-3 hover:bg-teal-500/20 transition-colors group"
                                    >
                                      <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center group-hover:bg-teal-500/30">
                                        📞
                                      </div>
                                      <div>
                                        <h4 className="text-teal-300 font-medium">Call Department</h4>
                                        <p className="text-teal-200/70 text-sm font-mono">{permit.contactPhone}</p>
                                      </div>
                                      <div className="ml-auto text-teal-400">→</div>
                                    </a>
                                  )}
                                </div>

                                {/* Submission Method */}
                                {permit.submissionMethod && (
                                  <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-3">
                                    <h4 className="text-cyan-400 font-medium mb-1 flex items-center gap-2">
                                      📤 How to Submit
                                    </h4>
                                    <p className="text-cyan-200 text-sm">{permit.submissionMethod}</p>
                                  </div>
                                )}

                                {permit.requirements && (
                                  <div>
                                    <h4 className="text-cyan-400 font-medium mb-2">Additional Requirements</h4>
                                    <p className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded border-l-4 border-cyan-400">
                                      {permit.requirements}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-teal-300">No specific permits required</h3>
                        <p className="text-gray-400">
                          According to available information, your project may not require special permits.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Contacts Tab */}
                  <TabsContent value="contacts" className="space-y-4">
                    {(permitData.contactInformation && permitData.contactInformation.length > 0) || permitData.requiredPermits ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Extract contacts from permits if contactInformation is empty */}
                        {(permitData.contactInformation || permitData.requiredPermits.map((permit: any) => ({
                          department: permit.issuingAuthority,
                          phone: permit.contactPhone,
                          email: permit.email || permit.website?.includes('@') ? permit.website : null,
                          website: permit.website,
                          address: permit.address,
                          hours: permit.hours
                        }))).map((contact: any, idx: number) => (
                          <div key={idx} className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-teal-400/20 to-blue-400/20 animate-pulse rounded-lg"></div>
                            <Card className="relative bg-gray-800/90 border-cyan-400/30 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-400/20 transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="text-cyan-300 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  {contact.department || "Department"}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {contact.phone && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">📞</div>
                                    <div>
                                      <p className="text-xs text-gray-400">Direct Line</p>
                                      <a 
                                        href={`tel:${contact.phone.replace(/\D/g, '')}`}
                                        className="text-teal-300 font-mono hover:text-teal-200 hover:underline transition-colors cursor-pointer"
                                      >
                                        {contact.phone}
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">📧</div>
                                    <div>
                                      <p className="text-xs text-gray-400">Email</p>
                                      <a 
                                        href={`mailto:${contact.email}`}
                                        className="text-cyan-300 font-mono text-sm hover:text-cyan-200 hover:underline transition-colors cursor-pointer"
                                      >
                                        {contact.email}
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {contact.address && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">📍</div>
                                    <div>
                                      <p className="text-xs text-gray-400">Address</p>
                                      <a 
                                        href={`https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-300 text-sm hover:text-blue-200 hover:underline transition-colors cursor-pointer"
                                      >
                                        {contact.address}
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {contact.hours && (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">🕒</div>
                                    <div>
                                      <p className="text-xs text-gray-400">Hours</p>
                                      <p className="text-emerald-300 text-sm">{contact.hours}</p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                          📞
                        </div>
                        <h3 className="text-lg font-medium text-cyan-300">Contact Info Loading...</h3>
                        <p className="text-gray-400">Premium contact details will appear here</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Building Codes Tab */}
                  <TabsContent value="codes" className="space-y-4">
                    <div className="space-y-4">
                      {/* Extract and display building codes from permit requirements */}
                      {permitData.requiredPermits && permitData.requiredPermits.map((permit: any, idx: number) => {
                        // Extract building codes from permit requirements
                        const codes = [];
                        if (permit.requirements && permit.requirements.includes('California')) {
                          codes.push({
                            title: "California Building Code (CBC)",
                            code: "Title 24, Part 2",
                            description: "State building standards that apply to all construction projects in California",
                            compliance: "Mandatory compliance required for all permits"
                          });
                        }
                        if (permit.requirements && permit.requirements.includes('Electrical')) {
                          codes.push({
                            title: "California Electrical Code (CEC)",
                            code: "Title 24, Part 3",
                            description: "Electrical installation standards and safety requirements",
                            compliance: "Required for all electrical work"
                          });
                        }
                        if (projectType === 'electrical') {
                          codes.push({
                            title: "National Electrical Code (NEC)",
                            code: "NFPA 70",
                            description: "National standard for electrical installation and safety",
                            compliance: "Must follow current NEC standards"
                          });
                        }
                        if (projectType === 'plumbing') {
                          codes.push({
                            title: "California Plumbing Code (CPC)",
                            code: "Title 24, Part 5",
                            description: "Plumbing system installation and safety standards",
                            compliance: "Required for all plumbing modifications"
                          });
                        }
                        if (projectType === 'concrete' || projectType === 'addition') {
                          codes.push({
                            title: "Structural Engineering Standards",
                            code: "CBC Chapter 16-23",
                            description: "Structural design and concrete construction requirements",
                            compliance: "Engineer stamped plans may be required"
                          });
                        }
                        
                        // Add local codes
                        codes.push({
                          title: `${permitData.meta?.location || 'Local'} Municipal Code`,
                          code: "Local Ordinances",
                          description: "City-specific building requirements and zoning restrictions",
                          compliance: "Must comply with local amendments to state codes"
                        });

                        return codes.length > 0 ? (
                          <div key={idx} className="space-y-3">
                            <h4 className="text-emerald-300 font-semibold border-b border-emerald-500/30 pb-2">
                              Building Codes for {permit.name}
                            </h4>
                            {codes.map((code, codeIdx) => (
                              <div key={codeIdx} className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 rounded-lg"></div>
                                <Card className="relative bg-gray-800/70 border-emerald-400/30 backdrop-blur-sm">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                        📋
                                      </div>
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                          <h5 className="text-emerald-300 font-semibold">{code.title}</h5>
                                          <Badge variant="outline" className="border-emerald-400/30 text-emerald-300">
                                            {code.code}
                                          </Badge>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                          {code.description}
                                        </p>
                                        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3 mt-3">
                                          <p className="text-emerald-200 text-sm font-medium">
                                            ✓ {code.compliance}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            ))}
                          </div>
                        ) : null;
                      })}

                      {/* Additional general building codes */}
                      <div className="mt-6">
                        <h4 className="text-emerald-300 font-semibold border-b border-emerald-500/30 pb-2 mb-4">
                          General Construction Requirements
                        </h4>
                        <div className="space-y-3">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 rounded-lg"></div>
                            <Card className="relative bg-gray-800/70 border-emerald-400/30 backdrop-blur-sm">
                              <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <h5 className="text-emerald-300 font-medium">📏 Setback Requirements</h5>
                                    <ul className="text-gray-300 text-sm space-y-1">
                                      <li>• Front setback: Check local zoning</li>
                                      <li>• Side setback: Minimum 5 feet typical</li>
                                      <li>• Rear setback: Varies by zone</li>
                                    </ul>
                                  </div>
                                  <div className="space-y-3">
                                    <h5 className="text-emerald-300 font-medium">🏗️ Construction Standards</h5>
                                    <ul className="text-gray-300 text-sm space-y-1">
                                      <li>• Licensed contractor required</li>
                                      <li>• Proper permits before work</li>
                                      <li>• Inspections at key milestones</li>
                                    </ul>
                                  </div>
                                  <div className="space-y-3">
                                    <h5 className="text-emerald-300 font-medium">🔧 Material Standards</h5>
                                    <ul className="text-gray-300 text-sm space-y-1">
                                      <li>• Use approved materials only</li>
                                      <li>• Check manufacturer specifications</li>
                                      <li>• Maintain material certifications</li>
                                    </ul>
                                  </div>
                                  <div className="space-y-3">
                                    <h5 className="text-emerald-300 font-medium">⚠️ Safety Requirements</h5>
                                    <ul className="text-gray-300 text-sm space-y-1">
                                      <li>• OSHA safety protocols</li>
                                      <li>• Proper fall protection</li>
                                      <li>• Site safety documentation</li>
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="process" className="space-y-4">
                    {permitData.process && permitData.process.length > 0 ? (
                      <div className="space-y-4">
                        {permitData.process.map((step: any, idx: number) => (
                          <div key={idx} className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-cyan-400/10 to-teal-400/10 rounded-lg"></div>
                            <Card className="relative bg-gray-800/70 border-blue-400/30 backdrop-blur-sm">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <h4 className="text-blue-300 font-semibold">
                                      {typeof step === 'string' ? `Step ${idx + 1}` : (step.step || `Step ${idx + 1}`)}
                                    </h4>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                      {typeof step === 'string' ? step : step.step || step.description || 'Process step details'}
                                    </p>
                                    
                                    {/* Additional step details */}
                                    {typeof step === 'object' && step.timing && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                          ⏱️ {step.timing}
                                        </span>
                                        {step.responsibleParty && (
                                          <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                                            👤 {step.responsibleParty}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Required documents for this step */}
                                    {typeof step === 'object' && step.requiredDocuments && step.requiredDocuments.length > 0 && (
                                      <div className="mt-3">
                                        <h5 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Required Documents:</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {(Array.isArray(step.requiredDocuments) ? step.requiredDocuments : [step.requiredDocuments]).map((doc: string, docIdx: number) => (
                                            <span key={docIdx} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded border border-gray-600/30">
                                              📄 {doc}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Official links */}
                                    {typeof step === 'object' && step.officialLinks && step.officialLinks.length > 0 && (
                                      <div className="mt-3">
                                        <h5 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Official Resources:</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {step.officialLinks.map((link: string, linkIdx: number) => (
                                            <a
                                              key={linkIdx}
                                              href={link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded border border-blue-400/30 hover:bg-blue-500/30 transition-colors"
                                            >
                                              🔗 Official Form
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-300">Process information loading...</h3>
                        <p className="text-gray-400">Step-by-step process will appear here.</p>
                      </div>
                    )}
                  </TabsContent>



                  <TabsContent value="considerations" className="space-y-4">
                    {permitData.specialConsiderations && permitData.specialConsiderations.length > 0 ? (
                      <div className="space-y-4">
                        {permitData.specialConsiderations.map((consideration: any, idx: number) => {
                          // Parse the consideration if it's a string containing JSON-like data
                          let alertData: any = {};
                          let alertText = '';
                          
                          if (typeof consideration === 'string') {
                            // Try to extract structured data from string
                            try {
                              // Check if it looks like structured data
                              if (consideration.includes(':') && consideration.includes('"')) {
                                // Parse JSON-like string structure
                                const matches = consideration.match(/"([^"]+)":"([^"]+)"/g);
                                if (matches) {
                                  matches.forEach(match => {
                                    const [key, value] = match.replace(/"/g, '').split(':');
                                    alertData[key] = value;
                                  });
                                  alertText = consideration;
                                } else {
                                  alertText = consideration;
                                }
                              } else {
                                alertText = consideration;
                              }
                            } catch {
                              alertText = consideration;
                            }
                          } else {
                            alertData = consideration;
                            alertText = JSON.stringify(consideration);
                          }

                          return (
                            <div key={idx} className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-red-400/10 rounded-lg"></div>
                              <Card className="relative bg-gray-800/70 border-amber-400/30 backdrop-blur-sm">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-black shadow-lg">
                                      ⚠️
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <h4 className="text-amber-300 font-semibold">Critical Alert #{idx + 1}</h4>
                                      
                                      {/* Specific regulations */}
                                      {alertData.specificLocalRegulations && (
                                        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                                          <h5 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                                            📋 Local Regulations
                                          </h5>
                                          <p className="text-red-200 text-sm">{alertData.specificLocalRegulations}</p>
                                        </div>
                                      )}

                                      {/* Environmental considerations */}
                                      {alertData.environmental && (
                                        <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3">
                                          <h5 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                                            🌿 Environmental Requirements
                                          </h5>
                                          <p className="text-green-200 text-sm">{alertData.environmental}</p>
                                        </div>
                                      )}

                                      {/* Zoning restrictions */}
                                      {alertData.zoning && (
                                        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                                          <h5 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                                            🏢 Zoning Restrictions
                                          </h5>
                                          <p className="text-blue-200 text-sm">{alertData.zoning}</p>
                                        </div>
                                      )}

                                      {/* Penalties */}
                                      {alertData.penalties && (
                                        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3">
                                          <h5 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                                            ⚖️ Penalties for Non-Compliance
                                          </h5>
                                          <p className="text-red-200 text-sm font-medium">{alertData.penalties}</p>
                                        </div>
                                      )}

                                      {/* Deadlines */}
                                      {alertData.deadlines && (
                                        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                          <h5 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                                            ⏰ Critical Deadlines
                                          </h5>
                                          <p className="text-amber-200 text-sm font-medium">{alertData.deadlines}</p>
                                        </div>
                                      )}

                                      {/* If no structured data, show the raw text in a nice format */}
                                      {Object.keys(alertData).length === 0 && (
                                        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                          <p className="text-amber-200 text-sm leading-relaxed">{alertText}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-300">No Critical Alerts</h3>
                        <p className="text-gray-400">No special considerations or alerts identified for this project.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="max-w-6xl mx-auto p-6">
          <Card className="bg-gray-800/50 border-teal-500/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                <p className="text-teal-300">Running DeepSearch analysis...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto p-6">
          <Card className="bg-red-900/20 border-red-500/20">
            <CardContent className="p-6">
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}