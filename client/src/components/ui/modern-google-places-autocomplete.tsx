import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertTriangle, CheckCircle, Loader } from "lucide-react";

interface ModernGooglePlacesAutocompleteProps {
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

export default function ModernGooglePlacesAutocomplete({
  value = "",
  onChange,
  onPlaceSelect,
  placeholder = "Ingresa una dirección",
  disabled = false,
  className = "",
  countries = ["mx", "us", "es"],
  language = "es",
  region = "mx"
}: ModernGooglePlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState<string>(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [useManualInput, setUseManualInput] = useState<boolean>(false);
  
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Verificar y configurar Google Maps API
  const initializeGoogleMaps = useCallback(() => {
    console.log("🗺️ [ModernGooglePlaces] Inicializando Google Maps API...");
    
    const currentDomain = window.location.hostname;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    console.log("📍 [ModernGooglePlaces] Dominio actual:", currentDomain);
    console.log("🔑 [ModernGooglePlaces] API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "No encontrada");
    
    if (!apiKey) {
      console.error("❌ [ModernGooglePlaces] API key no configurada");
      setApiError("API key de Google Maps no configurada");
      setApiStatus('error');
      setUseManualInput(true);
      return;
    }

    // Verificar si Google Maps está disponible
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      try {
        // Intentar usar el nuevo AutocompleteSuggestion si está disponible
        if (window.google.maps.places && window.google.maps.places.AutocompleteSuggestion) {
          console.log("✅ [ModernGooglePlaces] Usando nueva API AutocompleteSuggestion");
          initializeNewAPI();
        } 
        // Fallback al AutocompleteService tradicional
        else if (window.google.maps.places && window.google.maps.places.AutocompleteService) {
          console.log("⚠️ [ModernGooglePlaces] Usando API legacy AutocompleteService");
          initializeLegacyAPI();
        } else {
          throw new Error("Places API no disponible");
        }
      } catch (error) {
        console.error("❌ [ModernGooglePlaces] Error al inicializar:", error);
        setApiError("Error al inicializar Google Places API");
        setApiStatus('error');
        setUseManualInput(true);
      }
    } else {
      console.log("⏳ [ModernGooglePlaces] Google Maps aún no está cargado");
      setTimeout(initializeGoogleMaps, 1000);
    }
  }, []);

  // Inicializar nueva API (recomendada)
  const initializeNewAPI = () => {
    try {
      // Esta sería la implementación de la nueva API cuando esté completamente disponible
      console.log("🆕 [ModernGooglePlaces] Nueva API lista (placeholder)");
      // Por ahora, usar la API legacy como fallback
      initializeLegacyAPI();
    } catch (error) {
      console.error("❌ [ModernGooglePlaces] Error con nueva API:", error);
      initializeLegacyAPI();
    }
  };

  // Inicializar API legacy
  const initializeLegacyAPI = () => {
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      
      // Crear un div temporal para PlacesService
      const tempDiv = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(tempDiv);
      
      console.log("✅ [ModernGooglePlaces] AutocompleteService inicializado");
      setApiStatus('ready');
      setApiError(null);
      setUseManualInput(false);
    } catch (error) {
      console.error("❌ [ModernGooglePlaces] Error al inicializar AutocompleteService:", error);
      setApiError("Error al inicializar el servicio de autocompletado");
      setApiStatus('error');
      setUseManualInput(true);
    }
  };

  // Manejar errores de Google Maps
  useEffect(() => {
    const handleGoogleMapsError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes("Google Maps") ||
        event.message.includes("InvalidKeyMapError") ||
        event.message.includes("ApiNotActivatedMapError")
      )) {
        console.error("❌ [ModernGooglePlaces] Error de Google Maps:", event.message);
        
        const currentDomain = window.location.hostname;
        
        if (event.message.includes("InvalidKeyMapError")) {
          console.error("🚨 [ModernGooglePlaces] InvalidKeyMapError persistente detectado");
          console.error("📋 [ModernGooglePlaces] Información de diagnóstico:");
          console.error(`   - Dominio actual: ${currentDomain}`);
          console.error(`   - URL completa: ${window.location.href}`);
          console.error(`   - Referrer: ${document.referrer || 'No disponible'}`);
          console.error("🔧 [ModernGooglePlaces] Posibles soluciones:");
          console.error("1. Verificar que TODOS estos formatos estén en las restricciones:");
          console.error(`   - ${currentDomain}/*`);
          console.error(`   - *.${currentDomain.split('.').slice(-2).join('.')}/*`);
          console.error(`   - https://${currentDomain}/*`);
          console.error(`   - http://${currentDomain}/*`);
          console.error("2. Remover temporalmente TODAS las restricciones para probar");
          console.error("3. Verificar que la API key tenga permisos para Places API");
          console.error("4. Considerar generar una nueva API key sin restricciones");
          
          setApiError(`API key con restricciones incompatibles. Dominio: ${currentDomain}`);
        } else {
          setApiError("Error de configuración de Google Maps");
        }
        
        setApiStatus('error');
        setUseManualInput(true);
      }
    };

    // Verificar estado cada 5 segundos para detectar cambios en la configuración
    const statusCheck = setInterval(() => {
      if (apiStatus === 'error' && window.google && window.google.maps && window.google.maps.places) {
        console.log("🔄 [ModernGooglePlaces] Reintentando inicialización...");
        initializeGoogleMaps();
      }
    }, 5000);

    window.addEventListener('error', handleGoogleMapsError);
    initializeGoogleMaps();

    return () => {
      window.removeEventListener('error', handleGoogleMapsError);
      clearInterval(statusCheck);
    };
  }, [initializeGoogleMaps, apiStatus]);

  // Buscar sugerencias
  const searchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3 || !autocompleteServiceRef.current || apiStatus !== 'ready') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const request = {
        input: input.trim(),
        componentRestrictions: { country: countries },
        types: ['address']
      };

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions: any[], status: any) => {
          setIsLoading(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            console.log(`✅ [ModernGooglePlaces] ${predictions.length} sugerencias encontradas`);
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            console.warn("⚠️ [ModernGooglePlaces] No se encontraron sugerencias:", status);
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (error) {
      console.error("❌ [ModernGooglePlaces] Error al buscar sugerencias:", error);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [countries, apiStatus]);

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    searchSuggestions(newValue);
  };

  // Manejar selección de sugerencia
  const handleSuggestionClick = async (prediction: any) => {
    const selectedAddress = prediction.description;
    setInputValue(selectedAddress);
    onChange(selectedAddress);
    setShowSuggestions(false);
    setSuggestions([]);

    console.log("📍 [ModernGooglePlaces] Dirección seleccionada:", selectedAddress);

    // Obtener detalles del lugar si es necesario
    if (onPlaceSelect && placesServiceRef.current) {
      try {
        const request = { placeId: prediction.place_id };
        
        placesServiceRef.current.getDetails(request, (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            const placeData = {
              address: selectedAddress,
              placeId: prediction.place_id,
              coordinates: place.geometry?.location ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              } : null,
              addressComponents: place.address_components,
              formattedAddress: place.formatted_address
            };
            
            console.log("✅ [ModernGooglePlaces] Detalles del lugar:", placeData);
            onPlaceSelect(placeData);
          }
        });
      } catch (error) {
        console.error("❌ [ModernGooglePlaces] Error al obtener detalles:", error);
        // Llamar onPlaceSelect con información básica
        onPlaceSelect({ address: selectedAddress, placeId: prediction.place_id });
      }
    }
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Renderizar entrada manual cuando hay error
  if (useManualInput || apiStatus === 'error') {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
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
              {apiError}
              {apiStatus === 'ready' && (
                <button
                  type="button"
                  onClick={() => setUseManualInput(false)}
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
            onClick={() => setUseManualInput(false)}
            className="text-xs text-primary hover:underline"
          >
            Cambiar a autocompletado
          </button>
        )}
      </div>
    );
  }

  // Renderizar autocompletado funcional
  return (
    <div className="space-y-2 relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || apiStatus !== 'ready'}
          className={`pl-9 pr-8 ${className}`}
        />
        <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
          <MapPin size={16} className="opacity-60" />
        </div>
        {isLoading && (
          <div className="absolute top-3 right-3 text-gray-400">
            <Loader size={16} className="animate-spin" />
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id || index}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start">
                <MapPin size={14} className="text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && (
                    <div className="text-gray-500 text-xs">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado del sistema */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setUseManualInput(true)}
          className="text-xs text-primary hover:underline"
        >
          Cambiar a entrada manual
        </button>
        
        <div className="flex items-center text-xs text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Autocompletado moderno activo
        </div>
      </div>
    </div>
  );
}