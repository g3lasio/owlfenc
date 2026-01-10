import { useState, useEffect, useRef, useCallback } from "react";
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
  Bell,
  Shield,
  User as UserIcon,
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
// import PhoneAuthMFA from "@/components/auth/PhoneAuthMFA"; // REMOVED: 2FA functionality temporarily disabled
import { ImageCropper } from "@/components/ui/image-cropper";
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { auth, uploadFile } from "@/lib/firebase";
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
      profilePhoto: "",
    },
  );

  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [activeDocumentSection, setActiveDocumentSection] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Image cropper states
  const [showLogoCropper, setShowLogoCropper] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [showProfilePhotoCropper, setShowProfilePhotoCropper] = useState(false);
  const [selectedProfilePhotoFile, setSelectedProfilePhotoFile] = useState<File | null>(null);

  // ===== USER SETTINGS STATES =====
  // Types for settings
  interface UserSettings {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  }

  // Local state for user settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // 2FA state - REMOVED: 2FA functionality temporarily disabled
  // const [mfaEnabled, setMfaEnabled] = useState(false);
  // const [enrolling, setEnrolling] = useState(false);
  // const [mfaError, setMfaError] = useState<string | null>(null);

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

  // 🔥 AUTOSAVE: Estados para autoguardado del perfil
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedDataRef = useRef<string>('');

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

  // Sync profile data from React Query to local state
  // This should only update local state when profile data changes from external sources
  useEffect(() => {
    if (profile) {
      console.log("🔄 [PROFILE-SYNC-V2] Syncing from React Query cache");
      console.log("   📸 profilePhoto:", profile.profilePhoto ? "exists" : "empty");
      console.log("   🖼️ logo:", profile.logo ? "exists" : "empty");
      
      // Simply use the profile from React Query as the source of truth
      setCompanyInfo(profile);
    }
  }, [profile]);

  // Si no hay perfil en el hook useProfile, intentamos cargar directamente
  useEffect(() => {
    if (!profile && !isLoadingProfile) {
      loadCompanyProfile();
    }
  }, [profile, isLoadingProfile]);

  // 🔥 AUTOSAVE: Función para guardar automáticamente con debounce
  const performAutoSave = useCallback(async (dataToSave: CompanyInfoType) => {
    if (!currentUser?.uid || !updateProfile) return;
    
    // Serializar para comparar si hay cambios reales
    const serialized = JSON.stringify(dataToSave);
    if (serialized === lastSavedDataRef.current) {
      console.log('💾 [AUTOSAVE] No hay cambios, omitiendo guardado');
      return;
    }
    
    setAutoSaveStatus('saving');
    
    try {
      console.log('💾 [AUTOSAVE] Guardando cambios automáticamente...');
      console.log('📊 [AUTOSAVE] Datos a guardar:', {
        license: dataToSave.license || 'NOT SET',
        state: dataToSave.state || 'NOT SET',
        company: dataToSave.company || 'NOT SET'
      });
      
      await updateProfile(dataToSave);
      
      lastSavedDataRef.current = serialized;
      setAutoSaveStatus('saved');
      console.log('✅ [AUTOSAVE] Guardado exitoso');
      
      // Volver a idle después de 2 segundos
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ [AUTOSAVE] Error:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [currentUser?.uid, updateProfile]);

  // 🔥 AUTOSAVE: Efecto para detectar cambios y disparar autoguardado
  useEffect(() => {
    // No autoguardar si estamos cargando o no hay usuario
    if (isLoadingProfile || !currentUser?.uid) return;
    
    // No autoguardar si el perfil aún no se ha cargado inicialmente
    if (!profile) return;
    
    // Cancelar timer anterior
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Esperar 1.5 segundos después del último cambio para guardar
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave(companyInfo);
    }, 1500);
    
    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [companyInfo, isLoadingProfile, currentUser?.uid, profile, performAutoSave]);

  // 🔥 SINGLE SOURCE OF TRUTH: El perfil se carga desde useProfile hook (Firebase)
  // Esta función es solo un fallback si el hook no tiene datos
  const loadCompanyProfile = async () => {
    console.log("🔄 [LOAD] Perfil se carga automáticamente desde Firebase via useProfile hook");
    // El perfil se sincroniza automáticamente desde el useEffect que observa `profile`
    // No necesitamos cargar manualmente ya que useProfile es la fuente de verdad
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

    // Logo accepts up to 10MB and uses the cropper
    if (type === "logo") {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo debe ser menor a 10MB",
          variant: "destructive",
        });
        return;
      }
      
      // Open the cropper dialog instead of processing directly
      setSelectedLogoFile(file);
      setShowLogoCropper(true);
      
      // Clear the input so the same file can be selected again
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      return;
    }

    // Other file types still have 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo debe ser menor a 2MB",
        variant: "destructive",
      });
      return;
    }

    // Para otros documentos, subir a Firebase Storage
    handleDocumentUpload(file, type);
  };

  // Handler for when cropped logo is ready
  const handleCroppedLogo = async (croppedImageBase64: string) => {
    try {
      console.log("🖼️ [LOGO-CROPPED] Processing cropped image...");
      console.log(`🖼️ [LOGO-CROPPED] Size: ${Math.round(croppedImageBase64.length / 1024)}KB`);

      // STEP 1: Optimistic update - immediately update React Query cache
      const queryKey = ["userProfile", currentUser?.uid];
      const previousProfile = queryClient.getQueryData<CompanyInfoType>(queryKey);
      
      const updatedProfile = {
        ...companyInfo,
        ...previousProfile,
        logo: croppedImageBase64,
      };
      
      // Set cache immediately (optimistic)
      queryClient.setQueryData(queryKey, updatedProfile);
      console.log("⚡ [LOGO-CROPPED] React Query cache updated optimistically");
      
      // Also update local state for immediate UI feedback
      setCompanyInfo(updatedProfile);

      // STEP 2: Persist to Firestore via the hook
      try {
        console.log("🔥 [LOGO-CROPPED] Saving to Firestore...");
        await updateProfile(updatedProfile);
        console.log("✅ [LOGO-CROPPED] Firestore save confirmed!");
        
        toast({
          title: "Logo guardado",
          description: "Tu logo ha sido guardado correctamente",
        });
      } catch (firestoreError) {
        console.error("❌ [LOGO-CROPPED] Firestore save failed:", firestoreError);
        
        // Rollback optimistic update on failure
        if (previousProfile) {
          queryClient.setQueryData(queryKey, previousProfile);
          setCompanyInfo(previousProfile);
        }
        
        toast({
          title: "Error",
          description: "No se pudo guardar el logo. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ [LOGO-CROPPED] Error:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el logo.",
        variant: "destructive",
      });
    } finally {
      setSelectedLogoFile(null);
    }
  };

  // 🔥 SINGLE SOURCE OF TRUTH: Guardar SOLO en Firebase
  const handleSave = async () => {
    if (!currentUser?.uid) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para guardar cambios.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log("💾 [SAVE] Guardando perfil en Firebase...");
      console.log("📊 [SAVE] Datos a guardar:", {
        license: companyInfo.license || 'NOT SET',
        state: companyInfo.state || 'NOT SET',
        company: companyInfo.company || 'NOT SET'
      });

      // 🔥 SINGLE SOURCE: Guardar SOLO en Firebase via hook
      await updateProfile(companyInfo);
      
      // Actualizar referencia de últimos datos guardados para evitar autoguardado redundante
      lastSavedDataRef.current = JSON.stringify(companyInfo);

      console.log("✅ [SAVE] Perfil guardado exitosamente en Firebase");
      
      toast({
        title: "Perfil actualizado",
        description: "La información de la compañía ha sido guardada exitosamente.",
      });
    } catch (error) {
      console.error("❌ [SAVE] Error guardando perfil:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== PROFILE PHOTO UPLOAD HANDLER =====
  // NEW APPROACH: Use React Query optimistic updates as single source of truth
  // Opens the cropper for profile photo
  const handleProfilePhotoUpload = async (file: File) => {
    if (!file) return;

    if (!currentUser?.uid) {
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para subir una foto de perfil",
        variant: "destructive",
      });
      return;
    }

    // Accept up to 10MB, cropper will compress
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "La foto de perfil debe ser menor a 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    // Open cropper instead of processing directly
    setSelectedProfilePhotoFile(file);
    setShowProfilePhotoCropper(true);
  };

  // Handler for when cropped profile photo is ready
  const handleCroppedProfilePhoto = async (croppedImageBase64: string) => {
    if (!currentUser?.uid) return;
    
    setUploadingPhoto(true);
    
    try {
      console.log("📸 [PROFILE-PHOTO-CROPPED] Processing cropped image...");
      console.log(`📸 [PROFILE-PHOTO-CROPPED] Size: ${Math.round(croppedImageBase64.length / 1024)}KB`);
      
      // STEP 1: Optimistic update - immediately update React Query cache
      const queryKey = ["userProfile", currentUser.uid];
      const previousProfile = queryClient.getQueryData<CompanyInfoType>(queryKey);
      
      const updatedProfile = {
        ...companyInfo,
        ...previousProfile,
        profilePhoto: croppedImageBase64,
      };
      
      // Set cache immediately (optimistic)
      queryClient.setQueryData(queryKey, updatedProfile);
      console.log("⚡ [PROFILE-PHOTO-CROPPED] React Query cache updated");
      
      // Also update local state for immediate UI feedback
      setCompanyInfo(updatedProfile);

      // STEP 2: Persist to Firestore via the hook
      try {
        console.log("🔥 [PROFILE-PHOTO-CROPPED] Saving to Firestore...");
        await updateProfile(updatedProfile);
        console.log("✅ [PROFILE-PHOTO-CROPPED] Firestore save confirmed!");
        
        toast({
          title: "Foto guardada",
          description: "Tu foto de perfil ha sido guardada correctamente",
        });
      } catch (firestoreError) {
        console.error("❌ [PROFILE-PHOTO-CROPPED] Firestore save failed:", firestoreError);
        
        // Rollback optimistic update on failure
        if (previousProfile) {
          queryClient.setQueryData(queryKey, previousProfile);
          setCompanyInfo(previousProfile);
        }
        
        toast({
          title: "Error",
          description: "No se pudo guardar la foto. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ [PROFILE-PHOTO-CROPPED] Error:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      setSelectedProfilePhotoFile(null);
    }
  };

  // Legacy function kept for reference - no longer used directly
  const handleProfilePhotoUploadLegacy = async (file: File) => {
    if (!file || !currentUser?.uid) return;

    setUploadingPhoto(true);
    
    try {
      console.log("📸 [PROFILE-PHOTO-LEGACY] Converting to base64...");
      
      const base64Photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error("Error reading file"));
        reader.readAsDataURL(file);
      });

      console.log("✅ [PROFILE-PHOTO-LEGACY] Base64 conversion complete");
      
      // STEP 1: Optimistic update - immediately update React Query cache
      const queryKey = ["userProfile", currentUser.uid];
      const previousProfile = queryClient.getQueryData<CompanyInfoType>(queryKey);
      
      const updatedProfile = {
        ...companyInfo,
        ...previousProfile,
        profilePhoto: base64Photo,
      };
      
      // Set cache immediately (optimistic)
      queryClient.setQueryData(queryKey, updatedProfile);
      console.log("⚡ [PROFILE-PHOTO-V2] React Query cache updated optimistically");
      
      // Also update local state for immediate UI feedback
      setCompanyInfo(updatedProfile);
      
      // STEP 2: Persist to Firestore via the hook (single source of truth)
      try {
        console.log("🔥 [PROFILE-PHOTO-V2] Saving to Firestore via updateProfile hook...");
        await updateProfile(updatedProfile);
        console.log("✅ [PROFILE-PHOTO-V2] Firestore save confirmed!");
        
        toast({
          title: "Foto actualizada",
          description: "Tu foto de perfil se ha guardado correctamente.",
        });
      } catch (firestoreError) {
        console.error("❌ [PROFILE-PHOTO-V2] Firestore save failed:", firestoreError);
        
        // Rollback optimistic update on failure
        if (previousProfile) {
          queryClient.setQueryData(queryKey, previousProfile);
          setCompanyInfo(previousProfile);
        }
        
        toast({
          title: "Error",
          description: "No se pudo guardar la foto. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ [PROFILE-PHOTO-V2] Error:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ===== DOCUMENT UPLOAD HANDLER =====
  const handleDocumentUpload = async (file: File, documentType: string) => {
    if (!file) return;

    // Validar que el usuario esté autenticado
    if (!currentUser?.uid) {
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para subir documentos",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño del archivo (máximo 5MB para base64)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El documento debe ser menor a 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingDocument(true);
    try {
      console.log(`📄 [DOCUMENT-UPLOAD] Procesando documento ${documentType}...`);
      
      // Convertir el documento a base64 para almacenarlo directamente
      const base64Document = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.onerror = () => {
          reject(new Error("Error leyendo el archivo"));
        };
        reader.readAsDataURL(file);
      });
      
      console.log(`✅ [DOCUMENT-UPLOAD] Documento ${documentType} procesado exitosamente`);
      
      // Actualizar el estado con el documento en base64
      const updatedInfo = {
        ...companyInfo,
        documents: {
          ...companyInfo.documents,
          [documentType]: base64Document,
        },
      };
      
      setCompanyInfo(updatedInfo);

      // Guardar inmediatamente en Firestore
      if (updateProfile) {
        await updateProfile(updatedInfo);
        console.log(`💾 [DOCUMENT-UPLOAD] Documento ${documentType} guardado en Firestore`);
      }

      toast({
        title: "Documento subido",
        description: `${file.name} se ha subido correctamente. No olvides hacer clic en 'Save Changes'.`,
      });
    } catch (error) {
      console.error(`❌ [DOCUMENT-UPLOAD] Error subiendo documento ${documentType}:`, error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
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

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast({
        title: "Weak Password",
        description: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser || !currentUser.email) {
      toast({
        title: "Error",
        description: "You must be logged in to change your password",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      console.log('🔐 [PASSWORD-CHANGE] Starting password change with re-authentication...');
      
      // STEP 1: Re-authenticate user with current password (MANDATORY for security)
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      
      try {
        await reauthenticateWithCredential(auth.currentUser!, credential);
        console.log('✅ [PASSWORD-CHANGE] Re-authentication successful');
      } catch (reauthError: any) {
        console.error('❌ [PASSWORD-CHANGE] Re-authentication failed:', reauthError);
        
        if (reauthError.code === 'auth/wrong-password' || reauthError.code === 'auth/invalid-credential') {
          toast({
            title: "Incorrect Password",
            description: "Your current password is incorrect. Please try again.",
            variant: "destructive",
          });
        } else if (reauthError.code === 'auth/too-many-requests') {
          toast({
            title: "Too Many Attempts",
            description: "Account temporarily locked due to too many failed attempts. Please try again later.",
            variant: "destructive",
          });
        } else if (reauthError.code === 'auth/user-mismatch') {
          toast({
            title: "Authentication Error",
            description: "Session mismatch. Please sign out and sign in again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Authentication Failed",
            description: "Could not verify your current password. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }
      
      // STEP 2: Call server to update password via Admin SDK (for audit logging and token revocation)
      // After successful client-side re-auth, the server can safely update the password
      let authHeaders: Record<string, string> = {};
      try {
        authHeaders = await getAuthHeaders();
      } catch (headerError) {
        console.warn('⚠️ [PASSWORD-CHANGE] Failed to get auth headers, refreshing token...', headerError);
        // Try to get a fresh token after successful re-auth
        if (!auth.currentUser) {
          toast({
            title: "Session Error",
            description: "No active session found. Please sign in again.",
            variant: "destructive",
          });
          return;
        }
        try {
          const freshToken = await auth.currentUser.getIdToken(true); // Force refresh
          if (freshToken) {
            authHeaders = { 'Authorization': `Bearer ${freshToken}` };
            console.log('✅ [PASSWORD-CHANGE] Fresh token obtained');
          } else {
            throw new Error('Token refresh returned empty');
          }
        } catch (tokenError) {
          console.error('❌ [PASSWORD-CHANGE] Failed to refresh token:', tokenError);
          toast({
            title: "Session Error",
            description: "Could not verify your session. Please sign out and sign in again.",
            variant: "destructive",
          });
          return;
        }
      }
      
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        credentials: 'include',
        body: JSON.stringify({ 
          newPassword,
          currentPasswordVerified: true // Flag indicating client-side re-auth was successful
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific backend error codes
        if (data.code === 'WEAK_PASSWORD') {
          throw new Error('Password is too weak. Use uppercase, lowercase, and numbers.');
        } else if (data.code === 'AUTH_REQUIRED') {
          throw new Error('Session expired. Please sign in again.');
        } else if (data.code === 'USER_NOT_FOUND') {
          throw new Error('Account not found. Please contact support.');
        }
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      console.log('✅ [PASSWORD-CHANGE] Password updated via server with audit logging');

      // CRITICAL: If tokens were revoked, force sign out to honor revocation
      if (data.tokensRevoked) {
        console.log('🔒 [PASSWORD-CHANGE] Tokens revoked, initiating secure sign out...');
        
        toast({
          title: "Password Updated Successfully",
          description: "For security, you will be signed out. Please sign in with your new password.",
        });

        setIsPasswordDialogOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Perform secure sign out sequence after brief delay for toast visibility
        const performSecureSignOut = async () => {
          try {
            // Step 1: Sign out from Firebase client FIRST (must complete before next steps)
            console.log('🔒 [PASSWORD-CHANGE] Step 1: Signing out from Firebase...');
            await signOut(auth);
            console.log('✅ [PASSWORD-CHANGE] Firebase sign out complete');
            
            // Step 2: Clear server session cookies AFTER Firebase sign out completes
            console.log('🔒 [PASSWORD-CHANGE] Step 2: Clearing server session cookies...');
            await fetch('/api/sessionLogout', {
              method: 'POST',
              credentials: 'include'
            }).catch(err => console.warn('⚠️ Session logout error:', err));
            console.log('✅ [PASSWORD-CHANGE] Session cookies cleared');
            
            // Step 3: Force navigation to login page with clean state
            console.log('🔒 [PASSWORD-CHANGE] Step 3: Redirecting to login...');
            window.location.assign('/login?passwordChanged=true');
            
          } catch (signOutError) {
            console.error('❌ [PASSWORD-CHANGE] Secure sign out error:', signOutError);
            // Force navigation anyway to ensure user is logged out
            window.location.assign('/login');
          }
        };
        
        // Execute after brief delay for toast visibility
        setTimeout(performSecureSignOut, 1500);
        
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (error: any) {
      console.error('❌ [PASSWORD-CHANGE] Error:', error);
      
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.code === 'auth/weak-password' || error.message?.includes('WEAK_PASSWORD')) {
        errorMessage = "Password is too weak. Please use a stronger password with at least 6 characters.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Your session has expired. Please sign out, sign in again, and try changing your password.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message?.includes('AUTH_REQUIRED') || error.message?.includes('401')) {
        errorMessage = "Authentication required. Please sign in again.";
      } else if (error.message) {
        errorMessage = error.message;
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

  // 2FA Handlers - REMOVED: 2FA functionality temporarily disabled
  /*
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
  */

  // Sync state with loaded settings
  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.emailNotifications ?? true);
      setSmsNotifications(settings.smsNotifications ?? false);
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
                    handleProfilePhotoUpload(file);
                  }
                }}
                className="hidden"
                id="profile-photo-input"
                disabled={uploadingPhoto}
              />
              <label
                htmlFor="profile-photo-input"
                className={`cursor-pointer group relative block w-24 h-24 rounded-full border-2 border-cyan-400/30 hover:border-cyan-400 transition-colors ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingPhoto ? (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-full">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                ) : companyInfo.profilePhoto ? (
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
              
              {/* Profile Photo Cropper Dialog */}
              <ImageCropper
                open={showProfilePhotoCropper}
                onClose={() => {
                  setShowProfilePhotoCropper(false);
                  setSelectedProfilePhotoFile(null);
                }}
                imageFile={selectedProfilePhotoFile}
                onCropComplete={handleCroppedProfilePhoto}
                outputWidth={300}
                outputHeight={300}
                maxOutputSize={400 * 1024}
                title="Ajustar Foto de Perfil"
                applyButtonText="Aplicar Foto"
              />
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
          {/* 🔥 AUTOSAVE: Indicador de estado de guardado */}
          <div className="flex items-center gap-3">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center text-cyan-400 text-sm">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                Saved
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="flex items-center text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                Error saving
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={loading || autoSaveStatus === 'saving'}
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
                          Formatos: PNG, JPG. Máximo: 10MB. Se ajustará automáticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Cropper Dialog for Logo */}
                <ImageCropper
                  open={showLogoCropper}
                  onClose={() => {
                    setShowLogoCropper(false);
                    setSelectedLogoFile(null);
                  }}
                  imageFile={selectedLogoFile}
                  onCropComplete={handleCroppedLogo}
                  outputWidth={400}
                  outputHeight={400}
                  maxOutputSize={400 * 1024}
                  title="Ajustar Logo"
                  applyButtonText="Aplicar Logo"
                />

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
                          Este email se usará para respuestas de clientes. Los estimados se envían desde la plataforma Owl Fenc.
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
                      <Label htmlFor="state" className="text-gray-300">State <span className="text-red-400">*</span></Label>
                      <Select
                        value={companyInfo.state || ''}
                        onValueChange={(value) => handleSelectChange('state', value)}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-cyan-400 focus:ring-cyan-400">
                          <SelectValue placeholder="Select your state" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 text-white max-h-[300px]">
                          <SelectItem value="AL">Alabama (AL)</SelectItem>
                          <SelectItem value="AK">Alaska (AK)</SelectItem>
                          <SelectItem value="AZ">Arizona (AZ)</SelectItem>
                          <SelectItem value="AR">Arkansas (AR)</SelectItem>
                          <SelectItem value="CA">California (CA)</SelectItem>
                          <SelectItem value="CO">Colorado (CO)</SelectItem>
                          <SelectItem value="CT">Connecticut (CT)</SelectItem>
                          <SelectItem value="DE">Delaware (DE)</SelectItem>
                          <SelectItem value="FL">Florida (FL)</SelectItem>
                          <SelectItem value="GA">Georgia (GA)</SelectItem>
                          <SelectItem value="HI">Hawaii (HI)</SelectItem>
                          <SelectItem value="ID">Idaho (ID)</SelectItem>
                          <SelectItem value="IL">Illinois (IL)</SelectItem>
                          <SelectItem value="IN">Indiana (IN)</SelectItem>
                          <SelectItem value="IA">Iowa (IA)</SelectItem>
                          <SelectItem value="KS">Kansas (KS)</SelectItem>
                          <SelectItem value="KY">Kentucky (KY)</SelectItem>
                          <SelectItem value="LA">Louisiana (LA)</SelectItem>
                          <SelectItem value="ME">Maine (ME)</SelectItem>
                          <SelectItem value="MD">Maryland (MD)</SelectItem>
                          <SelectItem value="MA">Massachusetts (MA)</SelectItem>
                          <SelectItem value="MI">Michigan (MI)</SelectItem>
                          <SelectItem value="MN">Minnesota (MN)</SelectItem>
                          <SelectItem value="MS">Mississippi (MS)</SelectItem>
                          <SelectItem value="MO">Missouri (MO)</SelectItem>
                          <SelectItem value="MT">Montana (MT)</SelectItem>
                          <SelectItem value="NE">Nebraska (NE)</SelectItem>
                          <SelectItem value="NV">Nevada (NV)</SelectItem>
                          <SelectItem value="NH">New Hampshire (NH)</SelectItem>
                          <SelectItem value="NJ">New Jersey (NJ)</SelectItem>
                          <SelectItem value="NM">New Mexico (NM)</SelectItem>
                          <SelectItem value="NY">New York (NY)</SelectItem>
                          <SelectItem value="NC">North Carolina (NC)</SelectItem>
                          <SelectItem value="ND">North Dakota (ND)</SelectItem>
                          <SelectItem value="OH">Ohio (OH)</SelectItem>
                          <SelectItem value="OK">Oklahoma (OK)</SelectItem>
                          <SelectItem value="OR">Oregon (OR)</SelectItem>
                          <SelectItem value="PA">Pennsylvania (PA)</SelectItem>
                          <SelectItem value="RI">Rhode Island (RI)</SelectItem>
                          <SelectItem value="SC">South Carolina (SC)</SelectItem>
                          <SelectItem value="SD">South Dakota (SD)</SelectItem>
                          <SelectItem value="TN">Tennessee (TN)</SelectItem>
                          <SelectItem value="TX">Texas (TX)</SelectItem>
                          <SelectItem value="UT">Utah (UT)</SelectItem>
                          <SelectItem value="VT">Vermont (VT)</SelectItem>
                          <SelectItem value="VA">Virginia (VA)</SelectItem>
                          <SelectItem value="WA">Washington (WA)</SelectItem>
                          <SelectItem value="WV">West Virginia (WV)</SelectItem>
                          <SelectItem value="WI">Wisconsin (WI)</SelectItem>
                          <SelectItem value="WY">Wyoming (WY)</SelectItem>
                          <SelectItem value="DC">Washington D.C. (DC)</SelectItem>
                          <SelectItem value="PR">Puerto Rico (PR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">Required for legal documents and timezone detection</p>
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
                    <Label htmlFor="license" className="text-gray-300">License Number <span className="text-red-400">*</span></Label>
                    <Input
                      id="license"
                      name="license"
                      value={companyInfo.license}
                      onChange={handleChange}
                      placeholder="CCB #123456"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                    <p className="text-xs text-gray-400">Required for legal contracts and compliance</p>
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

                {/* 2FA Settings - REMOVED: 2FA functionality temporarily disabled for stability */}
                {/* The 2FA feature has been temporarily removed to maintain app stability.
                     It can be re-enabled in the future when the core functionality is fully stable. */}
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
                    <div className="flex justify-end gap-4 mt-4 items-center">
                      {/* 🔥 AUTOSAVE: Indicador de estado */}
                      {autoSaveStatus === 'saving' && (
                        <span className="flex items-center text-cyan-400 text-sm">
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </span>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <span className="flex items-center text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Saved
                        </span>
                      )}
                      <Button
                        onClick={handleSave}
                        disabled={loading || autoSaveStatus === 'saving'}
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
