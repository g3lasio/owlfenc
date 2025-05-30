import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Search, 
  Star, 
  Home, 
  User, 
  MapPin, 
  CalendarDays,
  Check,
  Trash,
  LayoutList,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

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

export default function PropertySearchHistory({
  onSelectHistory
}: {
  onSelectHistory: (historyItem: PropertySearchHistoryItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener el historial de búsquedas
  const { data: historyItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/property/history'],
    staleTime: 30000, // 30 segundos antes de considerar los datos obsoletos
  });
  
  // Filtrar elementos del historial basado en términos de búsqueda
  const filteredHistoryItems = useMemo(() => {
    if (!historyItems || !Array.isArray(historyItems)) return [];
    
    return historyItems.filter((item: PropertySearchHistoryItem) => {
      // Primero filtrar por favoritos si está activado
      if (showFavoritesOnly && !item.isFavorite) {
        return false;
      }
      
      // Luego filtrar por término de búsqueda
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const addressMatch = item.address?.toLowerCase().includes(searchLower);
      const titleMatch = item.title?.toLowerCase().includes(searchLower);
      const ownerMatch = item.ownerName?.toLowerCase().includes(searchLower);
      
      return addressMatch || titleMatch || ownerMatch;
    });
  }, [historyItems, searchTerm, showFavoritesOnly]);

  // Función para marcar un elemento como favorito
  const toggleFavorite = async (id: number, currentState: boolean) => {
    try {
      await axios.post(`/api/property/history/${id}/favorite`, {
        isFavorite: !currentState,
      });
      
      // Invalidar la consulta para refrescar los datos
      queryClient.invalidateQueries({
        queryKey: ['/api/property/history'],
      });
      
      toast({
        title: !currentState ? 'Marcado como favorito' : 'Eliminado de favoritos',
        description: 'El historial ha sido actualizado',
      });
    } catch (error) {
      console.error('Error al cambiar estado de favorito:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado de favorito',
      });
    }
  };

  // Función para seleccionar un elemento del historial
  const handleSelectHistory = (item: PropertySearchHistoryItem) => {
    onSelectHistory(item);
    setIsOpen(false);
  };

  // Formatear la fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy, HH:mm', { locale: es });
    } catch (error) {
      return 'Fecha desconocida';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Clock className="h-4 w-4" />
          <span>Historial</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Historial de búsquedas</DialogTitle>
              <DialogDescription>
                Consulta y recupera tus búsquedas anteriores de propiedades
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()}
              title="Recargar historial"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Barra de búsqueda y filtros */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar dirección o propietario"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Button 
            variant={showFavoritesOnly ? "default" : "outline"} 
            size="icon"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title={showFavoritesOnly ? "Mostrar todos" : "Mostrar sólo favoritos"}
          >
            <Star className="h-4 w-4" fill={showFavoritesOnly ? "currentColor" : "none"} />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            Error al cargar el historial
          </div>
        ) : historyItems?.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p>No se encontró historial de búsquedas</p>
            <p className="text-sm mt-1">
              Tus búsquedas de propiedades aparecerán aquí
            </p>
          </div>
        ) : filteredHistoryItems.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            <Filter className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p>No se encontraron resultados para tu búsqueda</p>
            <p className="text-sm mt-1">
              Intenta con otros términos o quita los filtros
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSearchTerm('');
                setShowFavoritesOnly(false);
              }}
              className="mt-4"
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-2 border-b mb-2 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredHistoryItems.length} {filteredHistoryItems.length === 1 ? 'resultado' : 'resultados'}
              </span>
              {searchTerm || showFavoritesOnly ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setShowFavoritesOnly(false);
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
            <div className="space-y-4 p-1">
              {filteredHistoryItems.map((item: PropertySearchHistoryItem) => (
                <div
                  key={item.id}
                  className="relative flex flex-col space-y-2 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">{item.title || item.address}</h4>
                        {item.isFavorite && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            <Star className="mr-1 h-3 w-3" fill="currentColor" />
                            Favorito
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-1 mt-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mr-1 opacity-70" />
                          <span>{item.address}</span>
                        </div>
                        
                        {item.ownerName && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5 mr-1 opacity-70" />
                            <span>{item.ownerName}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5 mr-1 opacity-70" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(item.id, item.isFavorite)}
                        title={item.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
                      >
                        <Star 
                          className="h-4 w-4" 
                          fill={item.isFavorite ? "currentColor" : "none"} 
                        />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleSelectHistory(item)}
                    >
                      <Search className="mr-2 h-3.5 w-3.5" />
                      Cargar búsqueda
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}