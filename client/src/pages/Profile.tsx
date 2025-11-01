import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/contexts/PermissionContext";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
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
  Moon,
  Sun,
  Bell,
  Shield,
  User as UserIcon,
  ShieldAlert,
  Info,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PhoneAuth from "@/components/auth/PhoneAuth";
import { multiFactor } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type SocialMediaLinks = Record<string, string>;

// Usamos el mismo tipo UserProfile del hook para evitar incompatibilidades
import { UserProfile } from "@/hooks/use-profile";

// Alias de CompanyInfoType a UserProfile para mantener compatibilidad con el código existente
type CompanyInfoType = UserProfile;

export default function Profile() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan, loading: permissionsLoading } = usePermissions();
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

  // ===== USER SETTINGS STATES =====
  // Types for settings
  interface UserSettings {
    language?: 'en' | 'es' | 'fr';
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    darkMode?: boolean;
  }

  // Local state for user settings
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'en' | 'es' | 'fr'>('en');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Email change state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Password change state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Batched updates
  const pendingUpdatesRef = useRef<Partial<UserSettings>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load settings from backend
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      const res = await apiRequest('GET', '/api/settings');
      return await res.json();
    },
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 5,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!currentUser) throw new Error('Authentication required');
      // Session cookie se envía automáticamente con credentials: 'include'
      return await apiRequest('PATCH', '/api/settings', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  });

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
      const userId = currentUser?.uid;
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
        const userId = currentUser?.uid;
        const profileKey = `userProfile_${userId}`;
        localStorage.setItem(profileKey, JSON.stringify(updatedInfo));

        // También guardar en servidor inmediatamente con autenticación
        (async () => {
          try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch("/api/profile", {
              method: "POST",
              credentials: "include",
              headers: { 
                "Content-Type": "application/json",
                ...authHeaders
              },
              body: JSON.stringify(updatedInfo),
            });
            return response;
          } catch (error) {
            console.warn("⚠️ Error con autenticación:", error);
            return fetch("/api/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedInfo),
            });
          }
        })()
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
      const userId = currentUser?.uid;
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
        // Fallback directo a la API con autenticación
        const authHeaders = await getAuthHeaders();
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders
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

  // ===== USER SETTINGS HANDLERS =====
  
  // Batched update function to reduce Firestore writes
  const scheduleBatchedUpdate = (newUpdates: Partial<UserSettings>) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save your settings",
        variant: "destructive"
      });
      return;
    }

    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      ...newUpdates
    };

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const updatesToSend = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      
      if (Object.keys(updatesToSend).length > 0) {
        updateSettingsMutation.mutate(updatesToSend);
      }
    }, 1500);
  };

  const handleLanguageChange = (value: 'en' | 'es' | 'fr') => {
    setLanguage(value);
    scheduleBatchedUpdate({ language: value });
    toast({
      title: "Language Updated",
      description: `Language changed to ${value === "en" ? "English" : value === "es" ? "Español" : "Français"}`,
    });
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    localStorage.setItem('darkMode', checked.toString());
    scheduleBatchedUpdate({ darkMode: checked });
    toast({
      title: checked ? "Dark Mode Enabled" : "Light Mode Enabled",
      description: "Theme preference will be saved",
    });
  };

  const handleEmailNotificationsToggle = (checked: boolean) => {
    setEmailNotifications(checked);
    scheduleBatchedUpdate({ emailNotifications: checked });
    toast({
      title: checked ? "Email Notifications Enabled" : "Email Notifications Disabled",
      description: "Notification preference will be saved",
    });
  };

  const handleSmsNotificationsToggle = (checked: boolean) => {
    setSmsNotifications(checked);
    scheduleBatchedUpdate({ smsNotifications: checked });
    toast({
      title: checked ? "SMS Notifications Enabled" : "SMS Notifications Disabled", 
      description: "Notification preference will be saved",
    });
  };

  const handleOpenPasswordDialog = () => {
    setIsPasswordDialogOpen(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async () => {
    // Validate fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to change your password",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      // Session cookie se envía automáticamente
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        credentials: 'include', // Enviar cookie de sesión automáticamente
        body: JSON.stringify({ 
          newPassword,
          currentPassword // Optional for backend logging
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      toast({
        title: "Password Updated",
        description: data.message || "Your password has been changed successfully. Please sign in again.",
      });

      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Optional: Sign out user to force re-authentication
      // await auth.signOut();
      
    } catch (error: any) {
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.message?.includes('WEAK_PASSWORD')) {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.message?.includes('AUTH_REQUIRED') || error.message?.includes('401')) {
        errorMessage = "Authentication required. Please sign in again.";
      }
      
      toast({
        title: "Password Change Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    // Validation
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email format",
        variant: "destructive",
      });
      return;
    }

    if (newEmail === currentUser?.email) {
      toast({
        title: "Error",
        description: "The new email is the same as your current email",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to change your email",
        variant: "destructive",
      });
      return;
    }

    setIsChangingEmail(true);
    
    try {
      // Session cookie se envía automáticamente
      const response = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUser.uid
        },
        credentials: 'include', // Enviar cookie de sesión automáticamente
        body: JSON.stringify({ newEmail: newEmail.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      toast({
        title: "Email Updated Successfully",
        description: data.message || `Your email has been changed to ${newEmail}. Please sign in again with your new email.`,
      });

      setIsEmailDialogOpen(false);
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // Optional: Sign out user to force re-authentication with new email
      // await auth.signOut();
      
    } catch (error: any) {
      let errorMessage = "Failed to change email. Please try again.";
      
      if (error.message?.includes('EMAIL_IN_USE') || error.message?.includes('already in use')) {
        errorMessage = "This email is already in use by another account.";
      } else if (error.message?.includes('INVALID_EMAIL')) {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message?.includes('AUTH_REQUIRED') || error.message?.includes('401')) {
        errorMessage = "Authentication required. Please sign in again.";
      }
      
      toast({
        title: "Email Change Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  // 2FA Handlers
  const handleStartEnrollment = () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to enable two-factor authentication."
      });
      return;
    }
    setEnrolling(true);
  };

  const handleCancelEnrollment = () => {
    setEnrolling(false);
  };

  const handleEnrollmentSuccess = () => {
    setEnrolling(false);
    setMfaEnabled(true);
    toast({
      title: "Configuration Successful",
      description: "Two-factor authentication has been enabled successfully."
    });
  };

  const handleDisableMfa = async () => {
    if (!currentUser || !auth.currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to perform this action."
      });
      return;
    }
    
    try {
      const multiFactorUser = multiFactor(auth.currentUser);
      
      if (multiFactorUser.enrolledFactors.length === 0) {
        setMfaEnabled(false);
        return;
      }
      
      const factorId = multiFactorUser.enrolledFactors[0].uid;
      
      await multiFactorUser.unenroll(factorId);
      setMfaEnabled(false);
      
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled successfully."
      });
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      setMfaError(error.message || "An error occurred while disabling two-factor authentication.");
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not disable two-factor authentication."
      });
    }
  };

  // Apply dark mode theme whenever isDarkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Sync state with loaded settings
  useEffect(() => {
    if (settings) {
      setLanguage(settings.language || 'en');
      setEmailNotifications(settings.emailNotifications ?? true);
      setSmsNotifications(settings.smsNotifications ?? false);
      setIsDarkMode(settings.darkMode ?? false);
    }
    
    // Load dark mode from localStorage for immediate application
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode && !settings?.darkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, [settings]);

  // Check MFA status
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        if (currentUser && auth.currentUser) {
          const multiFactorUser = multiFactor(auth.currentUser);
          const enrolledFactors = multiFactorUser.enrolledFactors;
          setMfaEnabled(enrolledFactors.length > 0);
        }
      } catch (error) {
        console.error("Error checking MFA status:", error);
      }
    };
    
    checkMfaStatus();
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      if (Object.keys(pendingUpdatesRef.current).length > 0 && currentUser) {
        updateSettingsMutation.mutateAsync(pendingUpdatesRef.current).catch((error) => {
          console.warn('Failed to save settings on unmount:', error);
          localStorage.setItem('pendingSettingsUpdates', JSON.stringify(pendingUpdatesRef.current));
        });
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
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
                      {companyInfo.ownerName 
                        ? companyInfo.ownerName.charAt(0) 
                        : currentUser?.displayName?.charAt(0) 
                        || currentUser?.email?.charAt(0).toUpperCase() 
                        || "U"}
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
                    {companyInfo.ownerName || currentUser?.displayName || currentUser?.email?.split('@')[0] || "Usuario"}
                  </h1>
                  <p className="text-gray-400 mt-1">
                    {companyInfo.company || "Contractor"}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <div className="bg-gradient-to-r from-emerald-500 to-lime-600 text-black px-4 py-2 rounded-full font-medium text-sm inline-flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {permissionsLoading ? "Cargando..." : userPlan?.name || "Plan Básico"}
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
            <TabsList className="w-full bg-transparent grid grid-cols-4 gap-1">
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
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-cyan-400 data-[state=active]:text-black bg-gray-800 text-white hover:bg-gray-700 border-0 rounded-md transition-all duration-300"
              >
                User Settings
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
                      {companyInfo.email && (
                        <p className="text-xs text-gray-400 mt-2">
                          Este email se usará para respuestas de clientes. Los estimados se envían desde la plataforma Owl Fence.
                        </p>
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
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address" className="text-gray-300">Address</Label>
                      <AddressAutocomplete
                        value={companyInfo.address}
                        onChange={(address: string, details?: any) => {
                          setCompanyInfo((prev) => ({
                            ...prev,
                            address: address,
                            city: details?.city || prev.city,
                            state: details?.state || prev.state,
                            zipCode: details?.zipCode || prev.zipCode,
                          }));
                        }}
                        placeholder="Enter your company address"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
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

          {/* USER SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-gray-700 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  User Settings
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your personal preferences and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Language</Label>
                  <Select 
                    value={language} 
                    onValueChange={handleLanguageChange}
                    disabled={updateSettingsMutation.isPending}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-gray-700" />

                {/* Dark Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300 flex items-center gap-2">
                      {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      Dark Mode
                    </Label>
                    <p className="text-sm text-gray-400">
                      Toggle dark mode for the entire application
                    </p>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleDarkModeToggle}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>

                <Separator className="bg-gray-700" />

                {/* Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-cyan-400 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-gray-300">Email Notifications</Label>
                      <p className="text-sm text-gray-400">
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={handleEmailNotificationsToggle}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-gray-300">SMS Notifications</Label>
                      <p className="text-sm text-gray-400">
                        Receive updates via text message
                      </p>
                    </div>
                    <Switch
                      checked={smsNotifications}
                      onCheckedChange={handleSmsNotificationsToggle}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Change Email */}
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentUser?.email || ""}
                      disabled
                      className="bg-gray-800 border-gray-600 text-gray-400"
                    />
                    <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="bg-gray-800 border-gray-600 text-cyan-400 hover:bg-gray-700"
                        >
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-700 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-cyan-400">Change Email Address</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Enter your new email address. You'll need to verify it before the change takes effect.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-email" className="text-gray-300">New Email</Label>
                            <Input
                              id="new-email"
                              type="email"
                              placeholder="new.email@example.com"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsEmailDialogOpen(false)}
                              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleEmailChange}
                              disabled={isChangingEmail}
                              className="bg-cyan-400 hover:bg-cyan-300 text-black"
                            >
                              {isChangingEmail ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Changing...
                                </>
                              ) : (
                                "Change Email"
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Change Password */}
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Password
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      value="••••••••"
                      disabled
                      className="bg-gray-800 border-gray-600 text-gray-400"
                    />
                    <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="bg-gray-800 border-gray-600 text-cyan-400 hover:bg-gray-700"
                          onClick={handleOpenPasswordDialog}
                        >
                          Change Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-700 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-cyan-400">Change Password</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Enter your current password and choose a new one. Password must be at least 6 characters.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="current-password" className="text-gray-300">Current Password</Label>
                            <Input
                              id="current-password"
                              type="password"
                              placeholder="Enter current password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-gray-300">New Password</Label>
                            <Input
                              id="new-password"
                              type="password"
                              placeholder="Enter new password (min 6 characters)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password" className="text-gray-300">Confirm New Password</Label>
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="Confirm new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsPasswordDialogOpen(false)}
                              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleChangePassword}
                              disabled={isChangingPassword}
                              className="bg-cyan-400 hover:bg-cyan-300 text-black"
                            >
                              {isChangingPassword ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Changing...
                                </>
                              ) : (
                                "Change Password"
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* 2FA Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-lg font-medium text-cyan-400 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5" />
                        Two-Factor Authentication (2FA)
                      </Label>
                      <p className="text-sm text-gray-400">
                        Add an extra layer of security using SMS verification
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mfaEnabled && (
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                          Active
                        </span>
                      )}
                      <Switch 
                        checked={mfaEnabled} 
                        onCheckedChange={(checked) => {
                          if (!checked && mfaEnabled) {
                            if (confirm("Are you sure you want to disable two-factor authentication? This may reduce your account security.")) {
                              handleDisableMfa();
                            }
                          } else if (checked && !mfaEnabled) {
                            handleStartEnrollment();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {enrolling && (
                    <Card className="border-cyan-400/30 bg-cyan-400/5">
                      <CardHeader>
                        <CardTitle className="text-base text-cyan-400">Set Up Two-Factor Authentication</CardTitle>
                        <CardDescription className="text-gray-400">
                          Add your phone number to receive verification codes via SMS
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PhoneAuth />
                        
                        <div className="mt-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleCancelEnrollment}
                            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!enrolling && !mfaEnabled && (
                    <Alert className="border-gray-700 bg-gray-800/50">
                      <Info className="h-4 w-4 text-cyan-400" />
                      <AlertTitle className="text-cyan-400">Security Recommendation</AlertTitle>
                      <AlertDescription className="text-gray-400">
                        Enable two-factor authentication to increase your account security.
                      </AlertDescription>
                    </Alert>
                  )}

                  {mfaError && (
                    <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{mfaError}</AlertDescription>
                    </Alert>
                  )}
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
      </div>
    </div>
  );
}
