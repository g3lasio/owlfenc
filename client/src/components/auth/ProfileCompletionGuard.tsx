/**
 * 🛡️ PROFILE COMPLETION GUARD
 * Componente que asegura que usuarios con OTP/Magic Link completen su perfil
 * antes de acceder al sistema
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

export default function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    checkProfileCompletion();
  }, [currentUser]);

  const checkProfileCompletion = async () => {
    if (!currentUser) {
      setIsChecking(false);
      return;
    }

    try {
      console.log('🔍 [PROFILE-GUARD] Verificando perfil para:', currentUser.email);
      
      // Obtener perfil de Firebase
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      const profile = docSnap.exists() ? docSnap.data() : null;
      
      // Verificar campos obligatorios
      const requiredFields = {
        displayName: profile?.displayName || currentUser.displayName,
        company: profile?.company,
        phone: profile?.phone || profile?.mobilePhone,
        email: profile?.email || currentUser.email
      };
      
      // Determinar si el perfil está completo
      const isComplete = !!(
        requiredFields.displayName &&
        requiredFields.company &&
        requiredFields.phone &&
        requiredFields.email
      );
      
      console.log('📊 [PROFILE-GUARD] Estado del perfil:', {
        isComplete,
        requiredFields,
        authProvider: profile?.authProvider
      });
      
      // Si el usuario se registró con OTP/Magic Link y no tiene perfil completo
      if (!isComplete && (profile?.authProvider === 'otp' || profile?.authProvider === 'magic-link')) {
        console.log('⚠️ [PROFILE-GUARD] Perfil incompleto - redirigiendo a completar');
        
        // Guardar en localStorage para mostrar mensaje
        localStorage.setItem('profile-completion-required', 'true');
        
        // Redirigir a página de perfil
        setLocation('/profile?complete=true');
        return;
      }
      
      setProfileComplete(true);
    } catch (error) {
      console.error('❌ [PROFILE-GUARD] Error verificando perfil:', error);
      // En caso de error, permitir acceso pero loguear
      setProfileComplete(true);
    } finally {
      setIsChecking(false);
    }
  };

  // Mientras verifica, mostrar loading
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Verificando tu perfil...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estamos preparando tu experiencia personalizada
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no hay usuario, mostrar children (probablemente login)
  if (!currentUser) {
    return <>{children}</>;
  }

  // Si el perfil está completo o hubo error, mostrar children
  if (profileComplete) {
    return <>{children}</>;
  }

  // Este caso no debería ocurrir porque ya redirigimos arriba
  return null;
}