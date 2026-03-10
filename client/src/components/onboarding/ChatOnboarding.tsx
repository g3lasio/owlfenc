import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Settings,
  Zap,
  CheckCircle,
  ArrowRight,
  FileText,
  DollarSign,
  Upload,
  Smartphone,
  Clock,
  X,
  Wallet
} from 'lucide-react';

const ChatOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCompleting, setIsCompleting] = useState(false);

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'amigo';

  /**
   * Marca el onboarding como completado en la DB.
   * NO activa ningún plan de suscripción — el usuario ya tiene
   * su Welcome Bonus de 120 créditos asignado al registrarse.
   */
  const completeOnboarding = async () => {
    if (isCompleting) return;
    try {
      setIsCompleting(true);
      const token = await currentUser?.getIdToken();
      if (!token) {
        console.warn('[ONBOARDING] No auth token — skipping complete call');
        return;
      }

      const response = await fetch('/api/settings/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('✅ [ONBOARDING] Onboarding marked as completed');
      } else {
        // Non-blocking: si falla, el usuario igual puede continuar
        console.warn('[ONBOARDING] Could not mark onboarding complete:', response.status);
      }
    } catch (error) {
      // Non-blocking
      console.error('[ONBOARDING] Error completing onboarding (non-blocking):', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNavigation = async (path: string) => {
    await completeOnboarding();
    navigate(path);
    onComplete();
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <Card className="mb-4 sm:mb-6 border-cyan-500/30 bg-slate-800/80 backdrop-blur">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-600">
                  <AvatarFallback className="text-white font-bold text-lg">🦉</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    ¡Hola {userName}! Soy Mervin
                  </h1>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs px-2 py-1">
                    <Wallet className="h-3 w-3 mr-1" />
                    120 AI Credits incluidos — Bienvenido
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={isCompleting}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="border-cyan-500/30 bg-slate-800/80 backdrop-blur">
          <CardContent className="p-5 sm:p-6">

            {/* Welcome */}
            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                La plataforma más avanzada para contratistas — ahora con IA
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                Tus <span className="text-cyan-400 font-semibold">120 créditos de bienvenida</span> están listos. Úsalos para generar estimados, contratos, permisos y más.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5">
              <div className="bg-cyan-500/10 p-4 sm:p-3 rounded-lg border border-cyan-500/20 text-center">
                <FileText className="h-8 w-8 sm:h-6 sm:w-6 text-cyan-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white text-sm sm:text-xs mb-1">Estimados IA</h3>
                <p className="text-slate-400 text-sm sm:text-xs">60 segundos · 8 créditos</p>
              </div>

              <div className="bg-green-500/10 p-4 sm:p-3 rounded-lg border border-green-500/20 text-center">
                <DollarSign className="h-8 w-8 sm:h-6 sm:w-6 text-green-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white text-sm sm:text-xs mb-1">Contratos Legales</h3>
                <p className="text-slate-400 text-sm sm:text-xs">Protección profesional · 12 cr</p>
              </div>

              <div className="bg-purple-500/10 p-4 sm:p-3 rounded-lg border border-purple-500/20 text-center">
                <Smartphone className="h-8 w-8 sm:h-6 sm:w-6 text-purple-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white text-sm sm:text-xs mb-1">Mervin AI Chat</h3>
                <p className="text-slate-400 text-sm sm:text-xs">Asistente inteligente · Gratis</p>
              </div>

              <div className="bg-orange-500/10 p-4 sm:p-3 rounded-lg border border-orange-500/20 text-center">
                <Users className="h-8 w-8 sm:h-6 sm:w-6 text-orange-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white text-sm sm:text-xs mb-1">Gestión Clientes</h3>
                <p className="text-slate-400 text-sm sm:text-xs">Organiza proyectos</p>
              </div>

              <div className="bg-pink-500/10 p-4 sm:p-3 rounded-lg border border-pink-500/20 text-center">
                <Clock className="h-8 w-8 sm:h-6 sm:w-6 text-pink-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white text-sm sm:text-xs mb-1">Sin Marcas</h3>
                <p className="text-slate-400 text-sm sm:text-xs">100% profesional</p>
              </div>

              <div className="bg-indigo-500/10 p-4 sm:p-3 rounded-lg border border-indigo-500/20 text-center">
                <Upload className="h-8 w-8 sm:h-6 sm:w-6 text-indigo-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white text-sm sm:text-xs mb-1">Importar CRM</h3>
                <p className="text-slate-400 text-sm sm:text-xs">Excel / otros CRM</p>
              </div>
            </div>

            {/* Credits Info Banner */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 sm:p-5 mb-5 sm:mb-6">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-cyan-300 text-sm mb-2">
                    ⚡ PAY AS YOU GROW — Solo pagas lo que usas
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs">
                    <span>• <strong className="text-slate-300">120 créditos</strong> de bienvenida incluidos</span>
                    <span>• Recarga cuando quieras desde <strong className="text-slate-300">$10</strong></span>
                    <span>• Los créditos <strong className="text-slate-300">nunca expiran</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Tip */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 sm:p-5 mb-5 sm:mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-300 text-sm mb-2">
                    ⚡ Configura tu información para documentos profesionales
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-200/70 text-xs">
                    <span>• <strong>Datos empresa</strong> (nombre, dirección)</span>
                    <span>• <strong>Logo</strong> (en documentos)</span>
                    <span>• <strong>Clientes</strong> (importar Excel / CRM)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <Button
                onClick={() => handleNavigation('/profile')}
                disabled={isCompleting}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-14 sm:h-12 w-full"
              >
                <Building2 className="h-5 w-5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-base sm:text-sm">Empresa</div>
                  <div className="text-sm sm:text-xs opacity-90">Logo, datos</div>
                </div>
              </Button>

              <Button
                onClick={() => handleNavigation('/clients')}
                disabled={isCompleting}
                variant="outline"
                className="border-2 border-cyan-500/40 hover:bg-cyan-500/10 text-white h-14 sm:h-12 w-full"
              >
                <Users className="h-5 w-5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-base sm:text-sm">Clientes</div>
                  <div className="text-sm sm:text-xs text-slate-400">Importar</div>
                </div>
              </Button>

              <Button
                onClick={() => handleNavigation('/settings')}
                disabled={isCompleting}
                variant="outline"
                className="border-2 border-slate-600 hover:bg-slate-700 text-white h-14 sm:h-12 w-full"
              >
                <Settings className="h-5 w-5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-base sm:text-sm">Config</div>
                  <div className="text-sm sm:text-xs text-slate-400">Ajustes</div>
                </div>
              </Button>
            </div>

            {/* Skip */}
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isCompleting}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isCompleting ? 'Guardando...' : 'Empezar a usar ahora'}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatOnboarding;
