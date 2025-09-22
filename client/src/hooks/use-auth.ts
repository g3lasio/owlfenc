// 🔥 NO STATIC FIREBASE IMPORTS - Use existing useAuth from AuthContext  
import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  return useAuthContext();
}