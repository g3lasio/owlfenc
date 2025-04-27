import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { CheckCircle, AlertCircle, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import axios from 'axios';

// Schema de validación para cliente
const clientSchema = z.object({
  name: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  email: z.string().email({
    message: 'Por favor introduce un email válido',
  }).optional().or(z.literal('')),
  phone: z.string().min(10, {
    message: 'El teléfono debe tener al menos 10 dígitos',
  }).optional().or(z.literal('')),
  address: z.string().min(5, {
    message: 'Por favor introduce una dirección válida',
  }),
  city: z.string().min(2, {
    message: 'Por favor introduce una ciudad válida',
  }).optional().or(z.literal('')),
  state: z.string().min(2, {
    message: 'Por favor introduce un estado válido',
  }).optional().or(z.literal('')),
  zip: z.string().min(5, {
    message: 'Por favor introduce un código postal válido',
  }).optional().or(z.literal('')),
});

type ClientData = z.infer<typeof clientSchema>;

// Interfaz para las propiedades del componente
interface ClientValidatorProps {
  onClientValidated: (client: ClientData, propertyDetails?: any) => void;
  existingClients?: any[];
}

export function ClientValidator({ onClientValidated, existingClients = [] }: ClientValidatorProps) {
  const [activeTab, setActiveTab] = useState<string>('new');
  const [selectedExistingClient, setSelectedExistingClient] = useState<number | null>(null);
  const [isVerifyingProperty, setIsVerifyingProperty] = useState<boolean>(false);
  const [propertyDetails, setPropertyDetails] = useState<any>(null);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  // Configuración del formulario
  const form = useForm<ClientData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: ''
    },
  });

  // Manejar envío del formulario
  const onSubmit = async (values: ClientData) => {
    try {
      // Si estamos usando un cliente existente
      if (activeTab === 'existing' && selectedExistingClient !== null) {
        const selectedClient = existingClients.find(c => c.id === selectedExistingClient);
        if (selectedClient) {
          onClientValidated(selectedClient, propertyDetails);
          return;
        }
      }
      
      // Si es un cliente nuevo, validar los datos
      onClientValidated(values, propertyDetails);
    } catch (error) {
      console.error('Error al validar cliente:', error);
      toast({
        title: 'Error',
        description: 'Hubo un problema al validar los datos del cliente',
        variant: 'destructive',
      });
    }
  };

  // Manejar selección de cliente existente
  const handleSelectExistingClient = (clientId: number) => {
    setSelectedExistingClient(clientId);
    const selectedClient = existingClients.find(c => c.id === clientId);
    
    if (selectedClient) {
      // Actualizar formulario con datos del cliente seleccionado
      form.reset({
        name: selectedClient.name || '',
        email: selectedClient.email || '',
        phone: selectedClient.phone || '',
        address: selectedClient.address || '',
        city: selectedClient.city || '',
        state: selectedClient.state || '',
        zip: selectedClient.zip || '',
      });
    }
  };

  // Función para verificar propiedad
  const verifyProperty = async () => {
    const address = form.getValues('address');
    const city = form.getValues('city');
    const state = form.getValues('state');
    const zip = form.getValues('zip');
    
    if (!address) {
      toast({
        title: 'Dirección requerida',
        description: 'Por favor introduce una dirección para verificar la propiedad',
        variant: 'destructive',
      });
      return;
    }
    
    setIsVerifyingProperty(true);
    setPropertyError(null);
    
    try {
      // Formatear dirección para la petición
      const formattedAddress = [address, city, state, zip].filter(Boolean).join(', ');
      
      // Hacer petición al API para verificar la propiedad
      const response = await axios.get('/api/property/details', {
        params: { address: formattedAddress }
      });
      
      if (response.data && response.data.property) {
        setPropertyDetails(response.data.property);
        toast({
          title: 'Propiedad verificada',
          description: 'Los detalles de la propiedad se han verificado correctamente',
        });
      } else {
        setPropertyError('No se pudieron encontrar detalles de la propiedad');
        toast({
          title: 'Verificación incompleta',
          description: 'No se pudo obtener información completa de la propiedad',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error al verificar la propiedad:', error);
      setPropertyError('Error al verificar la propiedad');
      toast({
        title: 'Error',
        description: 'Hubo un problema al verificar los detalles de la propiedad',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingProperty(false);
    }
  };

  // Función para obtener sugerencias de dirección
  const handleAddressSelected = (address: any) => {
    if (address) {
      // Extraer componentes de la dirección
      let street = '';
      let city = '';
      let state = '';
      let zip = '';
      
      // Procesar los componentes de la dirección
      if (address.value && address.value.structured_formatting) {
        street = address.value.structured_formatting.main_text || '';
      }
      
      if (address.value && address.value.terms) {
        const terms = address.value.terms;
        if (terms.length >= 3) {
          city = terms[terms.length - 3]?.value || '';
          state = terms[terms.length - 2]?.value || '';
          zip = terms[terms.length - 1]?.value || '';
        }
      }
      
      // Actualizar el formulario
      form.setValue('address', street, { shouldValidate: true });
      form.setValue('city', city, { shouldValidate: true });
      form.setValue('state', state, { shouldValidate: true });
      form.setValue('zip', zip, { shouldValidate: true });
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Información del Cliente</CardTitle>
        <CardDescription>
          Introduce los datos del cliente para el proyecto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="new" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
            <TabsTrigger value="existing" disabled={existingClients.length === 0}>
              Cliente Existente
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="Teléfono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección del Proyecto *</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(newValue) => {
                            field.onChange(newValue);
                            // Eliminar detalles de propiedad previos si se cambia la dirección
                            setPropertyDetails(null);
                          }}
                          onAddressSelected={handleAddressSelected}
                          placeholder="Dirección completa"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ciudad" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="Estado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                          <Input placeholder="Código Postal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={verifyProperty}
                    disabled={isVerifyingProperty || !form.getValues('address')}
                  >
                    {isVerifyingProperty ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⟳</span> Verificando...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Search className="h-4 w-4 mr-2" /> Verificar Propiedad
                      </span>
                    )}
                  </Button>
                  
                  <Button type="submit">Continuar</Button>
                </div>
                
                {propertyDetails && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="font-medium text-green-700">Propiedad Verificada</h3>
                    </div>
                    <div className="pl-7 text-sm space-y-1">
                      <p><strong>Tipo:</strong> {propertyDetails.propertyType || 'No disponible'}</p>
                      <p><strong>Año de Construcción:</strong> {propertyDetails.yearBuilt || 'No disponible'}</p>
                      <p><strong>Superficie (pies²):</strong> {propertyDetails.buildingArea || 'No disponible'}</p>
                      <p><strong>Terreno (pies²):</strong> {propertyDetails.lotSize || 'No disponible'}</p>
                    </div>
                  </div>
                )}
                
                {propertyError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <div>
                        <h3 className="font-medium text-red-700">Error de Verificación</h3>
                        <p className="text-sm text-red-600">{propertyError}</p>
                        <p className="text-sm text-red-600 mt-1">
                          Puedes continuar sin verificar la propiedad, pero algunos detalles pueden no estar disponibles.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="existing">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Selecciona un cliente</h3>
              
              {existingClients.length > 0 ? (
                <div className="space-y-2">
                  {existingClients.map((client) => (
                    <div
                      key={client.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedExistingClient === client.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handleSelectExistingClient(client.id)}
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.address || 'Sin dirección'} 
                        {client.phone ? ` • ${client.phone}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  No hay clientes existentes. Por favor crea un nuevo cliente.
                </div>
              )}
              
              {selectedExistingClient !== null && (
                <div>
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Verificación de Propiedad</h3>
                    
                    <div className="flex items-center justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={verifyProperty}
                        disabled={isVerifyingProperty || !form.getValues('address')}
                      >
                        {isVerifyingProperty ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2">⟳</span> Verificando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Search className="h-4 w-4 mr-2" /> Verificar Propiedad
                          </span>
                        )}
                      </Button>
                      
                      <Button 
                        type="button" 
                        onClick={form.handleSubmit(onSubmit)} 
                        disabled={selectedExistingClient === null}
                      >
                        Continuar
                      </Button>
                    </div>
                    
                    {propertyDetails && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start mb-2">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <h3 className="font-medium text-green-700">Propiedad Verificada</h3>
                        </div>
                        <div className="pl-7 text-sm space-y-1">
                          <p><strong>Tipo:</strong> {propertyDetails.propertyType || 'No disponible'}</p>
                          <p><strong>Año de Construcción:</strong> {propertyDetails.yearBuilt || 'No disponible'}</p>
                          <p><strong>Superficie (pies²):</strong> {propertyDetails.buildingArea || 'No disponible'}</p>
                          <p><strong>Terreno (pies²):</strong> {propertyDetails.lotSize || 'No disponible'}</p>
                        </div>
                      </div>
                    )}
                    
                    {propertyError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                          <div>
                            <h3 className="font-medium text-red-700">Error de Verificación</h3>
                            <p className="text-sm text-red-600">{propertyError}</p>
                            <p className="text-sm text-red-600 mt-1">
                              Puedes continuar sin verificar la propiedad, pero algunos detalles pueden no estar disponibles.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <div>* Campo obligatorio</div>
        <div>La verificación de propiedad es opcional pero recomendada</div>
      </CardFooter>
    </Card>
  );
}