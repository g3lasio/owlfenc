
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    setLoading(true);
    try {
      // Implementar lógica de actualización de contraseña
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la contraseña.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    firstName: "",
    paternalLastName: "",
    maternalLastName: "",
    nickname: "",
    userEmail: "",
    userPhone: "",
    userPosition: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      // Aquí iría la llamada a la API para guardar los cambios
      await apiRequest("POST", "/api/user-profile", formData);
      toast({
        title: "Cambios guardados",
        description: "La información personal ha sido actualizada exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mi Cuenta</h1>
          <p className="text-muted-foreground">Administra tu información personal y credenciales</p>
        </div>
        <Button onClick={handleSaveChanges} disabled={loading}>
          {loading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Actualiza tu información de contacto y preferencias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value="john_contractor"
                disabled
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre(s)</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Ej: Juan Antonio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paternalLastName">Apellido Paterno</Label>
              <Input
                id="paternalLastName"
                name="paternalLastName"
                placeholder="Ej: González"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maternalLastName">Apellido Materno</Label>
              <Input
                id="maternalLastName"
                name="maternalLastName"
                placeholder="Ej: Rodríguez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Apodo</Label>
              <Input
                id="nickname"
                name="nickname"
                placeholder="Ej: El Güero, El Flaco, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email Personal</Label>
              <Input
                id="userEmail"
                name="userEmail"
                type="email"
                placeholder="usuario@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPhone">Teléfono Personal</Label>
              <Input
                id="userPhone"
                name="userPhone"
                type="tel"
                placeholder="(123) 456-7890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPosition">Cargo/Posición</Label>
              <Input
                id="userPosition"
                name="userPosition"
                placeholder="Director de Operaciones, Gerente, etc."
              />
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-4">Cambiar Contraseña</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              <Button 
                className="w-full md:w-auto" 
                onClick={handleUpdatePassword}
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
