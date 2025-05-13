
import { Input } from "./input";
import { Label } from "./label";
import GooglePlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete';
import { useState, useEffect } from "react";

interface AddressAutocompleteProps {
  label?: string;
  value?: string;
  onChange: (address: string, details?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) => void;
  onAddressSelected?: (address: any) => void;
  placeholder?: string;
  onAddressDetailsChange?: (details: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) => void;
  className?: string;
}

export function AddressAutocomplete({
  label,
  value,
  onChange,
  onAddressSelected,
  placeholder = "Ingresa una dirección...",
  onAddressDetailsChange,
  className = ""
}: AddressAutocompleteProps) {
  const [address, setAddress] = useState<any>(null);

  // Si el valor cambia externamente, actualizar el estado local
  useEffect(() => {
    if (value && (!address || address.label !== value)) {
      setAddress({ label: value, value: { description: value } });
    }
  }, [value]);

  const handlePlaceSelect = async (place: any) => {
    if (place && place.value) {
      try {
        setAddress(place);
        
        const results = await geocodeByAddress(place.value.description);
        if (results && results.length > 0) {
          const addressComponents = results[0].address_components;
          const formattedAddress = results[0].formatted_address;
          
          let details = {
            street: '',
            city: '',
            state: '',
            zipCode: ''
          };

          addressComponents.forEach((component: any) => {
            const types = component.types;
            
            // Extraer número y calle
            if (types.includes('street_number')) {
              details.street = component.long_name;
            } else if (types.includes('route')) {
              details.street = details.street 
                ? `${details.street} ${component.long_name}`
                : component.long_name;
            }
            
            // Ciudad - puede ser "locality" o "administrative_area_level_2"
            if (types.includes('locality')) {
              details.city = component.long_name;
            } else if (!details.city && types.includes('administrative_area_level_2')) {
              details.city = component.long_name;
            }
            
            // Estado
            if (types.includes('administrative_area_level_1')) {
              details.state = component.long_name;
            }
            
            // Código postal
            if (types.includes('postal_code')) {
              details.zipCode = component.long_name;
            }
          });

          // Solo enviamos la calle como dirección, no la dirección completa
          onChange(details.street || formattedAddress, details);
          
          // Llamar al callback para actualizar otros campos del formulario
          if (onAddressDetailsChange) {
            onAddressDetailsChange(details);
          }
          
          // Llamar al callback onAddressSelected si se proporciona
          if (onAddressSelected) {
            onAddressSelected(place);
          }
        }
      } catch (error) {
        console.error('Error getting address details:', error);
        onChange(place.value.description);
        
        // Aún llamar a onAddressSelected con el lugar, incluso si falló la geocodificación
        if (onAddressSelected) {
          onAddressSelected(place);
        }
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      <GooglePlacesAutocomplete
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        apiOptions={{ 
          language: 'es',
          region: 'mx',
          libraries: ['places']
        }}
        autocompletionRequest={{
          componentRestrictions: { country: ['mx', 'us'] },
          types: ['address']
        }}
        selectProps={{
          value: address,
          onChange: handlePlaceSelect,
          placeholder,
          noOptionsMessage: () => "No se encontraron resultados",
          loadingMessage: () => "Buscando direcciones...",
          isClearable: true,
          className: "address-autocomplete",
          classNamePrefix: "address-select",
          styles: {
            control: (base) => ({
              ...base,
              minHeight: '40px',
              borderRadius: '0.375rem',
              borderColor: 'hsl(var(--input))',
              backgroundColor: 'hsl(var(--background))',
              boxShadow: 'none',
              '&:hover': {
                borderColor: 'hsl(var(--input))',
              },
            }),
            menu: (base) => ({
              ...base,
              zIndex: 9999,
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.375rem',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused 
                ? 'hsl(var(--accent))' 
                : 'hsl(var(--background))',
              color: state.isFocused 
                ? 'hsl(var(--accent-foreground))' 
                : 'hsl(var(--foreground))',
              cursor: 'pointer',
              '&:active': {
                backgroundColor: 'hsl(var(--accent))',
              },
            }),
            input: (base) => ({
              ...base,
              color: 'hsl(var(--foreground))',
            }),
            singleValue: (base) => ({
              ...base,
              color: 'hsl(var(--foreground))',
            }),
          }
        }}
      />
    </div>
  );
}
