import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Plus, Trash2, Edit, Copy } from "lucide-react";

// Definición de tipos
interface ServiceRate {
  id: string;
  name: string;
  type: string;
  unit: string;
  rate: number;
  description: string;
  suggested: boolean;
}

interface PricingCategory {
  id: string;
  name: string;
  services: ServiceRate[];
}

// Datos de ejemplo
const initialCategories: PricingCategory[] = [
  {
    id: "fence-installation",
    name: "Instalación de Cercas",
    services: [
      {
        id: "wood-fence",
        name: "Cerca de Madera",
        type: "Base",
        unit: "ft",
        rate: 35,
        description: "Instalación de cerca de madera estándar (solo mano de obra)",
        suggested: true
      },
      {
        id: "vinyl-fence",
        name: "Cerca de Vinilo",
        type: "Base",
        unit: "ft",
        rate: 45,
        description: "Instalación de cerca de vinilo (solo mano de obra)",
        suggested: true
      },
      {
        id: "chain-link",
        name: "Cerca de Malla Ciclónica",
        type: "Base",
        unit: "ft",
        rate: 25,
        description: "Instalación de cerca de malla ciclónica (solo mano de obra)",
        suggested: true
      }
    ]
  },
  {
    id: "fence-repair",
    name: "Reparación de Cercas",
    services: [
      {
        id: "general-repair",
        name: "Reparación General",
        type: "Reparación",
        unit: "hr",
        rate: 65,
        description: "Reparaciones generales de cercas (cobro por hora)",
        suggested: true
      },
      {
        id: "post-replacement",
        name: "Reemplazo de Postes",
        type: "Reparación",
        unit: "unit",
        rate: 120,
        description: "Reemplazo de postes individuales (precio por unidad)",
        suggested: true
      }
    ]
  },
  {
    id: "additional-services",
    name: "Servicios Adicionales",
    services: [
      {
        id: "fence-removal",
        name: "Demolición de Cercas",
        type: "Adicional",
        unit: "ft",
        rate: 10,
        description: "Remoción de cercas existentes (precio por pie lineal)",
        suggested: true
      },
      {
        id: "fence-painting",
        name: "Pintura de Cercas",
        type: "Adicional",
        unit: "sqft",
        rate: 3.5,
        description: "Servicio de pintura (precio por pie cuadrado)",
        suggested: true
      },
      {
        id: "gate-install",
        name: "Instalación de Puerta",
        type: "Adicional",
        unit: "unit",
        rate: 250,
        description: "Instalación de puertas (precio por unidad)",
        suggested: true
      }
    ]
  }
];

