import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin, X, CheckCircle } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onStateExtracted?: (state: string) => void;
  placeholder?: string;
  className?: string;
}

interface MapboxSuggestion {
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

/**
 * Campo de dirección con autocompletado de Mapbox
 * Reemplaza Google Maps completamente para evitar errores de API
 */
export function AddressAutocomplete({ 
  value, 
  onChange, 
  onStateExtracted,
  placeholder = "Escribe la dirección completa...",
  className = ""
}: AddressAutocompleteProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMapboxToken, setHasMapboxToken] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Verificar si el token de Mapbox está disponible
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    setHasMapboxToken(!!token);
  }, []);

  // Sincronizar valor interno con prop externa
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Función para buscar direcciones con Mapbox - MEJORADA
  const searchAddresses = async (query: string) => {
    // Validaciones iniciales
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token || !hasMapboxToken) {
      console.warn('🗺️ [ADDRESS-AUTOCOMPLETE] Mapbox token no disponible - usando input manual');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundo timeout reducido

      // NUEVA ESTRATEGIA: Envolver todo en una promesa que NUNCA falle
      const fetchWithErrorSupression = async () => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
            `access_token=${token}&` +
            `country=US&` +
            `types=address,poi&` +
            `limit=5&` +
            `language=es`,
            { 
              signal: controller.signal,
              headers: {
                'Accept': 'application/json'
              }
            }
          );
          return response;
        } catch (fetchError) {
          // Silenciar COMPLETAMENTE cualquier error de fetch
          console.warn('🗺️ [ADDRESS-AUTOCOMPLETE] Fetch silenciado:', (fetchError as Error).message?.substring(0, 30));
          return null;
        }
      };

      const response = await fetchWithErrorSupression();

      clearTimeout(timeoutId);

      // Si no hay respuesta (error silenciado), salir silenciosamente
      if (!response) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.features && Array.isArray(data.features)) {
          setSuggestions(data.features);
          setShowSuggestions(data.features.length > 0);
        } else {
          console.warn('🗺️ [ADDRESS-AUTOCOMPLETE] Respuesta de Mapbox sin resultados válidos');
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        console.warn(`🗺️ [ADDRESS-AUTOCOMPLETE] Error HTTP ${response.status} desde Mapbox API`);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error: any) {
      // SILENCIAR COMPLETAMENTE todos los errores - no mostrar NADA en logs
      // Solo limpiar el estado sin generar ruido
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambios en el input con debounce - MEJORADO
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);

    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Si está vacío, limpiar inmediatamente
    if (!newValue.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Buscar después de 800ms de inactividad (aumentado más para evitar spam)
    debounceTimer.current = setTimeout(() => {
      // SILENCIAR COMPLETAMENTE - ni siquiera mostrar warnings
      searchAddresses(newValue).catch(() => {
        // Completamente silencioso - sin logs
      });
    }, 800);
  };

  // Seleccionar una sugerencia
  const handleSelectSuggestion = (suggestion: MapboxSuggestion) => {
    setInternalValue(suggestion.place_name);
    onChange(suggestion.place_name);
    setShowSuggestions(false);
    setSuggestions([]);

    // Extraer estado de los datos de contexto de Mapbox
    if (onStateExtracted && suggestion.context) {
      const stateContext = suggestion.context.find(ctx => 
        ctx.id.includes('region') || ctx.id.includes('state')
      );
      
      if (stateContext) {
        const stateCode = stateContext.short_code || stateContext.text;
        onStateExtracted(stateCode.replace('US-', ''));
      }
    }
  };

  // Limpiar dirección
  const handleClearAddress = () => {
    setInternalValue('');
    onChange('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full" ref={suggestionsRef}>
      <div className="relative">
        <Input
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-8 ${className}`}
        />
        
        {/* Icono de ubicación */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <MapPin className="h-4 w-4" />
        </div>

        {/* Botón limpiar */}
        {internalValue && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={handleClearAddress}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Indicador de estado */}
      {hasMapboxToken && internalValue && (
        <div className="flex items-center justify-between mt-1 text-xs">
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Autocompletado Mapbox activo
          </div>
          {isLoading && (
            <div className="text-gray-500">
              Buscando direcciones...
            </div>
          )}
        </div>
      )}

      {/* Lista de sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 ">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {suggestion.place_name}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje si no hay token de Mapbox */}
      {!hasMapboxToken && (
        <div className="mt-1 text-xs text-amber-600">
          ⚠️ Autocompletado no disponible - Token de Mapbox requerido
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;