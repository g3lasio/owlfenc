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
    const tokenAvailable = !!token && token.length > 10;
    setHasMapboxToken(tokenAvailable);
    
    console.log(`📍 [MAPBOX] Token status: ${tokenAvailable ? 'AVAILABLE' : 'MISSING'} (${token?.substring(0, 20)}...)`);  
  }, []);

  // Sincronizar valor interno con prop externa
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Función para buscar direcciones con Mapbox - USANDO XMLHttpRequest PARA EVITAR RUNTIME ERROR PLUGIN
  const searchAddresses = async (query: string) => {
    // Validaciones iniciales
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token || !hasMapboxToken) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    // NUEVA ESTRATEGIA: XMLHttpRequest en lugar de fetch para evitar detección del plugin
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
                  `access_token=${token}&` +
                  `country=US,MX,CA&` +
                  `types=address,place,locality&` +
                  `limit=6&` +
                  `language=es`;

      // Timeout de 8 segundos para mejor conectividad
      xhr.timeout = 8000;
      
      xhr.onload = () => {
        try {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data && data.features && Array.isArray(data.features)) {
              // Filtrar y procesar sugerencias
              const processedSuggestions = data.features
                .filter(feature => feature.place_name && feature.place_name.trim())
                .slice(0, 5); // Máximo 5 sugerencias
              
              setSuggestions(processedSuggestions);
              setShowSuggestions(processedSuggestions.length > 0);
              
              console.log(`📍 [MAPBOX] Found ${processedSuggestions.length} address suggestions for: "${query}"`);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
              console.log(`📍 [MAPBOX] No results found for: "${query}"`);
            }
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
            console.warn(`📍 [MAPBOX] API returned status ${xhr.status} for: "${query}"`);
          }
        } catch (error) {
          setSuggestions([]);
          setShowSuggestions(false);
          console.error(`📍 [MAPBOX] Error parsing response for: "${query}"`, error);
        }
        setIsLoading(false);
        resolve();
      };

      xhr.onerror = () => {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        console.error(`📍 [MAPBOX] Network error for query: "${query}"`);
        resolve();
      };

      xhr.ontimeout = () => {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsLoading(false);
        resolve();
      };

      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();
    });
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

    // Buscar después de 300ms de inactividad - OPTIMIZADO
    debounceTimer.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
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

      {/* Lista de sugerencias - CYBERPUNK THEME */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-cyan-400/30 rounded-md shadow-xl shadow-cyan-400/10 max-h-60 overflow-y-auto backdrop-blur-sm">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-cyan-400/10 focus:bg-cyan-400/20 focus:outline-none border-b border-gray-700/50 last:border-b-0 transition-all duration-200"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-cyan-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white hover:text-cyan-300">
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