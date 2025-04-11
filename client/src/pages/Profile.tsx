
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    license: "",
    ein: "",
    businessType: "",
    website: "",
    description: ""
  });
  
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // TODO: Implementar guardado en la base de datos
      toast({
        title: "Perfil actualizado",
        description: "La información de la compañía ha sido guardada.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la información.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Perfil de la Compañía</h1>
        <Button onClick={handleSave}>Guardar Cambios</Button>
      </div>
      
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="docs">Documentación</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={companyInfo.companyName}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Propietario</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    value={companyInfo.ownerName}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={companyInfo.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    value={companyInfo.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={companyInfo.website}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción de la Empresa</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={companyInfo.description}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentación Legal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">Número de Licencia</Label>
                  <Input
                    id="license"
                    name="license"
                    value={companyInfo.license}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (Tax ID)</Label>
                  <Input
                    id="ein"
                    name="ein"
                    value={companyInfo.ein}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de Negocio</Label>
                  <Input
                    id="businessType"
                    name="businessType"
                    value={companyInfo.businessType}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archivos de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <i className="ri-upload-cloud-2-line text-4xl text-muted-foreground"></i>
                <p className="mt-2">Arrastra archivos aquí o haz clic para seleccionar</p>
                <p className="text-sm text-muted-foreground">PDF, JPG, PNG hasta 10MB</p>
                <input type="file" className="hidden" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
