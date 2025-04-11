
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

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
      <h1 className="text-2xl font-bold">Perfil de la Compañía</h1>
      
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="docs">Documentación</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Compañía</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Compañía</Label>
                  <Input 
                    id="companyName"
                    value={companyInfo.companyName}
                    onChange={(e) => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Propietario</Label>
                  <Input 
                    id="ownerName"
                    value={companyInfo.ownerName}
                    onChange={(e) => setCompanyInfo({...companyInfo, ownerName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN Number</Label>
                  <Input 
                    id="ein"
                    value={companyInfo.ein}
                    onChange={(e) => setCompanyInfo({...companyInfo, ein: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de Negocio</Label>
                  <Input 
                    id="businessType"
                    value={companyInfo.businessType}
                    onChange={(e) => setCompanyInfo({...companyInfo, businessType: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license">Número de Licencia</Label>
                  <Input 
                    id="license"
                    value={companyInfo.license}
                    onChange={(e) => setCompanyInfo({...companyInfo, license: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input 
                    id="website"
                    value={companyInfo.website}
                    onChange={(e) => setCompanyInfo({...companyInfo, website: e.target.value})}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Descripción del Negocio</Label>
                  <textarea 
                    id="description"
                    className="w-full min-h-[100px] p-2 border rounded"
                    value={companyInfo.description}
                    onChange={(e) => setCompanyInfo({...companyInfo, description: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">
                Guardar Información
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-2">Licencia de Contratista</h3>
                  <Button variant="outline">
                    <i className="ri-upload-line mr-2"></i> Subir Documento
                  </Button>
                </div>
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-2">Certificado de LLC</h3>
                  <Button variant="outline">
                    <i className="ri-upload-line mr-2"></i> Subir Documento
                  </Button>
                </div>
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-2">Seguro de Responsabilidad</h3>
                  <Button variant="outline">
                    <i className="ri-upload-line mr-2"></i> Subir Documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Archivos de la Compañía</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full">
                  <i className="ri-folder-add-line mr-2"></i> Nueva Carpeta
                </Button>
                <Button variant="outline" className="w-full">
                  <i className="ri-upload-line mr-2"></i> Subir Archivos
                </Button>
                <div className="border rounded-lg p-4 min-h-[200px]">
                  <p className="text-center text-muted-foreground">
                    No hay archivos subidos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
