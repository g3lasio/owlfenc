import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Plus,
  X,
  Upload,
  FileText,
  Facebook,
  Instagram,
  Linkedin,
  Globe,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SubscriptionInfo } from "@/components/ui/subscription-info";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type SocialMediaLinks = Record<string, string>;

// Usamos el mismo tipo UserProfile del hook para evitar incompatibilidades
import { UserProfile } from "@/hooks/use-profile";

// Alias de CompanyInfoType a UserProfile para mantener compatibilidad con el código existente
type CompanyInfoType = UserProfile;

export default function Profile() {
  const { toast } = useToast();
  const {
    profile,
    isLoading: isLoadingProfile,
    error: profileError,
    updateProfile,
  } = useProfile();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoType>(
    profile || {
      company: "",
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
      logo: "",
    },
  );

  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDocumentSection, setActiveDocumentSection] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Email verification state
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<
    "unverified" | "pending" | "verified" | "checking"
  >("unverified");
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setCompanyInfo((prev) => ({
        ...prev,
        ...profile,
      }));
    }
  }, [profile]);

  // Si no hay perfil en el hook useProfile, intentamos cargar directamente
  useEffect(() => {
    if (!profile && !isLoadingProfile) {
      loadCompanyProfile();
    }
  }, [profile, isLoadingProfile]);

  const loadCompanyProfile = async () => {
    try {
      console.log("🔄 Cargando perfil de empresa...");

      // Usar ID fijo para desarrollo
      const userId = "dev-user-123";
      console.log(`👤 Usuario actual: ${userId}`);

      // Usar clave específica por usuario para localStorage
      const profileKey = `userProfile_${userId}`;
      const localProfile = localStorage.getItem(profileKey);

      if (localProfile) {
        console.log(
          "✅ Perfil cargado desde localStorage para usuario:",
          userId,
        );
        const parsedProfile = JSON.parse(localProfile);
        setCompanyInfo(parsedProfile);
        return;
      } else {
        console.log("📦 No hay perfil guardado para usuario:", userId);
      }

      // Si no hay datos en localStorage o no estamos en dev, intentamos la API
      const response = await fetch("/api/user-profile", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCompanyInfo(data);
    } catch (error) {
      console.error("Error loading profile:", error);

      // Si estamos en modo desarrollo y falla la carga, usar un perfil vacío
      // y guardarlo en localStorage para futuros usos
      if (
        window.location.hostname.includes(".replit.dev") ||
        window.location.hostname.includes(".id.repl.co") ||
        window.location.hostname === "localhost" ||
        window.location.hostname.includes("replit.app")
      ) {
        toast({
          title: "Información",
          description: "Usando perfil en modo desarrollo.",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar el perfil.",
          variant: "destructive",
        });
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setCompanyInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setCompanyInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    // Aseguramos que nunca se guarde un valor undefined
    const safeValue = value || "";

    setCompanyInfo((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: safeValue,
      },
    }));
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() === "") return;

    if (!companyInfo.specialties.includes(newSpecialty)) {
      setCompanyInfo((prev) => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty],
      }));
    }

    setNewSpecialty("");
  };

  const removeSpecialty = (specialty: string) => {
    setCompanyInfo((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== specialty),
    }));
  };

  // Función para convertir archivos a Base64 (especialmente logos)
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo debe ser menor a 2MB",
        variant: "destructive",
      });
      return;
    }

    if (type === "logo") {
      // Convertir logo a Base64 para almacenamiento en base de datos
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Result = e.target?.result as string;

        const updatedInfo = {
          ...companyInfo,
          logo: base64Result,
        };

        setCompanyInfo(updatedInfo);

        // Guardar inmediatamente en localStorage y servidor
        const userId = "dev-user-123";
        const profileKey = `userProfile_${userId}`;
        localStorage.setItem(profileKey, JSON.stringify(updatedInfo));

        // También guardar en servidor inmediatamente
        fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedInfo),
        })
          .then((response) => {
            if (response.ok) {
              console.log("✅ Logo guardado en servidor y localStorage");
            }
          })
          .catch((error) => {
            console.warn("⚠️ Error guardando en servidor:", error);
          });

        toast({
          title: "Logo guardado",
          description: `${file.name} convertido a Base64 y guardado correctamente`,
        });
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "No se pudo procesar la imagen",
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    } else {
      // Para otros documentos, usar URL temporal
      const fileUrl = URL.createObjectURL(file);
      setCompanyInfo((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [type]: fileUrl,
        },
      }));

      toast({
        title: "Archivo cargado",
        description: `${file.name} ha sido cargado correctamente.`,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log("💾 Guardando perfil de empresa...");

      // Usar ID fijo para desarrollo
      const userId = "dev-user-123";
      console.log(`👤 Guardando para usuario: ${userId}`);

      // Asegurarnos de que cualquier valor undefined se convierta en cadena vacía
      const safeCompanyInfo = Object.fromEntries(
        Object.entries(companyInfo).map(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            if (Array.isArray(value)) {
              return [key, value];
            } else {
              return [
                key,
                Object.fromEntries(
                  Object.entries(value).map(([k, v]) => [
                    k,
                    v === undefined ? "" : v,
                  ]),
                ),
              ];
            }
          }
          return [key, value === undefined ? "" : value];
        }),
      );

      // Usar clave específica por usuario para localStorage
      const profileKey = `userProfile_${userId}`;
      localStorage.setItem(profileKey, JSON.stringify(safeCompanyInfo));
      console.log(
        `✅ Perfil guardado en localStorage con clave: ${profileKey}`,
        safeCompanyInfo,
      );

      // Usar la función updateProfile del hook para consistencia
      if (updateProfile) {
        console.log("🔄 Usando updateProfile del hook...");
        await updateProfile(companyInfo);
      } else {
        console.log("🔄 Hook no disponible, guardando directamente...");
        // Fallback directo a la API
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(companyInfo),
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("✅ Respuesta del servidor:", result);
      }

      toast({
        title: "Perfil actualizado",
        description:
          "La información de la compañía ha sido guardada exitosamente.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);

      // Si estamos en modo desarrollo, mostrar un mensaje informativo
      const isDevMode =
        window.location.hostname.includes(".replit.dev") ||
        window.location.hostname.includes(".id.repl.co") ||
        window.location.hostname === "localhost" ||
        window.location.hostname.includes("replit.app");

      if (isDevMode) {
        toast({
          title: "Perfil guardado",
          description: "El perfil se ha guardado localmente (modo desarrollo).",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar la información.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    // Add your password change logic here
    console.log("Change password clicked!");
    //Example:  You would typically make an API call here to update the password.
  };

  // Check email verification status when email changes
  useEffect(() => {
    if (companyInfo.email) {
      checkEmailVerificationStatus(companyInfo.email);
    } else {
      setEmailVerificationStatus("unverified");
    }
  }, [companyInfo.email]);

  const checkEmailVerificationStatus = async (email: string) => {
    if (!email) return;

    setEmailVerificationStatus("checking");

    try {
      // Verificar si el email ha sido realmente verificado a través de SendGrid
      const verifiedEmails = JSON.parse(
        localStorage.getItem("verifiedEmails") || "[]",
      );
      const isVerified = verifiedEmails.includes(email);

      if (isVerified) {
        setEmailVerificationStatus("verified");
        setEmailVerified(true);
        setLastVerifiedEmail(email);
        return;
      }

      // Si no está en la lista de verificados, comprobar con el servidor
      const response = await fetch("/api/contractor-email/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      // Solo marcar como verificado si realmente fue confirmado por SendGrid
      if (result.verified && result.confirmedByProvider) {
        setEmailVerificationStatus("verified");
        setEmailVerified(true);
        setLastVerifiedEmail(email);

        // Guardar en lista de emails verificados
        const updatedVerifiedEmails = [...verifiedEmails, email];
        localStorage.setItem(
          "verifiedEmails",
          JSON.stringify(updatedVerifiedEmails),
        );
      } else if (result.pending) {
        setEmailVerificationStatus("pending");
        setEmailVerified(false);
      } else {
        setEmailVerificationStatus("unverified");
        setEmailVerified(false);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setEmailVerificationStatus("unverified");
      setEmailVerified(false);
    }
  };

  const handleEmailVerification = async () => {
    if (!companyInfo.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/contractor-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: companyInfo.email,
          name: companyInfo.company || companyInfo.ownerName || "Contractor",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailVerificationStatus("pending");
        toast({
          title: "Verification Email Sent",
          description:
            "Please check your email and click the verification link from SendGrid.",
          duration: 8000,
        });
      } else {
        toast({
          title: "Verification Failed",
          description:
            result.message ||
            "Unable to send verification email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending verification:", error);
      toast({
        title: "Connection Error",
        description:
          "Unable to send verification email. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Cyberpunk Header */}
      <div className="border-b border-cyan-900/30 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 relative">
                <svg viewBox="0 0 64 64" className="w-full h-full">
                  <defs>
                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00ffff" />
                      <stop offset="100%" stopColor="#0080ff" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="32,8 48,16 48,32 32,40 16,32 16,16"
                    fill="none"
                    stroke="url(#logoGrad)"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <circle cx="32" cy="24" r="8" fill="url(#logoGrad)" opacity="0.6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-wider">
                  OWL FENCE
                </h1>
                <p className="text-cyan-400 text-sm tracking-widest">
                  The AI Force Crafting the Future Skyline
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* User Profile Banner */}
        <div className="border border-cyan-900/30 rounded-lg bg-gray-900/50 backdrop-blur-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="flex-shrink-0 relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const imageUrl = URL.createObjectURL(file);
                    setCompanyInfo((prev) => ({
                      ...prev,
                      profilePhoto: imageUrl,
                    }));
                  }
                }}
                className="hidden"
                id="profile-photo-input"
              />
              <label
                htmlFor="profile-photo-input"
                className="cursor-pointer group relative block w-24 h-24 rounded-full border-2 border-cyan-400/30 hover:border-cyan-400 transition-colors"
              >
                {companyInfo.profilePhoto ? (
                  <img
                    src={companyInfo.profilePhoto}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 text-cyan-400 flex items-center justify-center rounded-full">
                    <span className="text-3xl font-medium font-['Quantico']">
                      {companyInfo.ownerName ? companyInfo.ownerName.charAt(0) : "JC"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 group-hover:flex items-center justify-center hidden text-cyan-400 rounded-full">
                  <Upload className="w-6 h-6" />
                </div>
              </label>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-white font-['Quantico']">
                    {companyInfo.ownerName || "Gelasio Sanchez"}
                  </h1>
                  <p className="text-gray-400 mt-1">
                    {companyInfo.company || "Contractor"}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <div className="bg-gradient-to-r from-emerald-500 to-lime-600 text-black px-4 py-2 rounded-full font-medium text-sm inline-flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    El Mero Patrón
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header with Save Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white font-['Quantico']">Company Profile</h2>
            <p className="text-gray-400 mt-1">
              Manage your fencing company information
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        <Tabs defaultValue="info" className="space-y-8">
          <div className="border border-gray-700 rounded-lg bg-gray-900/50 p-1">
            <TabsList className="w-full bg-transparent grid grid-cols-3 gap-1">
              <TabsTrigger 
                value="info" 
                className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black bg-gray-800 text-white hover:bg-gray-700 border-0 rounded-md transition-all duration-300"
              >
                General Information
              </TabsTrigger>
              <TabsTrigger 
                value="legal" 
                className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black bg-gray-800 text-white hover:bg-gray-700 border-0 rounded-md transition-all duration-300"
              >
                Documentation
              </TabsTrigger>
              <TabsTrigger 
                value="specialties"
                className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black bg-gray-800 text-white hover:bg-gray-700 border-0 rounded-md transition-all duration-300"
              >
                Specialties
              </TabsTrigger>
            </TabsList>
          </div>

          {/* GENERAL INFORMATION TAB */}
          <TabsContent value="info" className="space-y-6">
            <Card className="border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-cyan-400">General Information and Contact</CardTitle>
                <CardDescription className="text-gray-400">
                  Main details about your company for estimates and contracts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company basic information */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-cyan-400">Company Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-gray-300">Company Name</Label>
                      <Input
                        id="company"
                        name="company"
                        value={companyInfo.company}
                        onChange={handleChange}
                        placeholder="Your Company Inc."
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType" className="text-gray-300">Business Type</Label>
                      <Select
                        value={companyInfo.businessType}
                        onValueChange={(value) =>
                          handleSelectChange("businessType", value)
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-cyan-400 focus:ring-cyan-400">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="LLC" className="text-white hover:bg-gray-700">LLC</SelectItem>
                          <SelectItem value="Sole Proprietorship" className="text-white hover:bg-gray-700">
                            Sole Proprietorship
                          </SelectItem>
                          <SelectItem value="Corporation" className="text-white hover:bg-gray-700">
                            Corporation
                          </SelectItem>
                          <SelectItem value="Partnership" className="text-white hover:bg-gray-700">
                            Partnership
                          </SelectItem>
                          <SelectItem value="S-Corporation" className="text-white hover:bg-gray-700">
                            S-Corporation
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerName" className="text-gray-300">Owner Name</Label>
                      <Input
                        id="ownerName"
                        name="ownerName"
                        value={companyInfo.ownerName}
                        onChange={handleChange}
                        placeholder="John Smith"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-gray-300">Role in Company</Label>
                      <Input
                        id="role"
                        name="role"
                        value={companyInfo.role}
                        onChange={handleChange}
                        placeholder="Owner, Manager, etc."
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearEstablished" className="text-gray-300">Year Established</Label>
                      <Input
                        id="yearEstablished"
                        name="yearEstablished"
                        value={companyInfo.yearEstablished}
                        onChange={handleChange}
                        placeholder="2010"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-gray-300">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        value={companyInfo.website}
                        onChange={handleChange}
                        placeholder="https://www.yourcompany.com"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="description" className="text-gray-300">Company Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={companyInfo.description}
                      onChange={handleChange}
                      placeholder="Describe your company and main services..."
                      rows={4}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                {/* Logo Section */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-medium mb-4 text-cyan-400">Company Logo</h3>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-40 h-40 border border-gray-600 rounded-lg flex items-center justify-center bg-gray-800">
                      {companyInfo.logo ? (
                        <img
                          src={companyInfo.logo}
                          alt="Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <Globe className="w-12 h-12 mb-2" />
                          <span>No logo</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">
                        Your logo will appear on your estimates, contracts, and
                        client communications.
                      </p>
                      <div>
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "logo")}
                        />
                        <Button
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Logo
                        </Button>
                        <p className="text-xs text-gray-400 mt-2">
                          Allowed formats: PNG, JPG. Maximum size: 2MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-medium mb-4 text-cyan-400">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={companyInfo.email}
                        onChange={handleChange}
                        placeholder="contact@yourcompany.com"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                      {/* Email Verification Status */}
                      {companyInfo.email && (
                        <div className="mt-2 p-3 rounded-lg border border-gray-600 bg-gray-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {emailVerificationStatus === "checking" && (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                                  <span className="text-sm text-gray-400">
                                    Checking verification status...
                                  </span>
                                </>
                              )}
                              {emailVerificationStatus === "verified" && (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-400 font-medium">
                                    Email verified
                                  </span>
                                </>
                              )}
                              {emailVerificationStatus === "pending" && (
                                <>
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm text-yellow-400 font-medium">
                                    Verification pending
                                  </span>
                                </>
                              )}
                              {emailVerificationStatus === "unverified" && (
                                <>
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm text-red-400 font-medium">
                                    Email not verified
                                  </span>
                                </>
                              )}
                            </div>

                            {emailVerificationStatus !== "verified" &&
                              emailVerificationStatus !== "checking" && (
                                <Button
                                  onClick={handleEmailVerification}
                                  disabled={isVerifying || !companyInfo.email}
                                  size="sm"
                                  variant="outline"
                                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                                >
                                  {isVerifying ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="h-3 w-3 mr-1" />
                                      Verify Email
                                    </>
                                  )}
                                </Button>
                              )}
                          </div>

                          <div className="mt-2 text-xs text-gray-400">
                            {emailVerificationStatus === "verified" &&
                              "You can now send professional emails to clients using this address."}
                            {emailVerificationStatus === "pending" &&
                              "Check your email for a verification link from SendGrid. Click it to complete verification."}
                            {emailVerificationStatus === "unverified" &&
                              "Verify your email to send professional estimates and contracts to clients."}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">Office Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={companyInfo.phone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobilePhone" className="text-gray-300">Mobile Phone</Label>
                      <Input
                        id="mobilePhone"
                        name="mobilePhone"
                        type="tel"
                        value={companyInfo.mobilePhone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="col-span-2">
                      <AddressAutocomplete
                        label="Address"
                        value={companyInfo.address}
                        onChange={(address, details) => {
                          setCompanyInfo((prev) => ({
                            ...prev,
                            address: address,
                            city: details?.city || prev.city,
                            state: details?.state || prev.state,
                            zipCode: details?.zipCode || prev.zipCode,
                          }));
                        }}
                        placeholder="Enter your company address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-300">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={companyInfo.city}
                        onChange={handleChange}
                        placeholder="Portland"
                        readOnly
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-300">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={companyInfo.state}
                        onChange={handleChange}
                        placeholder="Oregon"
                        readOnly
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode" className="text-gray-300">Zip Code</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={companyInfo.zipCode}
                        onChange={handleChange}
                        placeholder="97204"
                        readOnly
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-medium mb-4 text-cyan-400">Social Media</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-3">
                        <Facebook className="w-5 h-5 text-blue-400" />
                        <Input
                          name="facebook"
                          value={companyInfo.socialMedia.facebook || ""}
                          onChange={(e) =>
                            handleSocialMediaChange("facebook", e.target.value)
                          }
                          placeholder="https://facebook.com/yourcompany"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Instagram className="w-5 h-5 text-pink-400" />
                        <Input
                          name="instagram"
                          value={companyInfo.socialMedia.instagram || ""}
                          onChange={(e) =>
                            handleSocialMediaChange("instagram", e.target.value)
                          }
                          placeholder="https://instagram.com/yourcompany"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Linkedin className="w-5 h-5 text-blue-400" />
                        <Input
                          name="linkedin"
                          value={companyInfo.socialMedia.linkedin || ""}
                          onChange={(e) =>
                            handleSocialMediaChange("linkedin", e.target.value)
                          }
                          placeholder="https://linkedin.com/company/yourcompany"
                          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTATION TAB */}
          <TabsContent value="legal" className="space-y-6">
            <Card className="border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-cyan-400">Legal Documentation</CardTitle>
                <CardDescription className="text-gray-400">
                  Legal information and important company documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license" className="text-gray-300">License Number</Label>
                    <Input
                      id="license"
                      name="license"
                      value={companyInfo.license}
                      onChange={handleChange}
                      placeholder="CCB #123456"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ein" className="text-gray-300">EIN (Tax ID)</Label>
                    <Input
                      id="ein"
                      name="ein"
                      value={companyInfo.ein}
                      onChange={handleChange}
                      placeholder="12-3456789"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurancePolicy" className="text-gray-300">Insurance Policy</Label>
                    <Input
                      id="insurancePolicy"
                      name="insurancePolicy"
                      value={companyInfo.insurancePolicy}
                      onChange={handleChange}
                      placeholder="INS-9876543"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-4 text-cyan-400">
                    Company Documents
                  </h3>
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
                    <AccordionItem value="licenses" className="border-gray-700">
                      <AccordionTrigger className="text-cyan-400 hover:text-cyan-300">Licenses and Permits</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4">
                          <div className="border border-gray-600 bg-gray-800/50 rounded-md p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <FileText className="text-cyan-400" />
                              <div>
                                <p className="font-medium text-white">
                                  Contractor License
                                </p>
                                <p className="text-sm text-gray-400">
                                  {companyInfo.documents?.licenseDocument
                                    ? "Document uploaded"
                                    : "No document"}
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
                              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </Button>
                          </div>

                          <div className="border rounded-md p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <FileText className="text-blue-500" />
                              <div>
                                <p className="font-medium">
                                  Insurance Certificate
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {companyInfo.documents?.insuranceDocument
                                    ? "Document uploaded"
                                    : "No document"}
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
                      <AccordionTrigger>
                        Contracts and Agreements
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4">
                          <div className="border rounded-md p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <FileText className="text-green-500" />
                              <div>
                                <p className="font-medium">
                                  Standard Terms and Conditions
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {companyInfo.documents?.termsDocument
                                    ? "Document uploaded"
                                    : "No document"}
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
                                <p className="font-medium">
                                  Warranty Information
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {companyInfo.documents?.warrantyDocument
                                    ? "Document uploaded"
                                    : "No document"}
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
                                  {companyInfo.documents?.catalogDocument
                                    ? "Document uploaded"
                                    : "No document"}
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
                                  {companyInfo.documents?.brochureDocument
                                    ? "Document uploaded"
                                    : "No document"}
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
          <TabsContent value="specialties" className="space-y-6">
            <Card className="border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-cyan-400">Specialties and Services</CardTitle>
                <CardDescription className="text-gray-400">
                  Indicate the types of fences and services you offer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {companyInfo.specialties.map((specialty, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 text-sm bg-gray-800 border-gray-600 text-cyan-400 hover:bg-gray-700"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {companyInfo.specialties.length === 0 && (
                    <p className="text-gray-400 text-sm">
                      No specialties added.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Ex: Wood Fences, Gate Installation, etc."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpecialty();
                      }
                    }}
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                  <Button
                    type="button"
                    onClick={addSpecialty}
                    variant="outline"
                    size="icon"
                    className="bg-gray-800 border-gray-600 text-cyan-400 hover:bg-gray-700 hover:border-cyan-400 hover:text-cyan-300"
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
                      <CardTitle className="text-base">
                        Beneficios de Suscripción
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <span className="text-primary mr-2">✓</span>
                          <span>
                            Acceso a Mervin AI para ayudarte con tus proyectos
                          </span>
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

            {/* Personal Information Section */}
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Información personal y credenciales del usuario.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Correo Electrónico</Label>
                    <Input
                      id="userEmail"
                      name="userEmail"
                      type="email"
                      placeholder="usuario@gmail.com"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPhone">Teléfono</Label>
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
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full md:w-auto"
                      >
                        {loading ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                      <Button
                        onClick={() => handleChangePassword()}
                        variant="outline"
                        className="w-full md:w-auto"
                      >
                        Actualizar Contraseña
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Cyberpunk Footer */}
        <div className="mt-12 border-t border-cyan-900/30 bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8">
                  <svg viewBox="0 0 32 32" className="w-full h-full">
                    <defs>
                      <linearGradient id="footerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00ffff" />
                        <stop offset="100%" stopColor="#0080ff" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="16,4 24,8 24,16 16,20 8,16 8,8"
                      fill="none"
                      stroke="url(#footerGrad)"
                      strokeWidth="1"
                      className="animate-pulse"
                    />
                    <circle cx="16" cy="12" r="4" fill="url(#footerGrad)" opacity="0.6" />
                  </svg>
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-cyan-400 font-medium">OWL FENCE</span> © {new Date().getFullYear()} — Professional Contractor Management
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>AI-Powered Legal Defense System</span>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span>Secure Firebase Integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
