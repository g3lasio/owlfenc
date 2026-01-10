/**
 * User Profile Hook
 * 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore is the ONLY source for profile data
 * No localStorage fallbacks, no API fallbacks - Firebase only
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  stripeConnectAccountId?: string | null;
}

const EMPTY_PROFILE: UserProfile = {
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
  profilePhoto: ""
};

export function useProfile() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // 🔥 SINGLE SOURCE OF TRUTH: Firebase Firestore ONLY
  // 🔄 REAL-TIME SYNC: Configurado para sincronizar entre dispositivos
  const { data: profile, isLoading, error, refetch } = useQuery<UserProfile>({
    queryKey: ["userProfile", currentUser?.uid],
    queryFn: async () => {
      if (!currentUser?.uid) {
        console.log("⚠️ [PROFILE] No authenticated user");
        return EMPTY_PROFILE;
      }
      
      console.log(`🔥 [PROFILE] Loading from Firebase (SINGLE SOURCE) for UID: ${currentUser.uid}`);
      
      try {
        const firebaseProfile = await getUserProfile(currentUser.uid);
        
        if (firebaseProfile) {
          console.log("✅ [PROFILE] Profile loaded from Firebase:", {
            company: firebaseProfile.company || firebaseProfile.companyName || 'NOT SET',
            license: firebaseProfile.license || 'NOT SET',
            state: firebaseProfile.state || 'NOT SET'
          });
          
          // Normalize field names (Firebase uses companyName, frontend expects company)
          return {
            ...EMPTY_PROFILE,
            ...firebaseProfile,
            company: firebaseProfile.company || firebaseProfile.companyName || "",
          } as UserProfile;
        }
        
        console.log("📭 [PROFILE] No profile found in Firebase, returning empty profile");
        return {
          ...EMPTY_PROFILE,
          email: currentUser.email || ""
        };
        
      } catch (err) {
        console.error("❌ [PROFILE] Error loading from Firebase:", err);
        throw err; // Let React Query handle the error
      }
    },
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 10, // Cache for 10 seconds - shorter for better sync
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    retry: 3,
    refetchOnWindowFocus: true, // 🔄 Refetch when user returns to tab (sync between devices)
    refetchOnReconnect: true, // 🔄 Refetch when network reconnects
    refetchInterval: 1000 * 60, // 🔄 Refetch every 60 seconds for real-time sync
  });

  // 🔥 SINGLE SOURCE OF TRUTH: Save to Firebase ONLY
  const updateProfile = useMutation({
    mutationFn: async (newProfile: Partial<UserProfile>) => {
      if (!currentUser?.uid) {
        throw new Error("User not authenticated");
      }
      
      console.log(`🔥 [PROFILE] Saving to Firebase (SINGLE SOURCE) for UID: ${currentUser.uid}`);
      console.log(`📊 [PROFILE] Data being saved:`, {
        license: newProfile.license || 'NOT PROVIDED',
        state: newProfile.state || 'NOT PROVIDED',
        company: newProfile.company || 'NOT PROVIDED'
      });
      
      try {
        // Save to Firebase
        await saveUserProfile(currentUser.uid, newProfile);
        
        // Get the complete updated profile from Firebase
        const updatedProfile = await getUserProfile(currentUser.uid);
        
        console.log("✅ [PROFILE] Profile saved to Firebase:", {
          license: updatedProfile?.license || 'NOT SET',
          state: updatedProfile?.state || 'NOT SET'
        });
        
        return {
          ...EMPTY_PROFILE,
          ...updatedProfile,
          company: updatedProfile?.company || updatedProfile?.companyName || "",
        } as UserProfile;
        
      } catch (err) {
        console.error("❌ [PROFILE] Error saving to Firebase:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate cache to force refetch from Firebase
      queryClient.invalidateQueries({ queryKey: ["userProfile", currentUser?.uid] });
    }
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutateAsync,
    refetch // 🔄 Permite forzar recarga desde Firebase
  };
}
