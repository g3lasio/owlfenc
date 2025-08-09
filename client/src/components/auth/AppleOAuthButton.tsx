import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

interface AppleOAuthButtonProps {
  mode?: 'signin' | 'signup';
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

const AppleOAuthButton: React.FC<AppleOAuthButtonProps> = ({
  mode = 'signin',
  className,
  size = 'default'
}) => {
  const [loading, setLoading] = useState(false);
  const { loginWithApple } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleAppleAuth = async () => {
    try {
      setLoading(true);
      
      console.log(`=== INICIANDO APPLE AUTH DESDE ${mode.toUpperCase()} BUTTON ===`);
      console.log("Modo:", mode);
      console.log("URL:", window.location.href);
      
      // Llamar a Apple Auth
      const result = await loginWithApple();
      
      if (result) {
        // Autenticación exitosa inmediata
        console.log("🍎 [APPLE-BUTTON] Autenticación exitosa:", result.email);
        
        toast({
          title: `${mode === 'signin' ? 'Inicio de sesión' : 'Registro'} exitoso`,
          description: `Bienvenido${mode === 'signup' ? ', tu cuenta ha sido creada' : ''} con Apple ID.`,
        });
        
        navigate("/");
      } else {
        // Redirección iniciada
        console.log("🍎 [APPLE-BUTTON] Redirección iniciada");
        
        toast({
          title: "Redirigiendo a Apple",
          description: `Se abrirá la página de ${mode === 'signin' ? 'inicio de sesión' : 'registro'} de Apple ID.`,
        });
        
        // La redirección se manejará automáticamente
      }
    } catch (error: any) {
      console.error("🍎 [APPLE-BUTTON] Error en Apple Auth:", error);
      
      // Mostrar error específico
      toast({
        variant: "destructive",
        title: `Error de ${mode === 'signin' ? 'inicio de sesión' : 'registro'}`,
        description: error.message || "Error al conectar con Apple ID. Intenta con otro método.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={`w-full bg-black hover:bg-gray-800 text-white border-black hover:border-gray-800 ${className || ''}`}
      onClick={handleAppleAuth}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg 
          className="mr-2 h-4 w-4" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
        </svg>
      )}
      {loading ? 'Connecting...' : `${mode === 'signin' ? 'Sign in' : 'Sign up'} with Apple`}
    </Button>
  );
};

export default AppleOAuthButton;