import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Home, Check, User, Calendar, MapPin, AlertTriangle } from "lucide-react";
import axios from "axios";
import GooglePlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete';

interface PropertyDetails {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  verified: boolean;
  ownerOccupied?: boolean;
}

export default function PropertyOwnershipVerifier() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [placeValue, setPlaceValue] = useState<any>(null);
  const [apiError, setApiError] = useState<boolean>(false);
  const [useManualInput, setUseManualInput] = useState<boolean>(false);

  // Estados que ya no se usan con Google Places Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Detectar errores de la API de Google Maps
  useEffect(() => {
    const handleGoogleMapsError = (event: ErrorEvent) => {
      if (event.message && 
          (event.message.includes("Google Maps JavaScript API") || 
           event.message.includes("Google Maps Places API") ||
           event.message.includes("ApiNotActivatedMapError"))) {
        console.error("Google Maps API error detected:", event.message);
        setApiError(true);
        setUseManualInput(true);
        setError("Error: La API de Google Maps no está configurada correctamente. Por favor verifica que la clave API sea válida y tenga los servicios necesarios habilitados (Maps JavaScript API, Places API, Geocoding API).");
      }
    };

    const validateGoogleMapsKey = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey.length < 20) {
        setApiError(true);
        setUseManualInput(true);
        setError("Error: No se encontró una clave API válida de Google Maps. Verifica la variable de entorno VITE_GOOGLE_MAPS_API_KEY.");
      }
    };

    validateGoogleMapsKey();
    window.addEventListener('error', handleGoogleMapsError);

    return () => {
      window.removeEventListener('error', handleGoogleMapsError);
    };
  }, []);

  // Handler for the old input change method (no longer used)
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  // Manejar la selección de la dirección del autocompletado
  const handlePlaceSelect = async (place: any) => {
    if (place && place.value) {
      try {
        // Obtener la dirección formateada del valor seleccionado
        setAddress(place.value.description);

        // Limpiar cualquier error previo
        setError(null);

        // Obtener más detalles de la ubicación para enriquecer los datos
        const results = await geocodeByAddress(place.value.description);
        if (results && results.length > 0) {
          // Obtener coordenadas
          const latLng = await getLatLng(results[0]);
          console.log("Coordenadas seleccionadas:", latLng);

          // Analizar los componentes de la dirección para extracción de datos
          const addressComponents = results[0].address_components;

          // Extraer información útil como código postal, ciudad, estado, etc.
          let zipCode = '';
          let city = '';
          let state = '';
          let neighborhood = '';

          addressComponents.forEach((component: any) => {
            const types = component.types;

            if (types.includes('postal_code')) {
              zipCode = component.long_name;
            }

            if (types.includes('locality')) {
              city = component.long_name;
            }

            if (types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }

            if (types.includes('neighborhood')) {
              neighborhood = component.long_name;
            }
          });

          console.log('Información adicional:', { zipCode, city, state, neighborhood });

          // Iniciar automáticamente la búsqueda después de seleccionar una dirección
          // con un pequeño retraso para mejor experiencia de usuario
          setTimeout(() => {
            handleSearch();
          }, 300);
        }
      } catch (error) {
        console.error("Error al procesar la dirección seleccionada:", error);
      }
    }
  };

  const handleSearch = async () => {
    if (!address.trim()) {
      setError("Por favor, ingresa una dirección válida");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Primero intentamos obtener datos del API
      console.log('Realizando petición a la API con dirección:', address.trim());
      try {
        const response = await axios.get('/api/property/details', {
          params: { address: address.trim() }
        });

        console.log('Respuesta recibida de la API:', response.status, response.data);

        if (response.data) {
          console.log('Datos de propiedad obtenidos:', response.data);
          setPropertyDetails(response.data);
          setLoading(false);
          return;
        } else {
          console.log('La API respondió pero sin datos');
          throw new Error('No se recibieron datos de la propiedad');
        }
      } catch (apiError: any) {
        console.error('Error específico de la API:', {
          message: apiError.message,
          status: apiError.response?.status,
          data: apiError.response?.data
        });
        
        // Mostramos el error al usuario usando el mensaje del servidor si está disponible
        if (apiError.response?.data?.message) {
          setError(`Error: ${apiError.response.data.message}`);
        } else {
          setError("Error al conectar con el servicio de verificación de propiedades. Por favor, intenta nuevamente.");
        }
        
        // No generamos datos falsos, simplemente retornamos
        setPropertyDetails(null);
        setLoading(false);
        return;
      }

    } catch (err: any) {
      console.error('Error verificando propiedad:', err);
      setError("Error al verificar la propiedad. Por favor, intenta nuevamente.");
      setPropertyDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Verificador de Propiedad</h1>
      <p className="text-muted-foreground mb-6">
        Verifica la propiedad para evitar estafas y asegurarte de que estás tratando con el propietario legítimo.
      </p>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Verificar Propiedad</CardTitle>
            <CardDescription>
              Ingresa la dirección de la propiedad para verificar sus detalles de propiedad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-9">
                  <Label htmlFor="address">Dirección de la Propiedad</Label>

                  {apiError || useManualInput ? (
                    // Entrada manual cuando hay error de Google Maps API
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          id="address"
                          value={address}
                          onChange={handleAddressChange}
                          placeholder="Ingresa la dirección completa de la propiedad"
                          className="pl-9"
                        />
                        <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
                          <MapPin size={16} className="opacity-60" />
                        </div>
                      </div>

                      <Alert className="py-2">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <div className="text-xs">
                          El autocompletado de direcciones no está disponible en este momento. 
                          Por favor, ingresa la dirección completa manualmente.
                        </div>
                      </Alert>
                    </div>
                  ) : (
                    // Autocompletado con Google Maps cuando funciona
                    <div className="relative">
                      <GooglePlacesAutocomplete
                        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                        apiOptions={{ 
                          language: 'es',
                          region: 'mx',
                          libraries: ['places']
                        }}
                        autocompletionRequest={{
                          componentRestrictions: { country: ['mx', 'us', 'es'] },
                          types: ['address']
                        }}
                        selectProps={{
                          value: placeValue,
                          onChange: (value) => {
                            setPlaceValue(value);
                            handlePlaceSelect(value);
                          },
                          placeholder: "Ingresa la dirección completa de la propiedad",
                          noOptionsMessage: () => "No se encontraron resultados",
                          loadingMessage: () => "Buscando direcciones...",
                          styles: {
                            control: (provided) => ({
                              ...provided,
                              minHeight: '42px',
                              height: 'auto',
                              borderRadius: '7px',
                              boxShadow: 'none',
                              borderColor: '#e2e8f0',
                              paddingLeft: '30px',
                              paddingRight: '8px',
                              whiteSpace: 'normal',
                              '&:hover': {
                                borderColor: '#cbd5e1',
                              }
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
                              color: '#334155',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '8px 12px',
                            }),
                            menu: (provided) => ({
                              ...provided,
                              borderRadius: '7px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              zIndex: 100,
                            }),
                            input: (provided) => ({
                              ...provided,
                              fontSize: '14px',
                            }),
                          },
                        }}
                      />
                      <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
                        <MapPin size={16} className="opacity-60" />
                      </div>
                    </div>
                  )}

                  {/* Link para cambiar entre modos manual y autocompletado */}
                  <div className="mt-1">
                    <button 
                      type="button"
                      onClick={() => setUseManualInput(!useManualInput)}
                      className="text-xs text-primary hover:underline"
                    >
                      {useManualInput 
                        ? "Intentar usar autocompletado" 
                        : "Cambiar a entrada manual"}
                    </button>
                  </div>
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
              {Array(6).fill(0).map((_, i) => (
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
            <CardTitle>Detalles de la Propiedad</CardTitle>
            <CardDescription>
              Información verificada sobre la propiedad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="col-span-1 sm:col-span-2 p-3 bg-green-50 rounded-lg border border-green-100 mb-2">
                <div className="flex items-start">
                  <User className="text-green-600 mr-3 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-1">Propiedad verificada de:</h3>
                    <p className="text-lg font-bold text-green-900 flex items-center">
                      {propertyDetails.owner}
                      {propertyDetails.verified && (
                        <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Check className="mr-1" size={12} />
                          Propietario Verificado
                        </span>
                      )}
                      {propertyDetails.ownerOccupied && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Vive en la propiedad
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="flex items-start">
                  <Home className="text-primary mr-3 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Tipo de propiedad</h3>
                    <p className="text-lg font-medium">{propertyDetails.propertyType}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="flex items-start">
                  <Calendar className="text-primary mr-3 mt-1" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Año de construcción</h3>
                    <p className="text-lg font-medium">{propertyDetails.yearBuilt}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="flex items-start">
                  <svg className="text-primary mr-3 mt-1" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M2 7h20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Área habitable</h3>
                    <p className="text-lg font-medium">{propertyDetails.sqft?.toLocaleString() || 'N/A'} pie² / m²</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="flex items-start">
                  <svg className="text-primary mr-3 mt-1" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 12h10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Tamaño del terreno</h3>
                    <p className="text-lg font-medium">{propertyDetails.lotSize}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border">
                <div className="flex items-start">
                  <svg className="text-primary mr-3 mt-1" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 14v-7" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 11v-4" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 11v-4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Habitaciones / Baños</h3>
                    <p className="text-lg font-medium">{propertyDetails.bedrooms} hab / {propertyDetails.bathrooms} baños</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h3 className="text-md font-semibold mb-2">Lo que esto significa para tu proyecto:</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                  <span>La persona que solicita el trabajo es el propietario verificado de la propiedad</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                  <span>Los detalles de la propiedad coinciden con los registros del condado</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
                  <span>No se detectaron gravámenes o problemas financieros que pudieran afectar el pago</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3 text-center">¿Por qué verificar la propiedad?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 backdrop-blur-sm border border-blue-200/20 shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">Prevenir fraudes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Asegúrate de estar tratando con el propietario legítimo para evitar estafas y problemas de pago.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/5 backdrop-blur-sm border border-emerald-200/20 shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-blue-500">Evitar problemas legales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Confirma la autorización adecuada para el trabajo de construcción para evitar disputas y posibles demandas.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 backdrop-blur-sm border border-violet-200/20 shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg text-center bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">Generar confianza</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Muestra profesionalismo al verificar los detalles de la propiedad antes de comenzar cualquier proyecto.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}