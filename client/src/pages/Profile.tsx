import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
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
import { SubscriptionInfo } from "@/components/ui/subscription-info";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Link } from "wouter";
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
  profilePhoto?: string;
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
  const { profile, isLoading: isLoadingProfile, error: profileError, updateProfile } = useProfile();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoType>(profile || {
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
      await updateProfile(companyInfo);
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

  const handleChangePassword = () => {
    // Add your password change logic here
    console.log("Change password clicked!");
    //Example:  You would typically make an API call here to update the password.
  };


  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      {/* User Profile Banner */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="flex-shrink-0 relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Here you would typically upload the file to your storage
                  // For now we'll just create an object URL
                  const imageUrl = URL.createObjectURL(file);
                  setCompanyInfo(prev => ({
                    ...prev,
                    profilePhoto: imageUrl
                  }));
                }
              }}
              className="hidden"
              id="profile-photo-input"
            />
            <label 
              htmlFor="profile-photo-input" 
              className="cursor-pointer group relative block w-24 h-24 rounded-full overflow-hidden"
            >
              {companyInfo.profilePhoto ? (
                <img 
                  src={companyInfo.profilePhoto} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center">
                  <span className="text-3xl font-medium">JC</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 group-hover:flex items-center justify-center hidden text-white">
                <Upload className="w-6 h-6" />
              </div>
            </label>
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h1 className="text-2xl font-bold">{companyInfo.ownerName || "John Contractor"}</h1>
              </div>
              <div className="mt-2 sm:mt-0">
                <div className="bg-gradient-to-r from-emerald-500 to-lime-600 text-white px-4 py-2 rounded-full font-medium text-sm inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  El Mero Patrón
                </div>
                <div className="text-center mt-2">
                  <Link to="/subscription" className="text-xs text-primary hover:underline">
                    Cambiar plan
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-accent/20 rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Proyectos Activos</p>
                <p className="text-xl font-semibold">12</p>
              </div>
              <div className="bg-accent/20 rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="text-xl font-semibold">47</p>
              </div>
              <div className="bg-accent/20 rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">Vence</p>
                <p className="text-xl font-semibold">15 Mayo 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  <div className="col-span-2">
                    <AddressAutocomplete
                      label="Address"
                      value={companyInfo.address}
                      onChange={(address, details) => {
                        setCompanyInfo(prev => ({
                          ...prev,
                          address: address,
                          city: details?.city || prev.city,
                          state: details?.state || prev.state,
                          zipCode: details?.zipCode || prev.zipCode
                        }));
                      }}
                      placeholder="Enter your company address"
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
                      readOnly
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
                      readOnly
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
                      readOnly
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

        {/* USER PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4">
          {/* Subscription Information */}
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-4">Plan de Suscripción</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="h-full">
                  <SubscriptionInfo showHeader={false} />
                </div>
              </div>
              <div>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Beneficios de Suscripción</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-primary mr-2">✓</span>
                        <span>Acceso a Mervin AI para ayudarte con tus proyectos</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">✓</span>
                        <span>Generación de estimaciones precisas</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">✓</span>
                        <span>Clientes y proyectos ilimitados</span>
                      </li>
                    </ul>
                    <div className="mt-4 pt-3 border-t">
                      <Link to="/subscription">
                        <Button variant="outline" className="w-full">
                          Ver todos los planes
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Personal information about the user and their credentials.
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
                  <Label htmlFor="userEmail">Personal Email</Label>
                  <Input
                    id="userEmail"
                    name="userEmail"
                    type="email"
                    placeholder="user@gmail.com"
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPhone">Personal Phone</Label>
                  <Input
                    id="userPhone"
                    name="userPhone"
                    type="tel"
                    placeholder="(123) 456-7890"
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPosition">Position/Role</Label>
                  <Input
                    id="userPosition"
                    name="userPosition"
                    placeholder="Operations Director, Manager, etc."
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      placeholder="••••••••"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="••••••••"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="flex justify-end gap-4 mt-4">
                    <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                      {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                    <Button onClick={() => handleChangePassword()} variant="outline" className="w-full md:w-auto">
                      Actualizar Contraseña
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}