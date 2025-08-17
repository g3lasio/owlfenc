import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";

interface MapboxAddressAutocompleteProps {
  value?: string;
  onChange: (address: string, details?: any) => void;
  placeholder?: string;
}

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
}

export function MapboxAddressAutocomplete({
  value = "",
  onChange,
  placeholder = "Buscar dirección..."
}: MapboxAddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock suggestions for development (replace with real Mapbox integration when API key is available)
  const mockSuggestions: Suggestion[] = [
    {
      id: "1",
      place_name: "123 Main Street, Portland, Oregon 97201, United States",
      center: [-122.676482, 45.515232],
      context: [
        { id: "city", text: "Portland" },
        { id: "region", text: "Oregon" },
        { id: "postcode", text: "97201" }
      ]
    },
    {
      id: "2", 
      place_name: "456 Oak Avenue, Portland, Oregon 97202, United States",
      center: [-122.658722, 45.505232],
      context: [
        { id: "city", text: "Portland" },
        { id: "region", text: "Oregon" },
        { id: "postcode", text: "97202" }
      ]
    },
    {
      id: "3",
      place_name: "789 Pine Street, Portland, Oregon 97204, United States", 
      center: [-122.676482, 45.525232],
      context: [
        { id: "city", text: "Portland" },
        { id: "region", text: "Oregon" },
        { id: "postcode", text: "97204" }
      ]
    }
  ];

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // For now, use mock data that filters based on input
      // TODO: Replace with real Mapbox Geocoding API when MAPBOX_ACCESS_TOKEN is available
      const filteredSuggestions = mockSuggestions.filter(suggestion =>
        suggestion.place_name.toLowerCase().includes(query.toLowerCase())
      );
      
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error("Error searching addresses:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce search
    timeoutRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInputValue(suggestion.place_name);
    setShowSuggestions(false);
    setSuggestions([]);

    // Extract address components
    const details = {
      city: suggestion.context?.find(c => c.id.includes('place'))?.text || '',
      state: suggestion.context?.find(c => c.id.includes('region'))?.text || '',
      zipCode: suggestion.context?.find(c => c.id.includes('postcode'))?.text || '',
      coordinates: suggestion.center
    };

    onChange(suggestion.place_name, details);
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    onChange("");
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10"
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Buscando direcciones...
            </div>
          )}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="truncate">{suggestion.place_name}</span>
              </div>
            </button>
          ))}
          {!isLoading && suggestions.length === 0 && inputValue.length >= 3 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No se encontraron direcciones
            </div>
          )}
        </div>
      )}
    </div>
  );
}