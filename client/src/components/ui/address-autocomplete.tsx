import React, { useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// Declaración para TypeScript - interfaces de Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: google.maps.places.AutocompleteOptions
          ) => google.maps.places.Autocomplete;
        };
        event: {
          clearInstanceListeners: (instance: any) => void;
        };
      };
    };
  }
}

// Tipos para Google Maps API 
namespace google.maps.places {
  interface Autocomplete {
    addListener: (event: string, callback: () => void) => void;
    getPlace: () => PlaceResult;
  }
  
  interface PlaceResult {
    formatted_address?: string;
    address_components?: AddressComponent[];
  }
  
  interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }
  
  interface AutocompleteOptions {
    types?: string[];
    componentRestrictions?: {
      country: string | string[];
    };
    fields?: string[];
  }
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onStateExtracted?: (state: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ 
  value, 
  onChange, 
  onStateExtracted,
  placeholder = "Escribir dirección..."
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Función para extraer el estado de una dirección mediante Google Places
  const extractStateFromPlace = (place: google.maps.places.PlaceResult): string | null => {
    if (!place.address_components) return null;
    
    for (const component of place.address_components) {
      if (component.types.includes('administrative_area_level_1')) {
        return component.short_name;
      }
    }
    return null;
  };

  // Inicializar Google Places Autocomplete
  useEffect(() => {
    // Verificar si Google Maps API está disponible
    const initGoogleAutocomplete = () => {
      if (window.google?.maps?.places && inputRef.current) {
        try {
          // Crear instancia de Autocomplete directamente en el input
          autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'us' }, // Opcional: restringir a EE.UU.
            fields: ['address_components', 'formatted_address']
          });

          // Escuchar el evento de selección de lugar
          autocompleteRef.current.addListener('place_changed', () => {
            if (autocompleteRef.current) {
              const place = autocompleteRef.current.getPlace();
              
              if (place && place.formatted_address) {
                onChange(place.formatted_address);
                
                // Extraer y propagar el estado si es posible
                if (onStateExtracted) {
                  const state = extractStateFromPlace(place);
                  if (state) {
                    onStateExtracted(state);
                  }
                }
              }
            }
          });
        } catch (error) {
          console.error("Error al inicializar Google Places Autocomplete:", error);
        }
      }
    };

    // Intentar inicializar inmediatamente si Google ya está cargado
    if (window.google?.maps?.places) {
      initGoogleAutocomplete();
    } else {
      // Si no está cargado, esperar a que el script termine de cargar
      const checkGoogleLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleLoaded);
          initGoogleAutocomplete();
        }
      }, 100);

      // Limpiar el intervalo después de un tiempo máximo (10 segundos)
      setTimeout(() => {
        clearInterval(checkGoogleLoaded);
        console.warn("Google Maps API no se cargó en el tiempo esperado");
      }, 10000);

      return () => clearInterval(checkGoogleLoaded);
    }

    // Limpiar listeners al desmontar
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange, onStateExtracted]);

  // Limpiar la dirección
  const handleClearAddress = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative w-full">
        <Input
          ref={inputRef}
          defaultValue={value}
          onChange={(e) => {
            // Permitir la escritura fluida pasando el valor directamente
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full pr-8"
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={handleClearAddress}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}