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
      console.error("❌ [GooglePlaces] API key no encontrada");
      setApiError("API key de Google Maps no configurada");
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

  // Detectar errores de Google Maps
  useEffect(() => {
    const handleGoogleMapsError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes("Google Maps") ||
        event.message.includes("InvalidKeyMapError") ||
        event.message.includes("ApiNotActivatedMapError")
      )) {
        console.error("❌ [GooglePlaces] Error de Google Maps detectado:", event.message);
        
        let errorMessage = "Error de configuración de Google Maps";
        if (event.message.includes("InvalidKeyMapError")) {
          const currentDomain = window.location.hostname;
          console.error("🚨 [GooglePlaces] InvalidKeyMapError detectado");
          console.error("🔧 [GooglePlaces] SOLUCIÓN REQUERIDA:");
          console.error("1. Ve a Google Cloud Console → APIs & Services → Credentials");
          console.error("2. Edita tu API key");
          console.error("3. En 'Application restrictions' → 'HTTP referrers'");
          console.error("4. Agrega estos dominios:");
          console.error(`   - ${currentDomain}/*`);
          console.error(`   - *.${currentDomain.split('.').slice(-2).join('.')}/*`);
          console.error("   - *.replit.dev/*");
          console.error("   - *.replit.com/*");
          console.error("   - localhost/*");
          console.error("5. Guarda los cambios y espera 1-2 minutos");
          
          errorMessage = `Restricciones de dominio requeridas. Dominio actual: ${currentDomain}`;
        } else if (event.message.includes("ApiNotActivatedMapError")) {
          errorMessage = "Los servicios necesarios de Google Maps no están activados en tu proyecto.";
        }
        
        setApiError(errorMessage);
        setApiStatus('error');
        setUseManualInput(true);
      }
    };

    window.addEventListener('error', handleGoogleMapsError);
    checkGoogleMapsAPI();

    return () => {
      window.removeEventListener('error', handleGoogleMapsError);
    };
  }, [checkGoogleMapsAPI]);

  // Manejar selección de lugar
  const handlePlaceSelect = async (place: any) => {
    if (!place || !place.value) {
      console.warn("⚠️ [GooglePlaces] Lugar seleccionado inválido");
      return;
    }

    try {
      console.log("📍 [GooglePlaces] Lugar seleccionado:", place.value.description);
      
      const address = place.value.description;
      onChange(address);
      setManualAddress(address);

      // Obtener detalles adicionales del lugar
      const results = await geocodeByAddress(address);
      if (results && results.length > 0) {
        const latLng = await getLatLng(results[0]);
        
        const placeData = {
          address,
          coordinates: latLng,
          addressComponents: results[0].address_components,
          placeId: results[0].place_id,
          formattedAddress: results[0].formatted_address
        };

        console.log("✅ [GooglePlaces] Datos del lugar procesados:", placeData);
        
        if (onPlaceSelect) {
          onPlaceSelect(placeData);
        }
      }
    } catch (error) {
      console.error("❌ [GooglePlaces] Error procesando lugar seleccionado:", error);
      setApiError("Error al procesar la dirección seleccionada");
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