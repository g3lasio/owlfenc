import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/contexts/PermissionContext";
import { useLocation } from "wouter";
import { 
  Lock, 
  Sparkles, 
  CreditCard, 
  DollarSign, 
  PiggyBank, 
  ChartBar,
  Building2,
  Users,
  Copy,
  Share2,
  ExternalLink,
  TrendingUp,
  Zap
} from "lucide-react";
import { useUser } from "@/hooks/use-user";

export default function OwlFunding() {
  const { toast } = useToast();
  const { hasAccess, userPlan, showUpgradeModal } = usePermissions();
  const [, navigate] = useLocation();
  const { user } = useUser();
  
  // Verificar si tiene acceso a Owl Funding (solo planes pagados)
  const hasOwlFundingAccess = userPlan?.id !== 5; // Todos excepto Primo Chambeador
  
  // Link personalizado para el contratista
  const personalizedLink = user?.username 
    ? `${window.location.origin}/fund/${user.username}`
    : `${window.location.origin}/fund/contractor`;

  // Si el usuario no tiene acceso, mostrar mensaje de upgrade
  if (!hasOwlFundingAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-900/50 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4 relative">
                <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-red-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Owl Funding
              </CardTitle>
              <CardDescription className="text-lg text-gray-400 mt-2">
                Financiamiento Premium - Requiere Plan Pagado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-red-900/10 to-orange-900/10 border border-red-900/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  ¿Qué incluye Owl Funding?
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Financiamiento empresarial exclusivo para contratistas con tasas preferenciales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Préstamos para equipos y maquinaria con aprobación rápida</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Financiamiento por proyecto con términos flexibles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Líneas de crédito rotativas para capital de trabajo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Herramienta para ofrecer financiamiento a tus clientes y cerrar más contratos</span>
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <PiggyBank className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                  <p className="text-sm text-gray-400">Hasta</p>
                  <p className="text-2xl font-bold text-white">$500K</p>
                  <p className="text-xs text-gray-500">En financiamiento</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <ChartBar className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-sm text-gray-400">Desde</p>
                  <p className="text-2xl font-bold text-white">4.9%</p>
                  <p className="text-xs text-gray-500">Tasa de interés</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-sm text-gray-400">Hasta</p>
                  <p className="text-2xl font-bold text-white">24h</p>
                  <p className="text-xs text-gray-500">Aprobación</p>
                </div>
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-gray-400">
                  Tu plan actual: <span className="font-semibold text-white">{userPlan?.name || 'Primo Chambeador'}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Actualiza a <span className="text-cyan-400 font-semibold">Mero Patrón</span> o <span className="text-purple-400 font-semibold">Master Contractor</span> para acceder a financiamiento exclusivo
                </p>
              </div>
              
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={() => navigate('/subscription')}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold px-6 py-3"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ver Planes y Precios
                </Button>
                <Button
                  onClick={() => showUpgradeModal('owlFunding', 'Accede a financiamiento exclusivo para hacer crecer tu negocio')}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                  size="lg"
                >
                  Más Información
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(personalizedLink);
      toast({
        title: "¡Link copiado!",
        description: "El link de financiamiento ha sido copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el link. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Opciones de Financiamiento',
          text: '¡Haz tu proyecto realidad! Revisa tus opciones de financiamiento aquí:',
          url: personalizedLink,
        });
      } catch (error) {
        // Usuario canceló o error en share
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copiar al clipboard
      handleCopyLink();
    }
  };

  return (
    <div className="container pb-40 mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center mb-8 text-center">
        <img
          src="/images/owl-funding-logo-white.png"
          alt="Owl Funding Logo"
          className="h-32 mb-4"
        />
        <p className="text-muted-foreground max-w-2xl text-lg">
          Soluciones de financiamiento exclusivas para contratistas
        </p>
      </div>

      {/* Mensajes Motivacionales */}
      <div className="max-w-5xl mx-auto mb-8 space-y-4">
        <Card className="border-cyan-900/30 bg-gradient-to-r from-cyan-950/20 to-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  ¿Sabías que...?
                </h3>
                <p className="text-gray-300">
                  Los contratistas que ofrecen opciones de financiamiento a sus clientes 
                  <span className="text-cyan-400 font-bold"> cierran hasta un 40% más contratos</span> que 
                  aquellos que no lo hacen. El financiamiento elimina la barrera del precio y 
                  convierte proyectos "imposibles" en realidad.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-900/30 bg-gradient-to-r from-purple-950/20 to-pink-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Ventaja Competitiva
                </h3>
                <p className="text-gray-300">
                  Mientras tu competencia pierde clientes por falta de liquidez, 
                  <span className="text-purple-400 font-bold"> tú cierras el trato en el momento</span>. 
                  Ofrecer financiamiento te posiciona como un profesional completo que piensa 
                  en las necesidades reales de sus clientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* Card 1: Financiamiento para tu Negocio */}
        <Card className="border-blue-900/50 bg-gradient-to-br from-blue-950/30 to-indigo-950/30 hover:border-blue-700/70 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div className="px-3 py-1 bg-blue-500/20 rounded-full">
                <span className="text-xs font-semibold text-blue-300">PARA TU NEGOCIO</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Financiamiento Empresarial</CardTitle>
            <CardDescription className="text-base">
              Capital para hacer crecer tu compañía de construcción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-gray-300">
                Accede a préstamos comerciales, líneas de crédito y financiamiento 
                especializado para contratistas. Ideal para:
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Comprar equipos y maquinaria nueva
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Expandir tu operación o contratar más personal
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Capital de trabajo para proyectos grandes
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Consolidar deudas o mejorar flujo de efectivo
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-950/30 rounded-lg p-3 border border-blue-900/30">
                <p className="text-xs text-gray-400 mb-1">Monto</p>
                <p className="text-lg font-bold text-white">$10K - $500K</p>
              </div>
              <div className="bg-blue-950/30 rounded-lg p-3 border border-blue-900/30">
                <p className="text-xs text-gray-400 mb-1">Aprobación</p>
                <p className="text-lg font-bold text-white">24-48 horas</p>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-12"
              onClick={() => window.open("https://apply.0wlfunding.com/", "_blank")}
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Aplicar Ahora
            </Button>

            <p className="text-xs text-center text-gray-500">
              Proceso rápido y seguro • Sin afectar tu crédito inicialmente
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Financiamiento para tus Clientes */}
        <Card className="border-green-900/50 bg-gradient-to-br from-green-950/30 to-emerald-950/30 hover:border-green-700/70 transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div className="px-3 py-1 bg-green-500/20 rounded-full">
                <span className="text-xs font-semibold text-green-300">PARA TUS CLIENTES</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Ofrece Financiamiento</CardTitle>
            <CardDescription className="text-base">
              Ayuda a tus clientes a financiar sus proyectos y cierra más contratos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-gray-300">
                Comparte este link con tus clientes para que puedan pre-calificarse 
                para financiamiento de su proyecto en minutos:
              </p>
              
              {/* Link personalizado */}
              <div className="bg-green-950/30 rounded-lg p-4 border border-green-900/30">
                <p className="text-xs text-gray-400 mb-2">Tu link personalizado:</p>
                <div className="flex items-center gap-2 bg-black/30 rounded px-3 py-2 mb-3">
                  <code className="text-sm text-green-400 flex-1 truncate">
                    {personalizedLink}
                  </code>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-green-700 hover:bg-green-900/30 text-green-300"
                    onClick={handleCopyLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-green-700 hover:bg-green-900/30 text-green-300"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartir
                  </Button>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  Pre-calificación instantánea sin afectar crédito
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  Múltiples opciones de lenders y tasas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  Proceso 100% online y seguro
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  Aprobación en 24 horas o menos
                </li>
              </ul>
            </div>

            <div className="bg-green-950/30 rounded-lg p-3 border border-green-900/30">
              <p className="text-xs text-gray-400 mb-1">Proyectos desde</p>
              <p className="text-lg font-bold text-white">$1,000 hasta $100,000</p>
            </div>

            <Button
              variant="outline"
              className="w-full border-green-700 hover:bg-green-900/30 text-green-300 h-12"
              onClick={() => window.open("https://www.acornfinance.com/pre-qualify/?d=8VXLJ", "_blank")}
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Ver Experiencia del Cliente
            </Button>

            <p className="text-xs text-center text-gray-500">
              Tus clientes verán opciones personalizadas • Sin compromiso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info adicional */}
      <div className="max-w-6xl mx-auto mt-12">
        <Card className="border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-950/50">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <h3 className="font-semibold text-white mb-1">Sin Costo para Ti</h3>
                <p className="text-sm text-gray-400">
                  No pagas nada por ofrecer financiamiento a tus clientes
                </p>
              </div>
              <div>
                <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <h3 className="font-semibold text-white mb-1">Proceso Rápido</h3>
                <p className="text-sm text-gray-400">
                  Tus clientes obtienen respuesta en minutos, no días
                </p>
              </div>
              <div>
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                <h3 className="font-semibold text-white mb-1">Más Contratos</h3>
                <p className="text-sm text-gray-400">
                  Convierte más estimates en proyectos firmados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacto */}
      <div className="max-w-6xl mx-auto mt-8 text-center">
        <p className="text-gray-400 text-sm">
          ¿Preguntas sobre financiamiento? Contáctanos:{" "}
          <a href="mailto:info@0wlfunding.com" className="text-cyan-400 hover:text-cyan-300">
            info@0wlfunding.com
          </a>
          {" "}o{" "}
          <a href="tel:+12025493519" className="text-cyan-400 hover:text-cyan-300">
            (202) 549-3519
          </a>
        </p>
      </div>
    </div>
  );
}
