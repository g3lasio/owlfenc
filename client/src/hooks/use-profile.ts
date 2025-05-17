
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getUserProfile, saveUserProfile } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id?: string;
  userId?: string;
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
  socialMedia: Record<string, string>;
  documents: Record<string, string>;
  logo: string;
}

export function useProfile() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  // Verificar si estamos en modo desarrollo
  const isDevMode = window.location.hostname.includes('.replit.dev') || 
                   window.location.hostname.includes('.id.repl.co') ||
                   window.location.hostname === 'localhost' ||
                   window.location.hostname.includes('replit.app');
  
  // Consulta para obtener el perfil de usuario (primero de Firebase, luego API de respaldo)
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["userProfile", currentUser?.uid],
    queryFn: async () => {
      // Si estamos en Firebase mode
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
      
      // Si no hay datos en Firebase o estamos en desarrollo, intentar API del servidor
      try {
        const response = await fetch("/api/user-profile", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (err) {
        console.error("Error obteniendo perfil desde API:", err);
        
        // Si todo falla y estamos en modo desarrollo, devolver un perfil vacío
        if (isDevMode) {
          return {
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
          };
        }
        
        throw err;
      }
    },
    enabled: !!currentUser || isDevMode,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    retry: 3
  });

  // Mutación para actualizar el perfil (en Firebase y en la API)
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
      
      // También intentar guardar en la API
      try {
        const response = await fetch("/api/user-profile", {
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
        throw err;
      }
    },
    onSuccess: () => {
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
