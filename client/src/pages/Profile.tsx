
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, FileText, Facebook, Instagram, Linkedin, Globe, Mail, Phone } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SocialMediaLinks = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  [key: string]: string | undefined;
};

interface CompanyInfoType {
  companyName: string;
  ownerName: string;
  role: string;
  email: string;
  phone: string;
  mobilePhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  license: string;
  insurancePolicy: string;
  ein: string;
  businessType: string;
  yearEstablished: string;
  website: string;
  description: string;
  specialties: string[];
  socialMedia: SocialMediaLinks;
  documents: Record<string, string>;
  logo: string;
}

export default function Profile() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoType>({
    companyName: "",
    ownerName: "",
    role: "",
    email: "",
    phone: "",
    mobilePhone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    license: "",
    insurancePolicy: "",
    ein: "",
    businessType: "",
    yearEstablished: "",
    website: "",
    description: "",
    specialties: [],
    socialMedia: {},
    documents: {},
    logo: ""
  });
  
  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDocumentSection, setActiveDocumentSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      const response = await apiRequest("GET", "/api/profile");
      const data = await response.json();
      setCompanyInfo(data);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil.",
        variant: "destructive"
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() === "") return;
    
    if (!companyInfo.specialties.includes(newSpecialty)) {
      setCompanyInfo(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty]
      }));
    }
    
    setNewSpecialty("");
  };

  const removeSpecialty = (specialty: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  // Esta función simula la subida de un archivo
  // En una aplicación real, usarías una API para subir el archivo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simulamos la subida creando una URL para previsualizar
    const fileUrl = URL.createObjectURL(file);
    
    if (type === 'logo') {
      setCompanyInfo(prev => ({
        ...prev,
        logo: fileUrl
      }));
    } else {
      setCompanyInfo(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [type]: fileUrl
        }
      }));
    }

    toast({
      title: "Archivo cargado",
      description: `${file.name} ha sido cargado correctamente.`,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/profile", companyInfo);
      toast({
        title: "Perfil actualizado",
        description: "La información de la compañía ha sido guardada exitosamente.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Perfil de la Compañía</h1>
          <p className="text-muted-foreground">Administra la información de tu empresa de cercas</p>
        </div>
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
      
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="w-full border-b flex flex-wrap justify-start md:justify-center p-0 h-auto">
          <TabsTrigger value="info" className="flex-grow md:flex-grow-0">Información General</TabsTrigger>
          <TabsTrigger value="contact" className="flex-grow md:flex-grow-0">Contacto</TabsTrigger>
          <TabsTrigger value="legal" className="flex-grow md:flex-grow-0">Documentación Legal</TabsTrigger>
          <TabsTrigger value="specialties" className="flex-grow md:flex-grow-0">Especialidades</TabsTrigger>
          <TabsTrigger value="branding" className="flex-grow md:flex-grow-0">Logo & Marca</TabsTrigger>
          <TabsTrigger value="documents" className="flex-grow md:flex-grow-0">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Esta información aparecerá en tus estimaciones y contratos.
              </CardDescription>
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
                    placeholder="Tu Empresa S.A. de C.V."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de Negocio</Label>
                  <Select 
                    value={companyInfo.businessType}
                    onValueChange={(value) => handleSelectChange("businessType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de negocio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="Sole Proprietorship">Propietario único</SelectItem>
                      <SelectItem value="Corporation">Corporación</SelectItem>
                      <SelectItem value="Partnership">Sociedad</SelectItem>
                      <SelectItem value="S-Corporation">S-Corporation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Propietario</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    value={companyInfo.ownerName}
                    onChange={handleChange}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol en la Empresa</Label>
                  <Input
                    id="role"
                    name="role"
                    value={companyInfo.role}
                    onChange={handleChange}
                    placeholder="Propietario, Gerente, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearEstablished">Año de Establecimiento</Label>
                  <Input
                    id="yearEstablished"
                    name="yearEstablished"
                    value={companyInfo.yearEstablished}
                    onChange={handleChange}
                    placeholder="2010"
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
                    placeholder="https://www.tuempresa.com"
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
                  placeholder="Describe tu empresa y servicios principales..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
              <CardDescription>
                Detalles de contacto para clientes y proveedores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={handleChange}
                    placeholder="contacto@tuempresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono de Oficina</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={companyInfo.phone}
                    onChange={handleChange}
                    placeholder="(123) 456-7890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Teléfono Móvil</Label>
                  <Input
                    id="mobilePhone"
                    name="mobilePhone"
                    type="tel"
                    value={companyInfo.mobilePhone}
                    onChange={handleChange}
                    placeholder="(123) 456-7890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    value={companyInfo.address}
                    onChange={handleChange}
                    placeholder="Calle Principal #123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    name="city"
                    value={companyInfo.city}
                    onChange={handleChange}
                    placeholder="Portland"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    name="state"
                    value={companyInfo.state}
                    onChange={handleChange}
                    placeholder="Oregon"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Código Postal</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={companyInfo.zipCode}
                    onChange={handleChange}
                    placeholder="97204"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Redes Sociales</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <Input
                      name="facebook"
                      value={companyInfo.socialMedia.facebook || ""}
                      onChange={(e) => handleSocialMediaChange("facebook", e.target.value)}
                      placeholder="https://facebook.com/tuempresa"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <Input
                      name="instagram"
                      value={companyInfo.socialMedia.instagram || ""}
                      onChange={(e) => handleSocialMediaChange("instagram", e.target.value)}
                      placeholder="https://instagram.com/tuempresa"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-5 h-5 text-blue-800" />
                    <Input
                      name="linkedin"
                      value={companyInfo.socialMedia.linkedin || ""}
                      onChange={(e) => handleSocialMediaChange("linkedin", e.target.value)}
                      placeholder="https://linkedin.com/company/tuempresa"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentación Legal</CardTitle>
              <CardDescription>
                Información legal y documentos importantes de la empresa.
              </CardDescription>
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
                    placeholder="CCB #123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (Tax ID)</Label>
                  <Input
                    id="ein"
                    name="ein"
                    value={companyInfo.ein}
                    onChange={handleChange}
                    placeholder="12-3456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurancePolicy">Póliza de Seguro</Label>
                  <Input
                    id="insurancePolicy"
                    name="insurancePolicy"
                    value={companyInfo.insurancePolicy}
                    onChange={handleChange}
                    placeholder="INS-9876543"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Especialidades y Servicios</CardTitle>
              <CardDescription>
                Indica los tipos de cercas y servicios que ofreces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {companyInfo.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                    {specialty}
                    <button 
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {companyInfo.specialties.length === 0 && (
                  <p className="text-muted-foreground text-sm">No hay especialidades añadidas.</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Ej: Cercas de Madera, Instalación de Puertas, etc."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSpecialty();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={addSpecialty}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo y Marca</CardTitle>
              <CardDescription>
                Personaliza la imagen de tu empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-40 h-40 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {companyInfo.logo ? (
                      <img src={companyInfo.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Globe className="w-12 h-12 mb-2" />
                        <span>Sin logo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium">Logo de la Empresa</h3>
                    <p className="text-sm text-muted-foreground">
                      Tu logo aparecerá en tus estimaciones, contratos y comunicaciones con clientes.
                    </p>
                    <div>
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Subir Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Formatos permitidos: PNG, JPG. Tamaño máximo: 2MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de la Empresa</CardTitle>
              <CardDescription>
                Sube y gestiona documentos importantes relacionados con tu negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (activeDocumentSection) {
                    handleFileUpload(e, activeDocumentSection);
                  }
                }}
              />
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="licenses">
                  <AccordionTrigger>Licencias y Permisos</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4">
                      <div className="border rounded-md p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="text-blue-500" />
                          <div>
                            <p className="font-medium">Licencia de Contratista</p>
                            <p className="text-sm text-muted-foreground">
                              {companyInfo.documents?.licenseDocument ? "Documento cargado" : "No hay documento"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveDocumentSection("licenseDocument");
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>
                      
                      <div className="border rounded-md p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="text-blue-500" />
                          <div>
                            <p className="font-medium">Certificado de Seguro</p>
                            <p className="text-sm text-muted-foreground">
                              {companyInfo.documents?.insuranceDocument ? "Documento cargado" : "No hay documento"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveDocumentSection("insuranceDocument");
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="contracts">
                  <AccordionTrigger>Contratos y Acuerdos</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4">
                      <div className="border rounded-md p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="text-green-500" />
                          <div>
                            <p className="font-medium">Términos y Condiciones Estándar</p>
                            <p className="text-sm text-muted-foreground">
                              {companyInfo.documents?.termsDocument ? "Documento cargado" : "No hay documento"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveDocumentSection("termsDocument");
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>
                      
                      <div className="border rounded-md p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="text-green-500" />
                          <div>
                            <p className="font-medium">Garantías</p>
                            <p className="text-sm text-muted-foreground">
                              {companyInfo.documents?.warrantyDocument ? "Documento cargado" : "No hay documento"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveDocumentSection("warrantyDocument");
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="other">
                  <AccordionTrigger>Otros Documentos</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4">
                      <div className="border rounded-md p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="text-purple-500" />
                          <div>
                            <p className="font-medium">Catálogo de Productos</p>
                            <p className="text-sm text-muted-foreground">
                              {companyInfo.documents?.catalogDocument ? "Documento cargado" : "No hay documento"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveDocumentSection("catalogDocument");
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>
                      
                      <div className="border rounded-md p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="text-purple-500" />
                          <div>
                            <p className="font-medium">Folleto de Empresa</p>
                            <p className="text-sm text-muted-foreground">
                              {companyInfo.documents?.brochureDocument ? "Documento cargado" : "No hay documento"}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setActiveDocumentSection("brochureDocument");
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
