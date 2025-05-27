import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import GooglePlacesAutocompleteComponent from "@/components/ui/google-places-autocomplete";
import { propertyVerifierService, PropertyDetails, OwnerHistoryEntry } from "@/services/propertyVerifierService";
import PropertySearchHistory from "@/components/property/PropertySearchHistory";
import { useQueryClient } from '@tanstack/react-query';

export default function PropertyOwnershipVerifier() {
  // Obtener la suscripción del usuario
  const { data: userSubscription } = useQuery({
    queryKey: ["/api/subscription/user-subscription"],
    throwOnError: false,
  });

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] =
    useState<PropertyDetails | null>(null);
  const { toast } = useToast();

  // Manejar la selección de lugar desde el autocompletado
  const handlePlaceSelect = (placeData: any) => {
    console.log("📍 [PropertyVerifier] Lugar seleccionado:", placeData);
    
    if (placeData && placeData.address) {
      // Limpiar cualquier error previo
      setError(null);
      
      // Iniciar automáticamente la búsqueda después de seleccionar una dirección
      setTimeout(() => {
        handleSearch();
      }, 300);
    }
  };

  // Manejar la selección de un elemento del historial
  const handleSelectHistory = (historyItem: any) => {
    if (historyItem && historyItem.results) {
      // Actualizar la dirección visible
      setAddress(historyItem.address);
      
      // Establecer los detalles de la propiedad desde el historial
      setPropertyDetails(historyItem.results);
      
      // Limpiar cualquier error previo
      setError(null);
      
      // Mostrar notificación de éxito
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
  };

  const queryClient = useQueryClient();

  const handleSearch = async () => {
    if (!address.trim()) {
      setError("Por favor, ingresa una dirección válida");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Verificando propiedad con dirección:", address.trim());
      
      // Usar el servicio actualizado que se conecta al wrapper de ATTOM externo
      const propertyData = await propertyVerifierService.verifyProperty(address);
      
      console.log("Datos de propiedad obtenidos:", propertyData);
      setPropertyDetails(propertyData);
      
      // Después de una búsqueda exitosa, invalidamos la caché del historial
      // para que se actualice automáticamente
      queryClient.invalidateQueries({
        queryKey: ['/api/property/history'],
      });
      
    } catch (err: any) {
      console.error("Error verificando propiedad:", err);
      
      // Mostrar mensaje de error específico al usuario
      setError(err.message || "Error al verificar la propiedad. Por favor, intenta nuevamente.");
      setPropertyDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-center">Verificador de Propiedad</h1>
      <p className="text-muted-foreground mb-6 text-center">
        Verifica la propiedad para evitar estafas y asegurarte de que estás
        tratando con el propietario legítimo.
      </p>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <div className="flex-1">
                <CardTitle className="text-center">Verificar Propiedad</CardTitle>
                <CardDescription className="text-center">
                  Ingresa la dirección de la propiedad para verificar sus detalles
                  de propiedad
                </CardDescription>
              </div>
              <div className="flex-shrink-0">
                <PropertySearchHistory onSelectHistory={handleSelectHistory} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-9">
                  <Label htmlFor="address">Dirección de la Propiedad</Label>
                  <GooglePlacesAutocompleteComponent
                    value={address}
                    onChange={setAddress}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Ingresa la dirección de la propiedad"
                    countries={["mx", "us", "es"]}
                    language="es"
                    region="mx"
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 flex items-end">
                  <Button
                    className="w-full"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-2/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : propertyDetails ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col items-center text-center">
              <div className="mb-2">
                <CardTitle className="text-center">{propertyDetails.address}</CardTitle>
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
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Check className="mr-1" size={12} />
                            Verificado
                          </Badge>
                        )}
                        {propertyDetails.ownerOccupied && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
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
                      {propertyDetails.propertyType.split('/')[0]}
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
                      {propertyDetails.bedrooms || "N/A"}/{propertyDetails.bathrooms || "N/A"}
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
                      <span className="text-xs">
                        {propertyDetails.lotSize}
                      </span>
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
                      ¡No te dejes chingar, primo! Si eres chingón, cobra como chingón. 
                      ¡No te dejes chamaquear!
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
