import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User, 
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
  X
} from 'lucide-react';

const ChatOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isActivating, setIsActivating] = useState(false);

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'amigo';

  const activateTrial = async () => {
    try {
      setIsActivating(true);
      const token = await currentUser?.getIdToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      const response = await fetch('/api/subscription/activate-trial', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: currentUser?.uid,
          email: currentUser?.email 
        })
      });
      
      if (response.ok) {
        toast({
          title: "🎉 Trial activado",
          description: "Tienes 21 días de acceso completo a todas las funciones premium",
        });
      }
    } catch (error) {
      console.error('Error activating trial:', error);
    } finally {
      setIsActivating(false);
    }
  };

  const handleNavigation = async (path: string) => {
    await activateTrial();
    navigate(path);
    onComplete();
  };

  const handleSkip = async () => {
    await activateTrial();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-cyan-200 bg-white/90 backdrop-blur">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 bg-gradient-to-r from-cyan-500 to-blue-600">
                  <AvatarFallback className="text-white font-bold text-xl">🦉</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    ¡Hola {userName}!
                  </CardTitle>
                  <p className="text-gray-600 text-lg">Soy Mervin, tu asistente de Owl Fenc</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-2" />
                Saltear
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Card className="border-cyan-200 bg-white/90 backdrop-blur">
          <CardContent className="p-8">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-green-100 text-green-700 border-green-300 px-4 py-2">
                <Zap className="h-4 w-4 mr-2" />
                Trial Master Activado - 21 Días Gratis
              </Badge>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Tienes acceso completo a la plataforma más avanzada para contratistas
              </h2>
              
              <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
                Te he activado un trial completo. Estas son las funciones principales que te ayudarán a ganar más proyectos:
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border border-cyan-200">
                <FileText className="h-8 w-8 text-cyan-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Estimados con IA</h3>
                <p className="text-gray-600 text-sm">Estimados profesionales en 60 segundos con precios automáticos</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <DollarSign className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Contratos Legales</h3>
                <p className="text-gray-600 text-sm">Contratos profesionales que te protegen legalmente</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200">
                <Smartphone className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Mervin AI</h3>
                <p className="text-gray-600 text-sm">Asistente inteligente que responde cualquier pregunta</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                <Users className="h-8 w-8 text-orange-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Gestión de Clientes</h3>
                <p className="text-gray-600 text-sm">Organiza todos tus clientes y proyectos en un solo lugar</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-xl border border-pink-200">
                <Clock className="h-8 w-8 text-pink-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Sin Marcas de Agua</h3>
                <p className="text-gray-600 text-sm">Documentos 100% profesionales con tu marca</p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                <Upload className="h-8 w-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-2">Importar CRM</h3>
                <p className="text-gray-600 text-sm">Sube tus clientes existentes desde Excel u otro CRM</p>
              </div>
            </div>

            {/* Important Setup Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-800 mb-2">
                    ⚡ Importante: Configura tu información empresarial
                  </h4>
                  <p className="text-amber-700 mb-3">
                    Para que tus estimados y contratos se vean profesionales, necesitas configurar:
                  </p>
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>• <strong>Datos de tu empresa</strong> (nombre, dirección, teléfono)</li>
                    <li>• <strong>Logo empresarial</strong> (aparece en todos los documentos)</li>
                    <li>• <strong>Subir clientes existentes</strong> (importar desde Excel/CRM)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                onClick={() => handleNavigation('/profile')}
                disabled={isActivating}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-16 text-lg"
              >
                <Building2 className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Configurar Empresa</div>
                  <div className="text-xs opacity-90">Logo, datos, contacto</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleNavigation('/clients')}
                disabled={isActivating}
                variant="outline"
                className="border-2 border-cyan-200 hover:bg-cyan-50 h-16 text-lg"
              >
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Subir Clientes</div>
                  <div className="text-xs text-gray-600">Importar desde CRM</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleNavigation('/settings')}
                disabled={isActivating}
                variant="outline"
                className="border-2 border-gray-200 hover:bg-gray-50 h-16 text-lg"
              >
                <Settings className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Configuración</div>
                  <div className="text-xs text-gray-600">Ajustes avanzados</div>
                </div>
              </Button>
            </div>

            {/* Skip Option */}
            <div className="text-center mt-8">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={isActivating}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isActivating ? 'Activando trial...' : 'Empezar a usar la plataforma'}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Puedes configurar todo después en cualquier momento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatOnboarding;