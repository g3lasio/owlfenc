import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Buscar dirección..."
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Función para buscar direcciones
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      // Simulación mejorada con direcciones más realistas
      const mockSuggestions = [
        `${query} Main St, Los Angeles, CA 90001`,
        `${query} Broadway Ave, New York, NY 10001`,
        `${query} Lake Shore Dr, Chicago, IL 60611`,
        `${query} Market St, San Francisco, CA 94103`,
        `${query} Peachtree St, Atlanta, GA 30303`
      ];
      
      // En producción, aquí se conectaría a Google Places API
      
      // Simular latencia de red
      setTimeout(() => {
        setSuggestions(mockSuggestions);
        setIsSearching(false);
      }, 300);
    } catch (error) {
      console.error("Error buscando direcciones:", error);
      setIsSearching(false);
      setSuggestions([]);
    }
  };

  // Actualizar sugerencias cuando cambie la consulta
  useEffect(() => {
    const handler = setTimeout(() => {
      searchAddresses(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Manejar la selección de una dirección
  const handleSelectAddress = (address: string) => {
    onChange(address);
    setOpen(false);
    setSearchQuery('');
  };

  // Limpiar la dirección seleccionada
  const handleClearAddress = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                onChange(newValue);
                setSearchQuery(newValue);
                if (newValue.length > 2 && !open) {
                  setOpen(true);
                }
              }}
              onClick={() => setOpen(true)}
              placeholder={placeholder}
              className="w-full pr-8"
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAddress();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px] max-h-[300px] overflow-y-auto" align="start" side="bottom" sideOffset={5}>
          <Command>
            <CommandList>
              <CommandEmpty>
                {isSearching ? (
                  <div className="flex items-center justify-center p-4 text-sm">
                    Buscando direcciones...
                  </div>
                ) : searchQuery.length > 0 ? (
                  <div className="flex items-center justify-center p-4 text-sm">
                    No se encontraron direcciones
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 text-sm">
                    Comienza a escribir para buscar direcciones
                  </div>
                )}
              </CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup heading="Direcciones sugeridas">
                  {suggestions.map((address, index) => (
                    <CommandItem
                      key={index}
                      value={address}
                      onSelect={() => handleSelectAddress(address)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{address}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}