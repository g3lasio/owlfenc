import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertTriangle, CheckCircle, Loader } from "lucide-react";

interface MapboxPlacesAutocompleteProps {
  value?: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (placeData: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  countries?: string[];
  language?: string;
}

export default function MapboxPlacesAutocomplete({
  value = "",
  onChange,
  onPlaceSelect,
  placeholder = "Ingresa una dirección",
  disabled = false,
  className = "",
  countries = ["mx", "us", "es"],
  language = "es"
}: MapboxPlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState<string>(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  // Función para limpiar controlador de forma segura
  const safeAbort = useCallback(() => {
    const controller = abortControllerRef.current;
    if (controller) {
      try {
        // Solo abortar si no está ya abortado
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        // Silenciar completamente errores de abort - esto es esperado
      } finally {
        // Siempre limpiar la referencia
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      safeAbort();
    };
  }, [safeAbort]);

  // Verificar API key de Mapbox
  const checkMapboxAPI = useCallback(() => {
    console.log("🗺️ [MapboxPlaces] Verificando configuración de Mapbox...");
    
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!mapboxToken) {
      console.warn("⚠️ [MapboxPlaces] Token de Mapbox no configurado");
      setApiError("Token de Mapbox no configurado");
      setApiStatus('error');
      return;
    }

    console.log("✅ [MapboxPlaces] Token encontrado:", `${mapboxToken.substring(0, 15)}...`);
    setApiStatus('ready');
    setApiError(null);
  }, []);

  // Inicializar
  useEffect(() => {
    checkMapboxAPI();
  }, [checkMapboxAPI]);

  // Buscar sugerencias con Mapbox Geocoding API
  const searchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3 || apiStatus !== 'ready') {
      console.log("⏭️ [MapboxPlaces] Saltando búsqueda:", { input: input.length, apiStatus });
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Incrementar ID único para cada request
    const currentRequestId = ++requestIdRef.current;

    // Cancelar petición anterior de forma segura
    safeAbort();

    // Crear nuevo controlador
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const encodedInput = encodeURIComponent(input.trim());
      const countryParam = countries.length > 0 ? `&country=${countries.join(',')}` : '';
      
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedInput}.json?access_token=${mapboxToken}&types=address&language=${language}${countryParam}&limit=5`;
      
      console.log(`🔍 [MapboxPlaces] Buscando: "${input}"`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        signal: controller.signal
      });

      // Verificar si este request sigue siendo el más reciente
      if (currentRequestId !== requestIdRef.current) {
        console.log("🚫 [MapboxPlaces] Request obsoleto, ignorando respuesta");
        return;
      }
      
      // Verificar si la petición fue cancelada después de la respuesta
      if (controller.signal.aborted) {
        console.log("🚫 [MapboxPlaces] Request fue cancelado");
        return;
      }
      
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [MapboxPlaces] Error:", response.status, errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Verificar nuevamente si fue cancelada antes de actualizar el estado
      if (controller.signal.aborted) {
        return;
      }
      
      if (data.features && data.features.length > 0) {
        console.log(`✅ [MapboxPlaces] ${data.features.length} sugerencias encontradas (${responseTime}ms)`);
        setSuggestions(data.features);
        setShowSuggestions(true);
      } else {
        console.log("📭 [MapboxPlaces] Sin resultados");
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error: any) {
      // Solo manejar errores si la petición no fue cancelada
      if (controller.signal.aborted) {
        return;
      }
      
      if (error.name === 'AbortError') {
        // Ignorar silenciosamente los errores de abort
        return;
      }
      
      console.error("❌ [MapboxPlaces] Error al buscar sugerencias:");
      console.error("  - Tipo:", error.name);
      console.error("  - Mensaje:", error.message);
      
      setSuggestions([]);
      setShowSuggestions(false);
      
      if (error.message.includes('401')) {
        setApiError("Token de Mapbox inválido");
        setApiStatus('error');
      } else if (error.message.includes('network')) {
        setApiError("Error de conectividad con Mapbox");
      } else {
        setApiError(`Error de Mapbox: ${error.message}`);
      }
    } finally {
      // Solo actualizar loading si la petición no fue cancelada
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [countries, language, apiStatus]);

  // Debounce timer para búsqueda
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manejar cambios en el input con debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // Cancelar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (newValue.length >= 3) {
      console.log("⏳ [MapboxPlaces] Programando búsqueda para:", newValue);
      // Debounce de 300ms para evitar demasiadas peticiones
      debounceTimerRef.current = setTimeout(() => {
        searchSuggestions(newValue);
      }, 300);
    } else {
      console.log("⏳ [MapboxPlaces] Esperando más caracteres:", newValue.length, "/3");
      // Cancelar cualquier petición pendiente de forma segura
      safeAbort();
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  // Manejar selección de sugerencia
  const handleSuggestionClick = (feature: any) => {
    const selectedAddress = feature.place_name;
    setInputValue(selectedAddress);
    onChange(selectedAddress);
    setShowSuggestions(false);
    setSuggestions([]);

    console.log("📍 [MapboxPlaces] Dirección seleccionada:", selectedAddress);

    if (onPlaceSelect) {
      const placeData = {
        address: selectedAddress,
        coordinates: {
          lat: feature.center[1],
          lng: feature.center[0]
        },
        context: feature.context,
        bbox: feature.bbox,
        placeType: feature.place_type,
        properties: feature.properties
      };
      
      console.log("✅ [MapboxPlaces] Datos del lugar:", placeData);
      onPlaceSelect(placeData);
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cancelar petición pendiente de forma segura
      safeAbort();
    };
  }, []);

  // Renderizar con entrada manual si hay error
  if (apiStatus === 'error') {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-9 ${className}`}
          />
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
            <MapPin size={16} className="opacity-60" />
          </div>
        </div>

        <Alert className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {apiError} - Usando entrada manual.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Renderizar autocompletado con Mapbox
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
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 "
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id || index}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start">
                <MapPin size={14} className="text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {suggestion.text}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {suggestion.place_name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado del sistema */}
      <div className="flex items-center justify-end">
        <div className="flex items-center text-xs text-blue-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Autocompletado Mapbox activo
        </div>
      </div>
    </div>
  );
}