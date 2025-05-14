import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ListChecks, Files } from "lucide-react";

interface ContractOptionProps {
  onSelectOption: (option: 'new' | 'guided-flow' | 'my-contracts') => void;
}

const ContractOptions: React.FC<ContractOptionProps> = ({ onSelectOption }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
      {/* Opción 1: Crear desde cero */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelectOption('new')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Crear nuevo contrato</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crea un contrato completamente personalizado ingresando todos los detalles manualmente.
          </p>
          <Button variant="outline" className="mt-auto">
            Empezar desde cero
          </Button>
        </CardContent>
      </Card>

      {/* Opción 2: Flujo guiado de preguntas */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/20"
        onClick={() => onSelectOption('guided-flow')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <ListChecks className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Flujo guiado de preguntas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Te guiaré paso a paso con preguntas específicas para crear tu contrato fácilmente.
          </p>
          <Button variant="default" className="mt-auto">
            Iniciar flujo guiado
          </Button>
        </CardContent>
      </Card>

      {/* Opción 3: Mis Contratos */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow md:col-span-2"
        onClick={() => onSelectOption('my-contracts')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Files className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Mis Contratos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Visualiza, busca y descarga tus contratos existentes.
          </p>
          <Button variant="outline" className="mt-auto">
            Ver historial de contratos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractOptions;