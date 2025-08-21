/**
 * Componente para configurar autenticación biométrica
 * Permite a usuarios registrar Face ID, Touch ID después del login
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Smartphone, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { detectBiometricCapabilities } from '@/lib/biometric-detection';

export function BiometricSetupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const { currentUser, registerBiometricCredential } = useAuth();
  const { toast } = useToast();

  const handleSetupBiometric = async () => {
    if (!currentUser || isLoading) return;

    setIsLoading(true);
    
    try {
      // Detectar capacidades biométricas
      const capabilities = await detectBiometricCapabilities();
      
      if (!capabilities.supported) {
        toast({
          title: "Autenticación biométrica no disponible",
          description: "Tu dispositivo no soporta Face ID, Touch ID o huella digital.",
          variant: "destructive",
        });
        return;
      }

      // Mostrar toast informativo
      toast({
        title: "Configurando autenticación biométrica",
        description: `Se te pedirá usar tu ${capabilities.recommendedMethod} para configurar acceso rápido.`,
      });

      // Registrar credencial biométrica
      const success = await registerBiometricCredential();
      
      if (success) {
        setIsRegistered(true);
        toast({
          title: "¡Autenticación biométrica configurada!",
          description: `Ahora puedes usar ${capabilities.recommendedMethod} para acceder más rápido.`,
        });
      }
    } catch (error: any) {
      console.error('Error configurando biometría:', error);
      
      let errorMessage = 'No se pudo configurar la autenticación biométrica';
      
      if (error.message?.includes('canceled') || error.message?.includes('cancelado')) {
        errorMessage = 'Configuración cancelada por el usuario';
      } else if (error.message?.includes('not allowed') || error.message?.includes('no autorizado')) {
        errorMessage = 'Acceso biométrico no autorizado. Verifica la configuración de tu dispositivo';
      }
      
      toast({
        title: "Error de configuración",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // No mostrar si no hay usuario autenticado
  if (!currentUser) return null;

  // Si ya está registrado, mostrar estado de éxito
  if (isRegistered) {
    return (
      <Button
        variant="outline"
        className="w-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Autenticación biométrica configurada
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleSetupBiometric}
      disabled={isLoading}
      className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Configurando...
        </>
      ) : (
        <>
          <Fingerprint className="w-4 h-4 mr-2" />
          Configurar Face ID / Touch ID
        </>
      )}
    </Button>
  );
}

export default BiometricSetupButton;