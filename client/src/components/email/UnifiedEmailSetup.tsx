/**
 * Componente unificado de configuración de email
 * Permite elegir entre SendGrid, Resend, o configuración personal
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Settings,
  Zap,
  Key,
  User
} from "lucide-react";
import axios from 'axios';

interface EmailProvider {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  features: string[];
}

const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'personal',
    name: 'Mi Email Personal',
    description: 'Usa tu email personal (Gmail, Outlook, etc.) con configuración automática',
    icon: User,
    color: 'bg-blue-500',
    difficulty: 'easy',
    features: ['Configuración automática', 'Sin costo adicional', 'Emails auténticos']
  },
  {
    id: 'resend',
    name: 'Resend API',
    description: 'Servicio profesional de email con excelente entregabilidad',
    icon: Zap,
    color: 'bg-purple-500',
    difficulty: 'medium',
    features: ['Alta entregabilidad', 'Analytics avanzados', 'Soporte técnico']
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Plataforma empresarial de email marketing',
    icon: Mail,
    color: 'bg-green-500',
    difficulty: 'medium',
    features: ['Escalable', 'Templates avanzados', 'Reputación establecida']
  }
];

interface UnifiedEmailSetupProps {
  onComplete?: (config: any) => void;
  userEmail?: string;
  currentProvider?: string | null;
}

export default function UnifiedEmailSetup({ 
  onComplete, 
  userEmail = '',
  currentProvider = null 
}: UnifiedEmailSetupProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>(currentProvider ?? 'personal');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [config, setConfig] = useState<any>({});
  const { toast } = useToast();

  // Personal email configuration
  const [personalEmail, setPersonalEmail] = useState(userEmail);
  const [emailValidation, setEmailValidation] = useState<any>(null);

  // Resend configuration
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendDomain, setResendDomain] = useState('');

  // SendGrid configuration
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [sendgridFromEmail, setSendgridFromEmail] = useState('');

  const validatePersonalEmail = async () => {
    if (!personalEmail) return;

    try {
      const response = await axios.post('/api/contractor-email/validate', {
        contractorEmail: personalEmail
      });

      setEmailValidation(response.data);
      
      if (response.data.canSend) {
        toast({
          title: "Email validado",
          description: "Tu email está listo para ser configurado.",
        });
      }
    } catch (error) {
      toast({
        title: "Error de validación",
        description: "No se pudo validar el email.",
        variant: "destructive",
      });
    }
  };

  const connectProvider = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      let response;

      switch (selectedProvider) {
        case 'personal':
          response = await axios.post('/api/contractor-email/setup-personal', {
            email: personalEmail
          });
          break;

        case 'resend':
          response = await axios.post('/api/resend/setup', {
            apiKey: resendApiKey,
            domain: resendDomain || null
          });
          break;

        case 'sendgrid':
          response = await axios.post('/api/sendgrid/setup', {
            apiKey: sendgridApiKey,
            fromEmail: sendgridFromEmail
          });
          break;

        default:
          throw new Error('Proveedor no válido');
      }

      if (response.data.success) {
        setConnectionStatus('success');
        setConfig(response.data.config);
        
        toast({
          title: "Configuración completada",
          description: `${EMAIL_PROVIDERS.find(p => p.id === selectedProvider)?.name} configurado exitosamente.`,
        });

        onComplete?.(response.data.config);
      } else {
        throw new Error(response.data.message);
      }

    } catch (error: any) {
      setConnectionStatus('error');
      toast({
        title: "Error de configuración",
        description: error.response?.data?.message || "No se pudo configurar el proveedor de email.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const getProviderComponent = (providerId: string) => {
    switch (providerId) {
      case 'personal':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="personal-email">Tu Email Personal</Label>
              <Input
                id="personal-email"
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="tu@gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                Soportamos Gmail, Outlook, Yahoo, iCloud y dominios personalizados
              </p>
            </div>

            {personalEmail && (
              <Button 
                onClick={validatePersonalEmail} 
                variant="outline" 
                size="sm"
                className="w-full"
              >
                <Shield className="mr-2 h-4 w-4" />
                Validar Email
              </Button>
            )}

            {emailValidation && (
              <Alert className={emailValidation.canSend ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estado:</strong> {emailValidation.canSend ? "Listo para configurar" : "Requiere atención"}
                  <br />
                  <strong>Estrategia:</strong> {emailValidation.strategy}
                  {emailValidation.recommendations?.length > 0 && (
                    <div className="mt-2">
                      <strong>Recomendaciones:</strong>
                      <ul className="mt-1 space-y-1">
                        {emailValidation.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-xs">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'resend':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">Resend API Key</Label>
              <Input
                id="resend-api-key"
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                Obtén tu API key en: <a href="https://resend.com/api-keys" target="_blank" className="text-blue-500 hover:underline">resend.com/api-keys</a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-domain">Dominio (Opcional)</Label>
              <Input
                id="resend-domain"
                value={resendDomain}
                onChange={(e) => setResendDomain(e.target.value)}
                placeholder="tuempresa.com"
              />
              <p className="text-xs text-muted-foreground">
                Si tienes un dominio verificado en Resend, ingrésalo aquí
              </p>
            </div>
          </div>
        );

      case 'sendgrid':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sendgrid-api-key">SendGrid API Key</Label>
              <Input
                id="sendgrid-api-key"
                type="password"
                value={sendgridApiKey}
                onChange={(e) => setSendgridApiKey(e.target.value)}
                placeholder="SG.xxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                Obtén tu API key en: <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" className="text-blue-500 hover:underline">SendGrid API Keys</a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendgrid-from">Email de Envío</Label>
              <Input
                id="sendgrid-from"
                type="email"
                value={sendgridFromEmail}
                onChange={(e) => setSendgridFromEmail(e.target.value)}
                placeholder="noreply@tuempresa.com"
              />
              <p className="text-xs text-muted-foreground">
                Debe ser un email verificado en SendGrid
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canConnect = () => {
    switch (selectedProvider) {
      case 'personal':
        return personalEmail && emailValidation?.canSend;
      case 'resend':
        return resendApiKey;
      case 'sendgrid':
        return sendgridApiKey && sendgridFromEmail;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Configurar Email</h2>
        <p className="text-muted-foreground">
          Elige tu proveedor de email preferido para enviar estimados y contratos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EMAIL_PROVIDERS.map((provider) => {
          const IconComponent = provider.icon;
          const isSelected = selectedProvider === provider.id;
          
          return (
            <Card 
              key={provider.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary shadow-md bg-primary/5' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider(provider.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${provider.color} rounded-lg flex items-center justify-center text-white`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm">{provider.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {provider.difficulty === 'easy' ? 'Fácil' : provider.difficulty === 'medium' ? 'Intermedio' : 'Avanzado'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">{provider.description}</p>
                <div className="space-y-1">
                  {provider.features.slice(0, 2).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar {EMAIL_PROVIDERS.find(p => p.id === selectedProvider)?.name}
          </CardTitle>
          <CardDescription>
            {EMAIL_PROVIDERS.find(p => p.id === selectedProvider)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {getProviderComponent(selectedProvider)}

          {connectionStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ¡Configuración completada! Tu proveedor de email está listo para usar.
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hubo un problema con la configuración. Verifica tus credenciales e intenta nuevamente.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={connectProvider}
            disabled={!canConnect() || isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Configurar {EMAIL_PROVIDERS.find(p => p.id === selectedProvider)?.name}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Todos los proveedores soportan el envío de estimados y contratos con HTML renderizado.
          Tu configuración se guardará de forma segura y encriptada.
        </p>
      </div>
    </div>
  );
}