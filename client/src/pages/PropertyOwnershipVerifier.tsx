import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Home, Check, User, Calendar } from "lucide-react";
import axios from "axios";

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

  const handleSearch = async () => {
    if (!address.trim()) {
      setError("Por favor, ingresa una dirección válida");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/property-verification', {
        params: { address: address.trim() }
      });
      
      if (response.data) {
        setPropertyDetails(response.data);
      } else {
        setError("No se encontró información para esta dirección");
        setPropertyDetails(null);
      }
    } catch (err: any) {
      console.error('Error verificando propiedad:', err);
      setError(err.response?.data?.message || "Error al verificar la propiedad. Por favor, intenta nuevamente.");
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
                  <Input 
                    id="address" 
                    placeholder="Ingresa la dirección completa de la propiedad" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    <p className="text-lg font-medium">{propertyDetails.sqft.toLocaleString()} pie² / m²</p>
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
        <h2 className="text-xl font-semibold mb-3">¿Por qué verificar la propiedad?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prevenir fraudes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Asegúrate de estar tratando con el propietario legítimo para evitar estafas y problemas de pago.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evitar problemas legales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Confirma la autorización adecuada para el trabajo de construcción para evitar disputas y posibles demandas.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generar confianza</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Muestra profesionalismo al verificar los detalles de la propiedad antes de comenzar cualquier proyecto.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}