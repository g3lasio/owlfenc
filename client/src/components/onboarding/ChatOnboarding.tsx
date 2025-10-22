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
          description: "Tienes 14 días de acceso completo a todas las funciones premium",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Compact Header */}
        <Card className="mb-4 sm:mb-6 border-cyan-200 bg-white/90 backdrop-blur">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-600">
                  <AvatarFallback className="text-white font-bold">🦉</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    ¡Hola {userName}! Soy Mervin
                  </h1>
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs px-2 py-1">
                    <Zap className="h-3 w-3 mr-1" />
                    Trial Master - 14 Días Gratis
                  </Badge>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Compact */}
        <Card className="border-cyan-200 bg-white/90 backdrop-blur">
          <CardContent className="p-5 sm:p-6">
            {/* Compact Welcome */}
            <div className="text-center mb-5 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
                Tienes acceso completo a la plataforma más avanzada para contratistas
              </h2>
              <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
                Te activé un trial completo. Estas son las funciones principales:
              </p>
            </div>

            {/* Compact Features Grid - 6 in 2 rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 sm:p-3 rounded-lg border border-cyan-200 text-center">
                <FileText className="h-8 w-8 sm:h-6 sm:w-6 text-cyan-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800 text-sm sm:text-xs mb-1">Estimados IA</h3>
                <p className="text-gray-600 text-sm sm:text-xs">60 segundos, precios automáticos</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-3 rounded-lg border border-green-200 text-center">
                <DollarSign className="h-8 w-8 sm:h-6 sm:w-6 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800 text-sm sm:text-xs mb-1">Contratos Legales</h3>
                <p className="text-gray-600 text-sm sm:text-xs">Protección profesional</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 sm:p-3 rounded-lg border border-purple-200 text-center">
                <Smartphone className="h-8 w-8 sm:h-6 sm:w-6 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800 text-sm sm:text-xs mb-1">Mervin AI</h3>
                <p className="text-gray-600 text-sm sm:text-xs">Asistente inteligente</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 sm:p-3 rounded-lg border border-orange-200 text-center">
                <Users className="h-8 w-8 sm:h-6 sm:w-6 text-orange-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800 text-sm sm:text-xs mb-1">Gestión Clientes</h3>
                <p className="text-gray-600 text-sm sm:text-xs">Organiza proyectos</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 sm:p-3 rounded-lg border border-pink-200 text-center">
                <Clock className="h-8 w-8 sm:h-6 sm:w-6 text-pink-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800 text-sm sm:text-xs mb-1">Sin Marcas</h3>
                <p className="text-gray-600 text-sm sm:text-xs">100% profesional</p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 sm:p-3 rounded-lg border border-indigo-200 text-center">
                <Upload className="h-8 w-8 sm:h-6 sm:w-6 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-800 text-sm sm:text-xs mb-1">Importar CRM</h3>
                <p className="text-gray-600 text-sm sm:text-xs">Excel/otros CRM</p>
              </div>
            </div>

            {/* Compact Setup Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-5 mb-5 sm:mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-800 text-sm mb-2">
                    ⚡ Configura tu información para documentos profesionales
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-amber-700 text-xs">
                    <span>• <strong>Datos empresa</strong> (nombre, dirección)</span>
                    <span>• <strong>Logo</strong> (en documentos)</span>
                    <span>• <strong>Clientes</strong> (importar Excel/CRM)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <Button 
                onClick={() => handleNavigation('/profile')}
                disabled={isActivating}
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
                disabled={isActivating}
                variant="outline"
                className="border-2 border-cyan-200 hover:bg-cyan-50 h-14 sm:h-12 w-full"
              >
                <Users className="h-5 w-5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-base sm:text-sm">Clientes</div>
                  <div className="text-sm sm:text-xs text-gray-600">Importar</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleNavigation('/settings')}
                disabled={isActivating}
                variant="outline"
                className="border-2 border-gray-200 hover:bg-gray-50 h-14 sm:h-12 w-full"
              >
                <Settings className="h-5 w-5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-semibold text-base sm:text-sm">Config</div>
                  <div className="text-sm sm:text-xs text-gray-600">Ajustes</div>
                </div>
              </Button>
            </div>

            {/* Compact Skip Option */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={isActivating}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isActivating ? 'Activando...' : 'Empezar a usar ahora'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatOnboarding;