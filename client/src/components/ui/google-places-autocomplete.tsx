import React, { useState, useEffect, useCallback } from 'react';
import GooglePlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from "react-google-places-autocomplete";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertTriangle, CheckCircle } from "lucide-react";

interface GooglePlacesAutocompleteProps {
  value?: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (placeData: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  countries?: string[];
  language?: string;
  region?: string;
}

export default function GooglePlacesAutocompleteComponent({
  value = "",
  onChange,
  onPlaceSelect,
  placeholder = "Ingresa una dirección",
  disabled = false,
  className = "",
  countries = ["mx", "us", "es"],
  language = "es",
  region = "mx"
}: GooglePlacesAutocompleteProps) {
  const [placeValue, setPlaceValue] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useManualInput, setUseManualInput] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [manualAddress, setManualAddress] = useState<string>(value);

  // Verificar estado de Google Maps API
  const checkGoogleMapsAPI = useCallback(() => {
    console.log("🗺️ [GooglePlaces] Verificando estado de Google Maps API...");
    
    // Información detallada del dominio actual
    const currentDomain = window.location.hostname;
    const currentUrl = window.location.href;
    const currentProtocol = window.location.protocol;
    
    console.log("📍 [GooglePlaces] Información del dominio:");
    console.log("  - Dominio actual:", currentDomain);
    console.log("  - URL completa:", currentUrl);
    console.log("  - Protocolo:", currentProtocol);
    
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("🗺️ [GooglePlaces] API key no configurada - usando entrada manual");
      setApiError("Entrada manual disponible");
      setApiStatus('error');
      setUseManualInput(true);
      return;
    }

    console.log("✅ [GooglePlaces] API key encontrada:", `${apiKey.substring(0, 10)}...`);
    console.log("🔧 [GooglePlaces] Dominios que debes agregar a las restricciones:");
    console.log(`  - ${currentDomain}`);
    console.log(`  - *.${currentDomain.split('.').slice(-2).join('.')}`);
    console.log("  - *.replit.dev");
    console.log("  - *.replit.com");
    console.log("  - localhost");

    // Verificar si Google Maps está cargado
    if (typeof window !== 'undefined') {
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log("✅ [GooglePlaces] Google Maps API cargada correctamente");
        setApiStatus('ready');
        setApiError(null);
        setUseManualInput(false);
      } else {
        console.log("⏳ [GooglePlaces] Google Maps API aún no está cargada, esperando...");
        // Intentar nuevamente después de un retraso
        setTimeout(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            console.log("✅ [GooglePlaces] Google Maps API cargada después del retraso");
            setApiStatus('ready');
            setApiError(null);
            setUseManualInput(false);
          } else {
            console.error("❌ [GooglePlaces] Google Maps API no se pudo cargar");
            setApiError("Google Maps API no se pudo cargar");
            setApiStatus('error');
            setUseManualInput(true);
          }
        }, 3000);
      }
    }
  }, []);

  // Detectar errores de Google Maps - MEJORADO
  useEffect(() => {
    const handleGoogleMapsError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes("Google Maps") ||
        event.message.includes("InvalidKeyMapError") ||
        event.message.includes("ApiNotActivatedMapError")
      )) {
        // Logging más silencioso - evitar spam en consola
        console.warn("🗺️ [GooglePlaces] API no configurada, usando entrada manual");
        
        let errorMessage = "Autocompletado no disponible";
        if (event.message.includes("InvalidKeyMapError")) {
          errorMessage = "Configuración de API key requerida";
        } else if (event.message.includes("ApiNotActivatedMapError")) {
          errorMessage = "Servicios de Google Maps no activados";
        }
        
        setApiError(errorMessage);
        setApiStatus('error');
        setUseManualInput(true);
        
        // Prevenir que el error se propague y cause unhandled rejection
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // También manejar errores de promises no capturadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes("Google Maps") || 
           event.reason.message.includes("geocode") ||
           event.reason.message.includes("places"))) {
        console.warn("🗺️ [GooglePlaces] Promise rejection silenciada:", event.reason.message);
        event.preventDefault(); // Evitar que aparezca en consola como error
      }
    };

    window.addEventListener('error', handleGoogleMapsError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Check API de forma segura
    try {
      checkGoogleMapsAPI();
    } catch (error) {
      console.warn("🗺️ [GooglePlaces] Error en check inicial, usando entrada manual");
      setUseManualInput(true);
    }

    return () => {
      window.removeEventListener('error', handleGoogleMapsError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [checkGoogleMapsAPI]);

  // Manejar selección de lugar - MEJORADO
  const handlePlaceSelect = async (place: any) => {
    if (!place || !place.value) {
      console.warn("⚠️ [GooglePlaces] Lugar seleccionado inválido");
      return;
    }

    try {
      const address = place.value.description;
      onChange(address);
      setManualAddress(address);

      // Obtener detalles adicionales del lugar con timeout
      const geocodePromise = geocodeByAddress(address);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const results = await Promise.race([geocodePromise, timeoutPromise]) as any[];
      
      if (results && results.length > 0) {
        const latLngPromise = getLatLng(results[0]);
        const latLngTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LatLng Timeout')), 3000)
        );

        const latLng = await Promise.race([latLngPromise, latLngTimeoutPromise]) as any;
        
        const placeData = {
          address,
          coordinates: latLng,
          addressComponents: results[0].address_components,
          placeId: results[0].place_id,
          formattedAddress: results[0].formatted_address
        };

        if (onPlaceSelect) {
          onPlaceSelect(placeData);
        }
      }
    } catch (error: any) {
      // Manejo silencioso de errores - no saturar logs
      if (error.message === 'Timeout' || error.message === 'LatLng Timeout') {
        console.warn("⏱️ [GooglePlaces] Timeout en geocoding - usando dirección básica");
      } else {
        console.warn("⚠️ [GooglePlaces] Error en geocoding:", error.message || 'Error desconocido');
      }
      // No mostrar error al usuario si la dirección básica funciona
    }
  };

  // Manejar entrada manual
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setManualAddress(newValue);
    onChange(newValue);
  };

  // Alternar entre manual y autocompletado
  const toggleInputMode = () => {
    console.log(`🔄 [GooglePlaces] Cambiando modo: ${useManualInput ? 'autocompletado' : 'manual'}`);
    setUseManualInput(!useManualInput);
    setApiError(null);
  };

  // Renderizar entrada manual
  if (useManualInput || apiStatus === 'error') {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            value={manualAddress}
            onChange={handleManualInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-9 ${className}`}
          />
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
            <MapPin size={16} className="opacity-60" />
          </div>
        </div>

        {apiError && (
          <Alert className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Autocompletado no disponible. Usando entrada manual.
              {apiStatus === 'ready' && (
                <button
                  type="button"
                  onClick={toggleInputMode}
                  className="ml-2 text-primary hover:underline"
                >
                  Intentar autocompletado
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {apiStatus === 'ready' && !apiError && (
          <button
            type="button"
            onClick={toggleInputMode}
            className="text-xs text-primary hover:underline"
          >
            Cambiar a autocompletado
          </button>
        )}
      </div>
    );
  }

  // Renderizar autocompletado de Google
  if (apiStatus === 'ready') {
    return (
      <div className="space-y-2">
        <div className="relative">
          <GooglePlacesAutocomplete
            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            apiOptions={{
              language,
              region,
              libraries: ["places"],
            }}
            autocompletionRequest={{
              componentRestrictions: {
                country: countries,
              },
              types: ["address"],
            }}
            selectProps={{
              value: placeValue,
              onChange: (selectedValue) => {
                setPlaceValue(selectedValue);
                handlePlaceSelect(selectedValue);
              },
              placeholder,
              noOptionsMessage: () => "No se encontraron resultados",
              loadingMessage: () => "Buscando direcciones...",
              isDisabled: disabled,
              styles: {
                control: (provided, state) => ({
                  ...provided,
                  minHeight: "42px",
                  height: "auto",
                  borderRadius: "7px",
                  boxShadow: "none",
                  borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
                  paddingLeft: "30px",
                  paddingRight: "8px",
                  whiteSpace: "normal",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                  },
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isFocused ? "#f1f5f9" : "white",
                  color: "#334155",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "8px 12px",
                }),
                menu: (provided) => ({
                  ...provided,
                  borderRadius: "7px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  zIndex: 100,
                }),
                input: (provided) => ({
                  ...provided,
                  fontSize: "14px",
                }),
              },
            }}
          />
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
            <MapPin size={16} className="opacity-60" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleInputMode}
            className="text-xs text-primary hover:underline"
          >
            Cambiar a entrada manual
          </button>
          
          <div className="flex items-center text-xs text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Autocompletado activo
          </div>
        </div>
      </div>
    );
  }

  // Estado de carga
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={manualAddress}
          onChange={handleManualInputChange}
          placeholder="Cargando autocompletado..."
          disabled={true}
          className={`pl-9 ${className}`}
        />
        <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
          <MapPin size={16} className="opacity-60" />
        </div>
      </div>
      <div className="text-xs text-gray-500">⏳ Inicializando Google Maps...</div>
    </div>
  );
}