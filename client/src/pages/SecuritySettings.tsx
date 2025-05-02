import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle, ShieldAlert, Smartphone, Info } from "lucide-react";
import PhoneAuth from "@/components/auth/PhoneAuth";
import { useToast } from "@/hooks/use-toast";
import { multiFactor, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SecuritySettings() {
  const { currentUser, loading } = useAuth();
  const { toast } = useToast();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verificar si el usuario ya tiene MFA habilitado
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        if (currentUser && auth.currentUser) {
          const multiFactorUser = multiFactor(auth.currentUser);
          const enrolledFactors = multiFactorUser.enrolledFactors;
          setMfaEnabled(enrolledFactors.length > 0);
        }
      } catch (error) {
        console.error("Error al verificar estado MFA:", error);
      }
    };
    
    checkMfaStatus();
  }, [currentUser]);
  
  // Iniciar el proceso de inscripción MFA
  const handleStartEnrollment = () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para habilitar la autenticación de dos factores."
      });
      return;
    }
    
    setEnrolling(true);
  };
  
  // Cancelar la inscripción MFA
  const handleCancelEnrollment = () => {
    setEnrolling(false);
  };
  
  // Manejar la finalización exitosa de la inscripción MFA
  const handleEnrollmentSuccess = () => {
    setEnrolling(false);
    setMfaEnabled(true);
    toast({
      title: "Configuración exitosa",
      description: "La autenticación de dos factores ha sido habilitada correctamente."
    });
  };
  
  // Función para desactivar MFA
  const handleDisableMfa = async () => {
    if (!currentUser || !auth.currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para realizar esta acción."
      });
      return;
    }
    
    try {
      const multiFactorUser = multiFactor(auth.currentUser);
      
      // Verificar si hay factores enrollados
      if (multiFactorUser.enrolledFactors.length === 0) {
        setMfaEnabled(false);
        return;
      }
      
      // Obtener el ID del primer factor (normalmente el único)
      const factorId = multiFactorUser.enrolledFactors[0].uid;
      
      // Proceso para desactivar MFA
      // En modo de desarrollo, simular la desactivación
      if (window.location.hostname.includes('.replit.dev') || 
          window.location.hostname.includes('.id.repl.co')) {
        console.log("Simulando desactivación MFA en entorno de desarrollo");
        setMfaEnabled(false);
        
        toast({
          title: "MFA desactivado",
          description: "La autenticación de dos factores ha sido desactivada."
        });
        
        return;
      }
      
      // En producción, realmente desactivar el MFA
      await multiFactorUser.unenroll(factorId);
      setMfaEnabled(false);
      
      toast({
        title: "MFA desactivado",
        description: "La autenticación de dos factores ha sido desactivada correctamente."
      });
    } catch (error: any) {
      console.error("Error al desactivar MFA:", error);
      setError(error.message || "Ocurrió un error al desactivar la autenticación de dos factores.");
      
      // Asegurar que el switch refleja el estado real
      const checkMfaStatus = async () => {
        if (currentUser && auth.currentUser) {
          const multiFactorUser = multiFactor(auth.currentUser);
          const enrolledFactors = multiFactorUser.enrolledFactors;
          setMfaEnabled(enrolledFactors.length > 0);
        }
      };
      
      checkMfaStatus();
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo desactivar la autenticación de dos factores."
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración de Seguridad</h1>
          <p className="text-muted-foreground">
            Administra la seguridad de tu cuenta y configura la autenticación de dos factores.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Opciones de seguridad</CardTitle>
          </div>
          <CardDescription>
            Configura opciones avanzadas para proteger tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="2fa" className="w-full">
            <TabsList className="grid grid-cols-2 mb-8">
              <TabsTrigger value="2fa" className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span>Autenticación de dos factores</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2" disabled>
                <Smartphone className="h-4 w-4" />
                <span>Dispositivos conectados</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="2fa" className="space-y-6">
              <div className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium">Autenticación de dos factores por SMS</h3>
                    {mfaEnabled && <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Activo</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Añade una capa adicional de seguridad usando verificación por SMS.
                  </p>
                </div>
                <Switch 
                  checked={mfaEnabled} 
                  onCheckedChange={(checked) => {
                    if (!checked && mfaEnabled) {
                      // Confirmar antes de desactivar MFA
                      if (confirm("¿Estás seguro de que deseas desactivar la autenticación de dos factores? Esto podría reducir la seguridad de tu cuenta.")) {
                        handleDisableMfa();
                      } else {
                        // Si el usuario cancela, mantener el switch en posición "on"
                        setTimeout(() => setMfaEnabled(true), 0);
                      }
                    } else if (checked && !mfaEnabled) {
                      handleStartEnrollment();
                    }
                  }}
                />
              </div>
              
              {enrolling && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Configurar verificación en dos pasos</CardTitle>
                    <CardDescription>
                      Añade tu número de teléfono para recibir códigos de verificación por SMS
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PhoneAuth 
                      mode="enroll" 
                      onSuccess={handleEnrollmentSuccess}
                    />
                    
                    <div className="mt-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelEnrollment}
                      >
                        Cancelar configuración
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {!enrolling && !mfaEnabled && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Recomendación de seguridad</AlertTitle>
                  <AlertDescription>
                    Te recomendamos activar la autenticación de dos factores para aumentar la seguridad de tu cuenta.
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="devices">
              <p className="text-muted-foreground">
                Esta función estará disponible próximamente.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}