export default function PricingSettings() {
  const [categories, setCategories] = useState<PricingCategory[]>(initialCategories);
  const [activeTab, setActiveTab] = useState<string>("fence-installation");
  
  // Estado para el diálogo de nueva tarifa
  const [isNewServiceDialogOpen, setIsNewServiceDialogOpen] = useState(false);
  const [newService, setNewService] = useState<Partial<ServiceRate>>({
    name: "",
    type: "Base",
    unit: "ft",
    rate: 0,
    description: "",
    suggested: false
  });
  
  // Estado para edición
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Manejo de cambios en el formulario de nueva tarifa
  const handleNewServiceChange = (field: keyof ServiceRate, value: any) => {
    setNewService(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Agregar nueva tarifa
  const handleAddService = () => {
    const activeCategoryIndex = categories.findIndex(cat => cat.id === activeTab);
    
    if (activeCategoryIndex === -1) return;
    
    const updatedCategories = [...categories];
    
    if (isEditMode && editingServiceId) {
      // Modo edición
      const serviceIndex = updatedCategories[activeCategoryIndex].services.findIndex(
        s => s.id === editingServiceId
      );
      
      if (serviceIndex !== -1) {
        updatedCategories[activeCategoryIndex].services[serviceIndex] = {
          ...updatedCategories[activeCategoryIndex].services[serviceIndex],
          ...newService,
          id: editingServiceId
        } as ServiceRate;
      }
    } else {
      // Modo creación
      const newId = `service-${Date.now()}`;
      updatedCategories[activeCategoryIndex].services.push({
        ...newService,
        id: newId
      } as ServiceRate);
    }
    
    setCategories(updatedCategories);
    setIsNewServiceDialogOpen(false);
    resetNewServiceForm();
  };

  // Eliminar servicio
  const handleDeleteService = (serviceId: string) => {
    const activeCategoryIndex = categories.findIndex(cat => cat.id === activeTab);
    
    if (activeCategoryIndex === -1) return;
    
    const updatedCategories = [...categories];
    updatedCategories[activeCategoryIndex].services = updatedCategories[activeCategoryIndex].services.filter(
      service => service.id !== serviceId
    );
    
    setCategories(updatedCategories);
  };

  // Editar servicio
  const handleEditService = (service: ServiceRate) => {
    setNewService({
      name: service.name,
      type: service.type,
      unit: service.unit,
      rate: service.rate,
      description: service.description,
      suggested: service.suggested
    });
    
    setIsEditMode(true);
    setEditingServiceId(service.id);
    setIsNewServiceDialogOpen(true);
  };

  // Duplicar servicio
  const handleDuplicateService = (service: ServiceRate) => {
    const activeCategoryIndex = categories.findIndex(cat => cat.id === activeTab);
    
    if (activeCategoryIndex === -1) return;
    
    const updatedCategories = [...categories];
    const newId = `service-${Date.now()}`;
    
    updatedCategories[activeCategoryIndex].services.push({
      ...service,
      id: newId,
      name: `${service.name} (Copia)`,
      suggested: false
    });
    
    setCategories(updatedCategories);
  };

  // Resetear formulario
  const resetNewServiceForm = () => {
    setNewService({
      name: "",
      type: "Base",
      unit: "ft",
      rate: 0,
      description: "",
      suggested: false
    });
    setIsEditMode(false);
    setEditingServiceId(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-2">Configuración de Precios y Tarifas</h1>
      <p className="text-muted-foreground mb-6">
        Configura las tarifas para tus servicios de cercas y vallas
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Button onClick={() => {
            resetNewServiceForm();
            setIsNewServiceDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Servicio
          </Button>
        </div>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>
                  Define tus tarifas para {category.name.toLowerCase()}. Los precios deben reflejar solo el costo de mano de obra, sin incluir materiales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {category.services.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Servicio</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Tarifa ($)</TableHead>
                        <TableHead className="text-center w-[100px]">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            <div>
                              {service.name}
                              <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{service.type}</TableCell>
                          <TableCell>
                            {service.unit === "ft" && "Pie lineal"}
                            {service.unit === "sqft" && "Pie cuadrado"}
                            {service.unit === "hr" && "Hora"}
                            {service.unit === "unit" && "Unidad"}
                          </TableCell>
                          <TableCell className="text-right font-medium">${service.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            {service.suggested ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                Sugerido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                                Personalizado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditService(service)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDuplicateService(service)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteService(service.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No hay servicios configurados. Haz clic en "Agregar Servicio" para comenzar.
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  <Info className="h-3 w-3 inline-block mr-1" />
                  Las tarifas sugeridas están basadas en promedios de la industria y pueden requerir ajustes según tu región.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Diálogo para agregar/editar servicios */}
      <Dialog open={isNewServiceDialogOpen} onOpenChange={setIsNewServiceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Servicio" : "Agregar Nuevo Servicio"}</DialogTitle>
            <DialogDescription>
              Define los detalles del servicio y la tarifa que cobras por la mano de obra.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={newService.name}
                onChange={(e) => handleNewServiceChange('name', e.target.value)}
                className="col-span-3"
                placeholder="Ej: Cerca de Madera Premium"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select
                value={newService.type}
                onValueChange={(value) => handleNewServiceChange('type', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Base">Base</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Reparación">Reparación</SelectItem>
                  <SelectItem value="Adicional">Adicional</SelectItem>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">
                Unidad
              </Label>
              <Select
                value={newService.unit}
                onValueChange={(value) => handleNewServiceChange('unit', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ft">Pie lineal (ft)</SelectItem>
                  <SelectItem value="sqft">Pie cuadrado (sqft)</SelectItem>
                  <SelectItem value="hr">Hora (hr)</SelectItem>
                  <SelectItem value="unit">Por unidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rate" className="text-right">
                Tarifa ($)
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newService.rate}
                  onChange={(e) => handleNewServiceChange('rate', parseFloat(e.target.value))}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={newService.description}
                onChange={(e) => handleNewServiceChange('description', e.target.value)}
                className="col-span-3"
                placeholder="Describe brevemente este servicio"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewServiceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddService}>
              {isEditMode ? "Guardar Cambios" : "Agregar Servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sección de Tarifas Globales */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tarifas Globales y Ajustes</CardTitle>
          <CardDescription>
            Configura ajustes de precios que se aplicarán a todos tus servicios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tasa de mano de obra por hora</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                  <Input className="pl-7" placeholder="65.00" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Tarifa base que usas para calcular costos de mano de obra
                </p>
              </div>

              <div className="space-y-2">
                <Label>Margen de beneficio (%)</Label>
                <div className="relative">
                  <Input placeholder="25" />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Porcentaje de ganancia aplicado a tus servicios
                </p>
              </div>

              <div className="space-y-2">
                <Label>Ajuste regional (%)</Label>
                <div className="relative">
                  <Input placeholder="0" />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ajuste basado en tu ubicación geográfica
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Redondear precios finales</Label>
                <p className="text-xs text-muted-foreground">
                  Redondea automáticamente los precios a valores más fáciles de comunicar
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Mostrar precios sugeridos en estimaciones</Label>
                <p className="text-xs text-muted-foreground">
                  Activar para mostrar tarifas sugeridas junto a tus tarifas personalizadas
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-5">
          <Button variant="outline">Restablecer Valores Predeterminados</Button>
          <Button>Guardar Configuración</Button>
        </CardFooter>
      </Card>

      {/* Sección de ayuda */}
      <Card className="mt-8 bg-sky-50 border-sky-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sky-700 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Consejos para establecer precios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sky-900">
            <li>
              <strong>Separa materiales de mano de obra:</strong> Las tarifas aquí deben reflejar solo el costo de tu trabajo, no de los materiales.
            </li>
            <li>
              <strong>Considera tus costos operativos:</strong> Incluye gastos como transporte, seguro, herramientas y licencias.
            </li>
            <li>
              <strong>Evalúa la competencia:</strong> Investiga las tarifas promedio en tu área para mantenerte competitivo.
            </li>
            <li>
              <strong>Valora tu experiencia:</strong> Si tienes más experiencia o certificaciones, puedes justificar tarifas más altas.
            </li>
            <li>
              <strong>Ajusta por complejidad:</strong> Proyectos complejos o con acceso difícil deberían tener tarifas adicionales.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}