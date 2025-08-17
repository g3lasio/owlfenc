import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Tag, 
  FileText, 
  Edit, 
  Trash2, 
  Star,
  FileSymlink,
  Building,
  Users
} from "lucide-react";
import { Client } from "../../services/clientService";

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onCreateProject: (client: Client) => void;
  onViewHistory: (client: Client) => void;
}

export function ClientDetailModal({
  client,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCreateProject,
  onViewHistory
}: ClientDetailModalProps) {
  if (!client) return null;

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{client.name}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <Badge className={getClassificationColor(client.classification || 'cliente')}>
                  {client.classification || 'Cliente'}
                </Badge>
                {client.source && (
                  <Badge variant="outline">
                    {client.source}
                  </Badge>
                )}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(client)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                      {client.email}
                    </a>
                  </span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                      {client.phone}
                    </a>
                    <span className="text-muted-foreground ml-1">(Principal)</span>
                  </span>
                </div>
              )}
              {client.mobilePhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <a href={`tel:${client.mobilePhone}`} className="text-blue-600 hover:underline">
                      {client.mobilePhone}
                    </a>
                    <span className="text-muted-foreground ml-1">(Móvil)</span>
                  </span>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <div>{client.address}</div>
                    {(client.city || client.state || client.zipCode) && (
                      <div className="text-muted-foreground">
                        {[client.city, client.state, client.zipCode].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Etiquetas */}
          {client.tags && client.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Etiquetas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Información del sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Creado:</span> {formatDate(client.createdAt)}
                </span>
              </div>
              {client.updatedAt && client.updatedAt !== client.createdAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Última actualización:</span> {formatDate(client.updatedAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">ID:</span> 
                  <code className="ml-1 px-1 py-0.5 bg-muted rounded text-xs">{client.id}</code>
                </span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => onCreateProject(client)}
              className="flex items-center gap-2"
            >
              <Star className="h-4 w-4" />
              Crear Proyecto
            </Button>
            <Button 
              variant="outline"
              onClick={() => onViewHistory(client)}
              className="flex items-center gap-2"
            >
              <FileSymlink className="h-4 w-4" />
              Ver Historial
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(`mailto:${client.email}`, '_blank')}
              disabled={!client.email}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Enviar Email
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(`tel:${client.phone || client.mobilePhone}`, '_blank')}
              disabled={!client.phone && !client.mobilePhone}
              className="flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Llamar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}