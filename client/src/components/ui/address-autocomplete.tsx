import React from 'react';
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onStateExtracted?: (state: string) => void;
  placeholder?: string;
}

/**
 * Campo de dirección completamente básico SIN AUTOCOMPLETADO
 * Versión simplificada que solo permite al usuario escribir sin interrupciones
 */
export function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Escribir dirección..."
}: AddressAutocompleteProps) {
  
  // Limpiar la dirección
  const handleClearAddress = () => {
    onChange('');
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-8"
        autoComplete="off"
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
  );
}