import React, { useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onStateExtracted?: (state: string) => void;
  placeholder?: string;
}

/**
 * Campo de dirección con autocompletado de Google Maps integrado
 * Versión optimizada para permitir escritura fluida y sin mensajes intrusivos
 */
export function AddressAutocomplete({ 
  value, 
  onChange, 
  onStateExtracted,
  placeholder = "Escribe la dirección completa..." 
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<any>(null);
  const [internalValue, setInternalValue] = useState(value);
  const isAutocompleteChange = useRef(false);

  // Sincronizar el valor interno cuando cambia el valor externo
  useEffect(() => {
    if (!isAutocompleteChange.current) {
      setInternalValue(value);
    }
    isAutocompleteChange.current = false;
  }, [value]);

  // Inicializar Google Places Autocomplete de forma no invasiva
  useEffect(() => {
    // Solo inicializar si el input existe y Google Maps está disponible
    const initAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;

      try {
        // Inicializar el autocompletado directamente en el campo de texto
        const options = {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
        };

        autocompleteInstance.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          options
        );

        // Solo escuchar el evento place_changed - cuando el usuario selecciona una dirección
        autocompleteInstance.current.addListener('place_changed', () => {
          const place = autocompleteInstance.current.getPlace();
          
          if (place?.formatted_address) {
            isAutocompleteChange.current = true;
            setInternalValue(place.formatted_address);
            onChange(place.formatted_address);
            
            // Extraer el estado si está disponible
            if (onStateExtracted && place.address_components) {
              const stateComponent = place.address_components.find(
                component => component.types.includes('administrative_area_level_1')
              );
              
              if (stateComponent) {
                onStateExtracted(stateComponent.short_name);
              }
            }
          }
        });
      } catch (err) {
        // Capturar silenciosamente cualquier error, sin interrumpir la experiencia del usuario
        console.error('Error al inicializar autocompletado:', err);
      }
    };

    // Intentar inicializar inmediatamente o esperar a que Google Maps se cargue
    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      // Añadir un oyente que detecte cuando Google Maps esté disponible
      const checkGoogleInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleInterval);
          initAutocomplete();
        }
      }, 200);

      // Limpiar después de 5 segundos para no consumir recursos
      setTimeout(() => clearInterval(checkGoogleInterval), 5000);
      
      return () => clearInterval(checkGoogleInterval);
    }

    // Limpieza
    return () => {
      if (autocompleteInstance.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance.current);
      }
    };
  }, [onChange, onStateExtracted]);

  // Manejar cambio de entrada
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  // Limpiar dirección
  const handleClearAddress = () => {
    setInternalValue('');
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full pr-8"
      />
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
  );
}