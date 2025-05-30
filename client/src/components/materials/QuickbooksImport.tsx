import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, Link as LinkIcon } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

// Tipo para un item de QuickBooks
interface QuickbooksItem {
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  supplier: string;
  sku: string;
  stock: number;
  minStock: number;
  quickbooksId: string;
}

interface QuickbooksImportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMaterialsImported: (materials: any[]) => void;
}

export const QuickbooksImport = ({ 
  isOpen, 
  onOpenChange,
  onMaterialsImported
}: QuickbooksImportProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<QuickbooksItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<QuickbooksItem[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Escuchar mensajes de la ventana de autenticación
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Verificar que el mensaje es del tipo correcto
      if (event.data && event.data.type === 'QUICKBOOKS_AUTH') {
        console.log('Recibido mensaje de la ventana de autenticación:', event.data);
        
        if (event.data.status === 'success') {
          toast({
            title: "QuickBooks conectado",
            description: "Se ha conectado correctamente con tu cuenta de QuickBooks.",
            duration: 5000
          });
          
          // Abrir el diálogo de importación y recargar la información
          setIsConnected(true);
          loadInventory();
        } else if (event.data.status === 'error') {
          toast({
            title: "Error de conexión",
            description: "No se pudo conectar con QuickBooks. Por favor, inténtelo de nuevo.",
            variant: "destructive",
            duration: 5000
          });
        }
      }
    };
    
    // Agregar el detector de eventos
    window.addEventListener('message', handleAuthMessage);
    
    // Limpiar detector al desmontar
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);
  
  // Verificar si el usuario está conectado a QuickBooks
  useEffect(() => {
    if (isOpen && currentUser) {
      checkConnection();
    }
  }, [isOpen, currentUser]);

  // Comprobar conexión con QuickBooks
  const checkConnection = async () => {
    try {
      setIsChecking(true);
      const response = await axios.get(`/api/quickbooks/connection?userId=${currentUser?.uid}`);
      setIsConnected(response.data.connected);
      
      if (response.data.connected) {
        // Si está conectado, cargar el inventario
        loadInventory();
      }
    } catch (error) {
      console.error("Error al verificar conexión con QuickBooks:", error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Probar la conexión a los servidores de QuickBooks
  const testQuickbooksConnection = async () => {
    try {
      console.log("Probando conexión a servidores de QuickBooks...");
      
      const response = await axios.get('/api/quickbooks/test-connection');
      
      console.log("Resultado de prueba de conexión:", response.data);
      
      return response.data.success;
    } catch (error) {
      console.error("Error al probar conexión con servidores de QuickBooks:", error);
      return false;
    }
  };
  
  // Iniciar proceso de autorización
  const connectQuickbooks = async () => {
    try {
      setIsLoading(true);
      
      // Probar la conexión primero
      const connectionTest = await testQuickbooksConnection();
      
      if (!connectionTest) {
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con los servidores de QuickBooks. Por favor, inténtelo de nuevo más tarde.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Mostrar toast informativo
      toast({
        title: "Conectando con QuickBooks",
        description: "Serás redirigido a la página de autenticación de QuickBooks...",
      });
      
      console.log("Iniciando proceso de conexión con QuickBooks");
      const response = await axios.get(`/api/quickbooks/auth?userId=${currentUser?.uid || 'dev-user-123'}`);
      
      if (!response.data || !response.data.authUrl) {
        throw new Error("No se recibió una URL de autorización válida");
      }
      
      console.log("URL de autorización recibida:", response.data.authUrl);
      
      // Esperar un momento para mostrar el toast antes de redirigir
      setTimeout(() => {
        try {
          // Almacenar en localStorage que se inició un proceso de autenticación
          localStorage.setItem('qbAuthInProgress', 'true');
          localStorage.setItem('qbAuthStartTime', Date.now().toString());
          
          // Abrir en nueva ventana para evitar problemas de CORS y navegación
          const newWindow = window.open(response.data.authUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
          
          if (!newWindow) {
            // Si la ventana no se pudo abrir, intentar el enfoque de redirección
            toast({
              title: "Ventanas emergentes bloqueadas",
              description: "No se pudo abrir la ventana de autenticación. Haciendo redirección completa...",
              duration: 3000
            });
            
            // Guardar la URL actual para regresar después
            localStorage.setItem('qbRedirectFromUrl', window.location.href);
            
            // Redirigir a la página de QuickBooks
            setTimeout(() => {
              window.location.href = response.data.authUrl;
            }, 2000);
          } else {
            // Notificar al usuario sobre la nueva ventana
            toast({
              title: "Ventana de autenticación abierta",
              description: "Se ha abierto una nueva ventana para la autenticación de QuickBooks. Al completar el proceso, regresa a esta ventana.",
              duration: 7000
            });
            
            // Verificar periódicamente si el proceso ha sido completado
            const checkInterval = setInterval(() => {
              if (localStorage.getItem('qbAuthCompleted') === 'true') {
                clearInterval(checkInterval);
                localStorage.removeItem('qbAuthInProgress');
                localStorage.removeItem('qbAuthStartTime');
                localStorage.removeItem('qbAuthCompleted');
                
                // Recargar datos
                setIsConnected(true);
                loadInventory();
                setIsLoading(false);
              }
            }, 1000);
            
            // Establecer un tiempo máximo de espera (2 minutos)
            setTimeout(() => {
              clearInterval(checkInterval);
              setIsLoading(false);
            }, 120000);
          }
        } catch (windowError) {
          console.error("Error al abrir ventana:", windowError);
          toast({
            title: "Error al abrir ventana",
            description: "No se pudo abrir la ventana de autenticación. Intente de nuevo o verifique la configuración de su navegador.",
            variant: "destructive"
          });
          setIsLoading(false);
        }
      }, 1500);
      
    } catch (error) {
      console.error("Error al conectar con QuickBooks:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo iniciar la conexión con QuickBooks. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Cargar inventario de QuickBooks
  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/quickbooks/inventory?userId=${currentUser?.uid}`);
      setItems(response.data.items);
      setSelectedItems([]);
      setSelectAll(false);
    } catch (error) {
      console.error("Error al cargar inventario de QuickBooks:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el inventario de QuickBooks",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Desconectar QuickBooks
  const disconnectQuickbooks = async () => {
    try {
      setIsLoading(true);
      await axios.get(`/api/quickbooks/disconnect?userId=${currentUser?.uid}`);
      setIsConnected(false);
      setItems([]);
      setSelectedItems([]);
      
      toast({
        title: "Desconexión exitosa",
        description: "Se ha desconectado correctamente de QuickBooks"
      });
    } catch (error) {
      console.error("Error al desconectar QuickBooks:", error);
      toast({
        title: "Error",
        description: "No se pudo desconectar de QuickBooks",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Seleccionar o deseleccionar un item
  const toggleItemSelection = (item: QuickbooksItem) => {
    if (selectedItems.some(i => i.quickbooksId === item.quickbooksId)) {
      setSelectedItems(selectedItems.filter(i => i.quickbooksId !== item.quickbooksId));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Seleccionar o deseleccionar todos los items
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...items]);
    }
    setSelectAll(!selectAll);
  };

  // Importar los items seleccionados
  const importSelectedItems = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Seleccione al menos un item para importar",
        variant: "destructive"
      });
      return;
    }

    // Transformar los items para que coincidan con el formato esperado
    const materialsToImport = selectedItems.map(item => ({
      name: item.name,
      description: item.description || '',
      category: item.category,
      unit: item.unit,
      price: item.price,
      supplier: item.supplier || '',
      sku: item.sku || '',
      stock: item.stock || 0,
      minStock: item.minStock || 0,
      quickbooksId: item.quickbooksId
    }));

    // Enviar items al componente padre
    onMaterialsImported(materialsToImport);
    
    // Cerrar diálogo
    onOpenChange(false);
  };

  // Renderizar diferentes contenidos según el estado
  const renderContent = () => {
    if (isChecking) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            Verificando conexión con QuickBooks...
          </p>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <LinkIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Conectar con QuickBooks</h3>
          <p className="text-center text-muted-foreground mb-6 max-w-md">
            Conecta tu cuenta de QuickBooks para importar tu inventario directamente a la aplicación.
          </p>
          <Button 
            onClick={connectQuickbooks} 
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Conectar con QuickBooks
          </Button>
        </div>
      );
    }

    return (
      <div className="py-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadInventory}
              disabled={isLoading}
              className="mr-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            <p className="text-sm text-muted-foreground">
              {items.length} productos disponibles
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={disconnectQuickbooks}
            disabled={isLoading}
          >
            Desconectar
          </Button>
        </div>

        <div className="border rounded-md mb-4">
          <div className="grid grid-cols-12 gap-2 p-2 bg-muted text-xs font-medium">
            <div className="col-span-1 flex items-center">
              <input 
                type="checkbox" 
                checked={selectAll} 
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
            </div>
            <div className="col-span-4">Nombre</div>
            <div className="col-span-2">Categoría</div>
            <div className="col-span-1">Unidad</div>
            <div className="col-span-2">Precio</div>
            <div className="col-span-2">Stock</div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No se encontraron productos en tu inventario de QuickBooks
              </div>
            ) : (
              items.map((item) => (
                <div 
                  key={item.quickbooksId} 
                  className="grid grid-cols-12 gap-2 p-2 text-sm border-t hover:bg-muted/50"
                >
                  <div className="col-span-1 flex items-center">
                    <input 
                      type="checkbox" 
                      checked={selectedItems.some(i => i.quickbooksId === item.quickbooksId)} 
                      onChange={() => toggleItemSelection(item)}
                      className="rounded border-gray-300"
                    />
                  </div>
                  <div className="col-span-4 truncate" title={item.name}>{item.name}</div>
                  <div className="col-span-2 truncate" title={item.category}>{item.category}</div>
                  <div className="col-span-1">{item.unit}</div>
                  <div className="col-span-2">${item.price.toFixed(2)}</div>
                  <div className="col-span-2">{item.stock}</div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {selectedItems.length} productos seleccionados
          </p>
          <Button 
            onClick={importSelectedItems} 
            disabled={isLoading || selectedItems.length === 0}
          >
            Importar Seleccionados
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importar desde QuickBooks</DialogTitle>
          <DialogDescription>
            Importa materiales directamente desde tu inventario de QuickBooks
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        
        {!isChecking && isConnected && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};