import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  Star,
  FileSymlink
} from "lucide-react";
import { Client } from "../../services/clientService";

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView: (client: Client) => void;
  onCreateProject: (client: Client) => void;
  onViewHistory: (client: Client) => void;
}

export function ClientCard({ 
  client, 
  onEdit, 
  onDelete, 
  onView, 
  onCreateProject, 
  onViewHistory 
}: ClientCardProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'cliente': return 'bg-blue-100 text-blue-800';
      case 'proveedor': return 'bg-green-100 text-green-800';
      case 'empleado': return 'bg-purple-100 text-purple-800';
      case 'subcontratista': return 'bg-orange-100 text-orange-800';
      case 'prospecto': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-1">{client.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge className={getClassificationColor(client.classification || 'cliente')}>
                {client.classification || 'Cliente'}
              </Badge>
              {client.source && (
                <Badge variant="outline" className="text-xs">
                  {client.source}
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onView(client)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(client)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDelete(client)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Información de contacto */}
        <div className="space-y-2">
          {(client.phone || client.mobilePhone) && (
            <p className="text-sm flex items-center">
              <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
              {client.phone && (
                <span className="mr-2">{client.phone}</span>
              )}
              {client.mobilePhone && (
                <span className="text-muted-foreground">
                  {client.phone ? `/ ${client.mobilePhone}` : client.mobilePhone}
                </span>
              )}
            </p>
          )}
          {client.email && (
            <p className="text-sm flex items-center">
              <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
              <span className="truncate">{client.email}</span>
            </p>
          )}
          {client.address && (
            <p className="text-sm flex items-center">
              <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
              <span className="truncate">
                {client.address}
                {client.city && client.state && (
                  <span className="text-muted-foreground">, {client.city}, {client.state}</span>
                )}
                {client.zipCode && <span className="text-muted-foreground"> {client.zipCode}</span>}
              </span>
            </p>
          )}
        </div>

        {/* Notas */}
        {client.notes && (
          <p className="text-sm text-muted-foreground italic">
            <span className="line-clamp-2">
              "{client.notes.length > 80 
                ? `${client.notes.substring(0, 77)}...` 
                : client.notes}"
            </span>
          </p>
        )}

        {/* Etiquetas */}
        {client.tags && client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {client.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {client.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{client.tags.length - 3} más
              </Badge>
            )}
          </div>
        )}

        {/* Fecha de creación */}
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          Creado {formatDate(client.createdAt)}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onCreateProject(client)}
            className="flex-1"
          >
            <Star className="mr-1 h-3 w-3" /> 
            Proyecto
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onViewHistory(client)}
            className="flex-1"
          >
            <FileSymlink className="mr-1 h-3 w-3" /> 
            Historial
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}