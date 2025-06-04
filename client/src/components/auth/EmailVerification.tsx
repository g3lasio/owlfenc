import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { sendVerificationEmail, checkEmailVerification } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface EmailVerificationProps {
  onVerificationComplete?: () => void;
  showAsDialog?: boolean;
}

export function EmailVerification({ onVerificationComplete, showAsDialog = false }: EmailVerificationProps) {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    setIsChecking(true);
    try {
      const result = await checkEmailVerification();
      setIsVerified(result.verified);
      if (result.verified && onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    }
    setIsChecking(false);
  };

  const handleSendVerification = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await sendVerificationEmail();
      if (result.success) {
        setEmailSent(true);
        setMessage('Email de verificación enviado. Por favor revisa tu bandeja de entrada.');
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error: any) {
      setMessage(`Error enviando email: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  const handleRefreshStatus = async () => {
    await checkVerificationStatus();
    if (isVerified) {
      setMessage('¡Email verificado exitosamente!');
    } else {
      setMessage('Email aún no verificado. Revisa tu bandeja de entrada.');
    }
  };

  if (isVerified) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ¡Tu email está verificado! Ya puedes enviar estimados por email.
        </AlertDescription>
      </Alert>
    );
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-amber-600">
        <Mail className="h-5 w-5" />
        <span className="font-medium">Verificación de Email Requerida</span>
      </div>
      
      <p className="text-sm text-gray-600">
        Para enviar estimados por email, necesitas verificar tu dirección de email: <strong>{currentUser?.email}</strong>
      </p>

      {message && (
        <Alert className={emailSent ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={emailSent ? "text-blue-800" : "text-red-800"}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleSendVerification} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              {emailSent ? 'Reenviar Email' : 'Enviar Verificación'}
            </>
          )}
        </Button>

        {emailSent && (
          <Button 
            variant="outline" 
            onClick={handleRefreshStatus}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Ya lo Verifiqué
              </>
            )}
          </Button>
        )}
      </div>

      {emailSent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Pasos para verificar:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Revisa tu bandeja de entrada en {currentUser?.email}</li>
                <li>Busca el email de "Firebase Auth" o "Owl Fence"</li>
                <li>Haz clic en el enlace de verificación</li>
                <li>Regresa aquí y presiona "Ya lo Verifiqué"</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (showAsDialog) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">Verificar Email</CardTitle>
          <CardDescription>
            Completa la verificación para habilitar el envío de emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}