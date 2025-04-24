import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Home, MapPin, User, Calendar, Ruler, ArrowRight } from "lucide-react";

// Interfaz para los datos de la propiedad
interface PropertyData {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  ownerOccupied: boolean;
  verified: boolean;
  ownershipVerified: boolean;
}

const PropertyVerifierPage: React.FC = () => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!address.trim()) {
      toast({
        title: "Dirección requerida",
        description: "Por favor ingresa una dirección para verificar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setPropertyData(null);

    try {
      // Llamada a la API para obtener los detalles de la propiedad
      const response = await fetch(`/api/property/details?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al verificar la propiedad');
      }

      const data = await response.json();
      setPropertyData(data);
      
      // Mostrar un toast de éxito
      toast({
        title: "Verificación exitosa",
        description: "Se han recuperado los detalles de la propiedad",
        variant: "default",
      });
    } catch (err: any) {
      console.error('Error al verificar la propiedad:', err);
      setError(err.message || 'Error al verificar la propiedad');
      
      toast({
        title: "Error de verificación",
        description: err.message || 'No se pudo verificar la propiedad',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Verificador de Propiedad</h1>
        <p className="text-gray-500 mb-8">
          Ingresa la dirección completa de una propiedad para verificar su propietario y detalles.
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buscar propiedad</CardTitle>
            <CardDescription>
              Ingresa la dirección completa incluyendo calle, ciudad, estado y código postal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-2">
              <div className="flex-grow">
                <Input
                  placeholder="123 Main St, Ciudad, Estado 12345"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Verificando...
                  </>
                ) : (
                  <>
                    Verificar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : propertyData ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{propertyData.address}</CardTitle>
                  <CardDescription>{propertyData.propertyType}</CardDescription>
                </div>
                <div>
                  {propertyData.verified ? (
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
              <div className="space-y-4">
                {/* Sección de propietario */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    <h3 className="text-lg font-semibold">Información de propietario</h3>
                  </div>
                  
                  {propertyData.ownershipVerified ? (
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-medium">{propertyData.owner}</p>
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Verificado
                      </Badge>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No verificado</AlertTitle>
                      <AlertDescription>
                        No se pudo verificar la información del propietario
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <p className="text-sm text-gray-500 mt-1">
                    Propiedad {propertyData.ownerOccupied ? 'ocupada por el propietario' : 'no ocupada por el propietario'}
                  </p>
                </div>
                
                <Separator />
                
                {/* Detalles de la propiedad */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Detalles de la propiedad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Home className="h-5 w-5 mr-2 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Superficie</p>
                        <p className="font-medium">{propertyData.sqft.toLocaleString()} ft²</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Tamaño del lote</p>
                        <p className="font-medium">{propertyData.lotSize}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="h-5 w-5 mr-2 text-gray-400 flex items-center justify-center">
                        🛌
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Habitaciones</p>
                        <p className="font-medium">{propertyData.bedrooms}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="h-5 w-5 mr-2 text-gray-400 flex items-center justify-center">
                        🚿
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Baños</p>
                        <p className="font-medium">{propertyData.bathrooms}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Año de construcción</p>
                        <p className="font-medium">{propertyData.yearBuilt}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Ruler className="h-5 w-5 mr-2 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Tipo de propiedad</p>
                        <p className="font-medium">{propertyData.propertyType}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="text-xs text-gray-500">
                La información mostrada es proporcionada por ATTOM Data Solutions y puede no estar actualizada.
                Última verificación: {new Date().toLocaleDateString()}
              </div>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default PropertyVerifierPage;