import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Download, Eye, PlusCircle, Search, Send, FileSignature } from "lucide-react";

interface Contract {
  id: number;
  title: string;
  clientName: string;
  createdAt: string;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  contractType: string;
  html?: string;
}

interface ContractDashboardProps {
  contracts: Contract[];
  isLoading: boolean;
  onPreview: (contract: Contract) => void;
  onDownload: (id: number) => void;
  onCreateNew: () => void;
  onSendEmail: (id: number) => void;
  onSign: (id: number) => void;
}

const ContractDashboard: React.FC<ContractDashboardProps> = ({
  contracts,
  isLoading,
  onPreview,
  onDownload,
  onCreateNew,
  onSendEmail,
  onSign
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar contratos por término de búsqueda
  const filteredContracts = contracts.filter(contract => 
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función auxiliar para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }).format(date);
  };

  // Función para obtener color de badge según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'sent':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'signed':
        return "bg-green-100 text-green-800 border-green-200";
      case 'completed':
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Función para obtener texto de estado en español
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return "Borrador";
      case 'sent':
        return "Enviado";
      case 'signed':
        return "Firmado";
      case 'completed':
        return "Completado";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mis Contratos</h2>
        <Button onClick={onCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Contrato
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar contratos..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="opacity-70 animate-pulse">
              <CardHeader className="p-4">
                <div className="h-5 w-3/4 bg-muted rounded"></div>
                <div className="h-4 w-1/2 bg-muted rounded mt-2"></div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-4 w-3/4 bg-muted rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-muted rounded"></div>
              </CardContent>
              <CardFooter className="p-4 flex justify-between">
                <div className="h-8 w-16 bg-muted rounded"></div>
                <div className="h-8 w-16 bg-muted rounded"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center p-10 bg-muted/20 rounded-lg border">
          <p className="text-lg mb-2">No se encontraron contratos</p>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No hay contratos que coincidan con tu búsqueda' : 'Aún no has creado ningún contrato'}
          </p>
          <Button onClick={onCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Nuevo Contrato
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{contract.title}</CardTitle>
                  <Badge className={`${getStatusColor(contract.status)} font-normal text-xs`}>
                    {getStatusText(contract.status)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(contract.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm">
                  <span className="font-medium">Cliente:</span> {contract.clientName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Tipo:</span> {contract.contractType}
                </p>
              </CardContent>
              <CardFooter className="p-4 flex justify-between">
                <div className="flex space-x-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onPreview(contract)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(contract.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex space-x-1">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => onSendEmail(contract.id)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => onSign(contract.id)}
                  >
                    <FileSignature className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractDashboard;