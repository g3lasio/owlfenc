
import { Input } from "./input";
import { Label } from "./label";
import GooglePlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete';

interface AddressAutocompleteProps {
  label?: string;
  value?: string;
  onChange: (address: string, details?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) => void;
  placeholder?: string;
}

export function AddressAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Enter address..."
}: AddressAutocompleteProps) {
  const handlePlaceSelect = async (place: any) => {
    if (place && place.value) {
      try {
        const results = await geocodeByAddress(place.value.description);
        if (results && results.length > 0) {
          const addressComponents = results[0].address_components;
          let details = {
            street: '',
            city: '',
            state: '',
            zipCode: ''
          };

          addressComponents.forEach((component: any) => {
            const types = component.types;
            if (types.includes('street_number') || types.includes('route')) {
              details.street = details.street 
        ? `${details.street} ${component.long_name}`
        : component.long_name;
            }
            if (types.includes('locality')) {
              details.city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              details.state = component.long_name;
            }
            if (types.includes('postal_code')) {
              details.zipCode = component.long_name;
            }
          });

          onChange(place.value.description, details);
        }
      } catch (error) {
        console.error('Error getting address details:', error);
        onChange(place.value.description);
      }
    }
  };

  return (
    <div className="space-y-2">
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
          value: { label: value, value: { description: value } },
          onChange: handlePlaceSelect,
          placeholder,
          noOptionsMessage: () => "No se encontraron resultados",
          loadingMessage: () => "Buscando direcciones...",
        }}
      />
    </div>
  );
}
