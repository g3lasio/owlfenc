
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getUserProfile, saveUserProfile } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

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
  
  // Consulta para obtener el perfil de usuario (primero localStorage en dev, Firebase en prod, API como respaldo)
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["userProfile", currentUser?.uid],
    queryFn: async () => {
      // En modo desarrollo, verificar localStorage primero con clave específica del usuario
      if (isDevMode) {
        try {
          const userId = currentUser?.uid;
          const profileKey = `userProfile_${userId}`;
          const localProfile = localStorage.getItem(profileKey);
          if (localProfile) {
            console.log("Perfil cargado desde localStorage con clave:", profileKey);
            return JSON.parse(localProfile) as UserProfile;
          }
        } catch (localErr) {
          console.error("Error cargando perfil desde localStorage:", localErr);
        }
      }
      
      // Si estamos en Firebase mode y no hay datos en localStorage (o no estamos en dev)
      if (currentUser && !isDevMode) {
        try {
          // Intentar obtener el perfil de Firebase
          const firebaseProfile = await getUserProfile(currentUser.uid);
          if (firebaseProfile) {
            return firebaseProfile as UserProfile;
          }
        } catch (err) {
          console.error("Error obteniendo perfil desde Firebase:", err);
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

  // Mutación para actualizar el perfil (en Firebase, API o localStorage)
  const updateProfile = useMutation({
    mutationFn: async (newProfile: Partial<UserProfile>) => {
      // Si tenemos un usuario autenticado y no estamos en modo dev, guardar en Firebase
      if (currentUser && !isDevMode) {
        try {
          await saveUserProfile(currentUser.uid, newProfile);
        } catch (err) {
          console.error("Error guardando perfil en Firebase:", err);
        }
      }
      
      // En modo desarrollo, guardar en localStorage
      if (isDevMode) {
        try {
          // Usar clave específica por usuario para localStorage
          const userId = currentUser?.uid;
          const profileKey = `userProfile_${userId}`;
          
          // Obtener el perfil actual del localStorage si existe
          const currentLocalProfile = localStorage.getItem(profileKey);
          const parsedLocalProfile = currentLocalProfile ? JSON.parse(currentLocalProfile) : {};
          
          // Mezclar el perfil actual con los nuevos datos
          const updatedProfile = {
            ...parsedLocalProfile,
            ...newProfile,
            updatedAt: new Date().toISOString()
          };
          
          // Guardar en localStorage con clave específica del usuario
          localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
          
          console.log("Perfil guardado en localStorage:", updatedProfile);
          
          return updatedProfile;
        } catch (localErr) {
          console.error("Error guardando perfil en localStorage:", localErr);
        }
      }
      
      // También intentar guardar en la API
      try {
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
        
        return await response.json();
      } catch (err) {
        console.error("Error guardando perfil en API:", err);
        // Si estamos en modo desarrollo y fallamos en guardar en la API, devolver los datos que guardamos en localStorage
        if (isDevMode) {
          const userId = currentUser?.uid;
          const profileKey = `userProfile_${userId}`;
          const localProfile = localStorage.getItem(profileKey);
          if (localProfile) {
            return JSON.parse(localProfile);
          }
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
