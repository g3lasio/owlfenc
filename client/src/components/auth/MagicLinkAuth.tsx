/**
 * 🔗 MAGIC LINK AUTHENTICATION COMPONENT
 * Permite login/signup sin contraseña mediante link enviado por email
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FirebaseAuthService } from '@/lib/firebase-auth-service';
import { HiMail } from 'react-icons/hi';
import { RiMailSendLine, RiCheckboxCircleLine } from 'react-icons/ri';

interface MagicLinkAuthProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
}

export default function MagicLinkAuth({ mode, onSuccess }: MagicLinkAuthProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();
  
  const handleSendLink = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await FirebaseAuthService.sendMagicLink(email);
      
      if (result.success) {
        setIsSent(true);
        toast({
          title: '✅ Link enviado',
          description: 'Revisa tu email para continuar',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo enviar el link',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error enviando link',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResend = () => {
    setIsSent(false);
    setEmail('');
  };
  
  if (isSent) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <RiCheckboxCircleLine className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>¡Link enviado!</CardTitle>
          <CardDescription>
            Hemos enviado un link de acceso a <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p>📧 Revisa tu bandeja de entrada</p>
            <p>🔗 Haz clic en el link para acceder</p>
            <p>⏱️ El link expira en 1 hora</p>
          </div>
          
          <Button
            variant="outline"
            onClick={handleResend}
            className="w-full"
          >
            Enviar nuevo link
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HiMail className="h-5 w-5" />
          Acceso sin contraseña
        </CardTitle>
        <CardDescription>
          {mode === 'signup' 
            ? 'Crea tu cuenta con solo tu email'
            : 'Accede a tu cuenta sin contraseña'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="h-12"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendLink();
              }
            }}
          />
        </div>
        
        <Button
          onClick={handleSendLink}
          disabled={isLoading || !email}
          className="w-full h-12 gap-2"
        >
          {isLoading ? (
            <>Enviando...</>
          ) : (
            <>
              <RiMailSendLine className="h-5 w-5" />
              Enviar link de acceso
            </>
          )}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          Te enviaremos un link seguro para {mode === 'signup' ? 'crear tu cuenta' : 'acceder'}.
          No necesitas recordar contraseñas.
        </div>
      </CardContent>
    </Card>
  );
}