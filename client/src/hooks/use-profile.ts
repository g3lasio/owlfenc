
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getUserProfile, saveUserProfile } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export interface UserProfile {
  id?: string;
  userId?: string;
  profilePhoto?: string;
  company: string;
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
  socialMedia: Record<string, string>;
  documents: Record<string, string>;
  logo: string;
}

export function useProfile() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  // Verificar si estamos en modo desarrollo
  const isDevMode = (window.location.hostname.includes('.replit.dev') || 
                    window.location.hostname.includes('.id.repl.co') ||
                    window.location.hostname === 'localhost' ||
                    window.location.hostname.includes('replit.app')) &&
                    !window.location.hostname.includes('owlfenc.com');
  
  // Consulta para obtener el perfil de usuario (FIREBASE PRIMERO para sincronización entre dispositivos)
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["userProfile", currentUser?.uid],
    queryFn: async () => {
      // CRITICAL FIX: ALWAYS try Firebase FIRST for cross-device sync
      // localStorage should only be a local cache, NOT the source of truth
      if (currentUser) {
        try {
          console.log("🔥 [PROFILE] Cargando desde Firebase (fuente de verdad)...");
          const firebaseProfile = await getUserProfile(currentUser.uid);
          if (firebaseProfile) {
            console.log("✅ [PROFILE] Perfil cargado desde Firebase - sincronizado entre dispositivos");
            
            // Update localStorage cache after loading from Firebase
            if (isDevMode) {
              const profileKey = `userProfile_${currentUser.uid}`;
              localStorage.setItem(profileKey, JSON.stringify(firebaseProfile));
              console.log("💾 [PROFILE] Cache local actualizado");
            }
            
            return firebaseProfile as UserProfile;
          }
        } catch (err) {
          console.error("❌ [PROFILE] Error obteniendo perfil desde Firebase:", err);
        }
      }
      
      // Si no hay datos en localStorage o Firebase, intentar API del servidor
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        // Agregar token de Firebase si está disponible
        if (currentUser) {
          const token = await currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          headers
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (err) {
        console.error("Error obteniendo perfil desde API:", err);
        
        // Si todo falla y estamos en modo desarrollo, devolver un perfil vacío
        if (isDevMode) {
          const userId = currentUser?.uid;
          const profileKey = `userProfile_${userId}`;
          
          const emptyProfile = {
            company: "",
            ownerName: "",
            role: "",
            email: currentUser?.email || "",
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
          };
          
          // Guardar el perfil vacío en localStorage con clave específica del usuario
          localStorage.setItem(profileKey, JSON.stringify(emptyProfile));
          
          return emptyProfile;
        }
        
        throw err;
      }
    },
    enabled: !!currentUser || isDevMode,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    retry: 3
  });

  // Mutación para actualizar el perfil (FIREBASE PRIMERO para sincronización entre dispositivos)
  const updateProfile = useMutation({
    mutationFn: async (newProfile: Partial<UserProfile>) => {
      let savedProfile: any = null;
      
      // CRITICAL FIX: ALWAYS save to Firebase FIRST for cross-device sync
      if (currentUser) {
        try {
          console.log("🔥 [PROFILE] Guardando en Firebase (fuente de verdad)...");
          await saveUserProfile(currentUser.uid, newProfile);
          
          // Get the complete updated profile from Firebase
          const updatedFirebaseProfile = await getUserProfile(currentUser.uid);
          savedProfile = updatedFirebaseProfile;
          
          console.log("✅ [PROFILE] Perfil guardado en Firebase - sincronizado entre dispositivos");
          
          // Update localStorage cache after saving to Firebase
          if (isDevMode && savedProfile) {
            const profileKey = `userProfile_${currentUser.uid}`;
            localStorage.setItem(profileKey, JSON.stringify(savedProfile));
            console.log("💾 [PROFILE] Cache local actualizado después de guardar");
          }
        } catch (err) {
          console.error("❌ [PROFILE] Error guardando perfil en Firebase:", err);
          throw err; // Throw to show error to user
        }
      }
      
      // If Firebase save succeeded, return the saved profile
      if (savedProfile) {
        return savedProfile;
      }
      
      // Fallback: Also try to save to API (but Firebase is the source of truth)
      try {
        console.log("🔄 [PROFILE] Intentando guardar en API como respaldo...");
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(newProfile),
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const apiProfile = await response.json();
        console.log("✅ [PROFILE] Perfil guardado en API");
        return apiProfile;
      } catch (err) {
        console.error("❌ [PROFILE] Error guardando perfil en API:", err);
        // If we have savedProfile from Firebase, return it even if API fails
        if (savedProfile) {
          console.log("✅ [PROFILE] Retornando perfil de Firebase aunque API falló");
          return savedProfile;
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", currentUser?.uid] });
    }
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate
  };
}
