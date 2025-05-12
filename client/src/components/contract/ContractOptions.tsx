import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileUp, Edit, Clock, ListChecks, MessageCircle } from "lucide-react";

interface ContractOptionProps {
  onSelectOption: (option: 'new' | 'template' | 'modify' | 'upload') => void;
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

      {/* Opción 2: Usar plantilla */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelectOption('template')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Edit className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Usar una plantilla</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Elige entre nuestras plantillas prediseñadas y completa los campos necesarios.
          </p>
          <Button variant="outline" className="mt-auto">
            Seleccionar plantilla
          </Button>
        </CardContent>
      </Card>

      {/* Opción 3: Modificar contrato existente */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelectOption('modify')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Modificar contrato anterior</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Usa un contrato anterior como base y realiza los cambios necesarios.
          </p>
          <Button variant="outline" className="mt-auto">
            Buscar contratos
          </Button>
        </CardContent>
      </Card>

      {/* Opción 4: Subir PDF de estimado */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelectOption('upload')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Cargar estimado aprobado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sube un PDF de un estimado aprobado para convertirlo automáticamente en contrato.
          </p>
          <Button variant="outline" className="mt-auto">
            Subir estimado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractOptions;