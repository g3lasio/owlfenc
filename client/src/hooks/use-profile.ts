
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UserProfile {
  id?: number;
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

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/user-profile"],
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    retry: 3
  });

  const updateProfile = useMutation({
    mutationFn: async (newProfile: Partial<UserProfile>) => {
      const response = await apiRequest("POST", "/api/user-profile", newProfile);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
    }
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate
  };
}
