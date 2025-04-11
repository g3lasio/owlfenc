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
      const response = await apiRequest("GET", "/api/user-profile");
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
      await apiRequest("POST", "/api/user-profile", companyInfo);
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
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground">Manage your fencing company information</p>
        </div>
        <Button onClick={handleSave} disabled={loading} size="lg">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="w-full border-b flex flex-wrap justify-start md:justify-center p-0 h-auto">
          <TabsTrigger value="info" className="flex-grow md:flex-grow-0">General Information</TabsTrigger>
          <TabsTrigger value="legal" className="flex-grow md:flex-grow-0">Documentation</TabsTrigger>
          <TabsTrigger value="specialties" className="flex-grow md:flex-grow-0">Specialties</TabsTrigger>
          <TabsTrigger value="profile" className="flex-grow md:flex-grow-0">User Profile</TabsTrigger>
        </TabsList>

        {/* GENERAL INFORMATION TAB */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Information and Contact</CardTitle>
              <CardDescription>
                Main details about your company for estimates and contracts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company basic information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={companyInfo.companyName}
                      onChange={handleChange}
                      placeholder="Your Company Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select 
                      value={companyInfo.businessType}
                      onValueChange={(value) => handleSelectChange("businessType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LLC">LLC</SelectItem>
                        <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="Corporation">Corporation</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="S-Corporation">S-Corporation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner Name</Label>
                    <Input
                      id="ownerName"
                      name="ownerName"
                      value={companyInfo.ownerName}
                      onChange={handleChange}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role in Company</Label>
                    <Input
                      id="role"
                      name="role"
                      value={companyInfo.role}
                      onChange={handleChange}
                      placeholder="Owner, Manager, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearEstablished">Year Established</Label>
                    <Input
                      id="yearEstablished"
                      name="yearEstablished"
                      value={companyInfo.yearEstablished}
                      onChange={handleChange}
                      placeholder="2010"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={companyInfo.website}
                      onChange={handleChange}
                      placeholder="https://www.yourcompany.com"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="description">Company Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={companyInfo.description}
                    onChange={handleChange}
                    placeholder="Describe your company and main services..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Logo Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Company Logo</h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-40 h-40 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {companyInfo.logo ? (
                      <img src={companyInfo.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Globe className="w-12 h-12 mb-2" />
                        <span>No logo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Your logo will appear on your estimates, contracts, and client communications.
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
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Allowed formats: PNG, JPG. Maximum size: 2MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={companyInfo.email}
                      onChange={handleChange}
                      placeholder="contact@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Office Phone</Label>
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
                    <Label htmlFor="mobilePhone">Mobile Phone</Label>
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
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={companyInfo.address}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={companyInfo.city}
                      onChange={handleChange}
                      placeholder="Portland"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={companyInfo.state}
                      onChange={handleChange}
                      placeholder="Oregon"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={companyInfo.zipCode}
                      onChange={handleChange}
                      placeholder="97204"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4">
                  <h3 className="text-lg font-medium mb-4">Social Media</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-3">
                      <Facebook className="w-5 h-5 text-blue-600" />
                      <Input
                        name="facebook"
                        value={companyInfo.socialMedia.facebook || ""}
                        onChange={(e) => handleSocialMediaChange("facebook", e.target.value)}
                        placeholder="https://facebook.com/yourcompany"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Instagram className="w-5 h-5 text-pink-600" />
                      <Input
                        name="instagram"
                        value={companyInfo.socialMedia.instagram || ""}
                        onChange={(e) => handleSocialMediaChange("instagram", e.target.value)}
                        placeholder="https://instagram.com/yourcompany"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-5 h-5 text-blue-800" />
                      <Input
                        name="linkedin"
                        value={companyInfo.socialMedia.linkedin || ""}
                        onChange={(e) => handleSocialMediaChange("linkedin", e.target.value)}
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTATION TAB */}
        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legal Documentation</CardTitle>
              <CardDescription>
                Legal information and important company documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
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
                  <Label htmlFor="insurancePolicy">Insurance Policy</Label>
                  <Input
                    id="insurancePolicy"
                    name="insurancePolicy"
                    value={companyInfo.insurancePolicy}
                    onChange={handleChange}
                    placeholder="INS-9876543"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Company Documents</h3>
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
                    <AccordionTrigger>Licenses and Permits</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        <div className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-blue-500" />
                            <div>
                              <p className="font-medium">Contractor License</p>
                              <p className="text-sm text-muted-foreground">
                                {companyInfo.documents?.licenseDocument ? "Document uploaded" : "No document"}
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
                            Upload
                          </Button>
                        </div>
                        
                        <div className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-blue-500" />
                            <div>
                              <p className="font-medium">Insurance Certificate</p>
                              <p className="text-sm text-muted-foreground">
                                {companyInfo.documents?.insuranceDocument ? "Document uploaded" : "No document"}
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
                            Upload
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="contracts">
                    <AccordionTrigger>Contracts and Agreements</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        <div className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-green-500" />
                            <div>
                              <p className="font-medium">Standard Terms and Conditions</p>
                              <p className="text-sm text-muted-foreground">
                                {companyInfo.documents?.termsDocument ? "Document uploaded" : "No document"}
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
                            Upload
                          </Button>
                        </div>
                        
                        <div className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-green-500" />
                            <div>
                              <p className="font-medium">Warranty Information</p>
                              <p className="text-sm text-muted-foreground">
                                {companyInfo.documents?.warrantyDocument ? "Document uploaded" : "No document"}
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
                            Upload
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="other">
                    <AccordionTrigger>Other Documents</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        <div className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-purple-500" />
                            <div>
                              <p className="font-medium">Product Catalog</p>
                              <p className="text-sm text-muted-foreground">
                                {companyInfo.documents?.catalogDocument ? "Document uploaded" : "No document"}
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
                            Upload
                          </Button>
                        </div>
                        
                        <div className="border rounded-md p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <FileText className="text-purple-500" />
                            <div>
                              <p className="font-medium">Company Brochure</p>
                              <p className="text-sm text-muted-foreground">
                                {companyInfo.documents?.brochureDocument ? "Document uploaded" : "No document"}
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
                            Upload
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SPECIALTIES TAB */}
        <TabsContent value="specialties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Specialties and Services</CardTitle>
              <CardDescription>
                Indicate the types of fences and services you offer.
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
                  <p className="text-muted-foreground text-sm">No specialties added.</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Ex: Wood Fences, Gate Installation, etc."
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

        {/* PESTAÑA PERFIL DE USUARIO */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perfil del Usuario</CardTitle>
              <CardDescription>
                Información personal sobre el usuario y sus credenciales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input
                    id="username"
                    name="username"
                    value="john_contractor"
                    disabled
                    placeholder="Nombre de usuario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Correo Electrónico Personal</Label>
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
                  <Button className="w-full md:w-auto" variant="outline">Actualizar Contraseña</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}