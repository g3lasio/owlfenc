/**
 * LeadPrime CRM Preview Modal
 * Modal informativo que muestra las capacidades de LeadPrime CRM
 * Mantiene el estilo visual futurista de Owl Fenc
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Zap, 
  Bot, 
  MessageSquare, 
  Phone, 
  Link2, 
  Settings,
  Sparkles,
  TrendingUp
} from "lucide-react";

interface LeadPrimePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadPrimePreviewModal: React.FC<LeadPrimePreviewModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const features = [
    {
      icon: <TrendingUp className="h-5 w-5 text-cyan-400" />,
      title: "Pipeline Visual con Kanban",
      description: "Organiza tus leads en: New, Contacted, Hot, Follow-Up, Lost"
    },
    {
      icon: <Bot className="h-5 w-5 text-purple-400" />,
      title: "AI Assistant (Kendra)",
      description: "Asistente con voz que responde llamadas, envía mensajes y hace seguimiento automático"
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-blue-400" />,
      title: "Sistema de Mensajería",
      description: "Comunicación directa con leads desde la plataforma"
    },
    {
      icon: <Phone className="h-5 w-5 text-green-400" />,
      title: "Phone System Integration",
      description: "Sistema telefónico integrado para llamadas entrantes y salientes"
    },
    {
      icon: <Link2 className="h-5 w-5 text-orange-400" />,
      title: "Integraciones Multi-Canal",
      description: "Meta Ads, Microsoft Ads, Web Forms, Email (Outlook)"
    },
    {
      icon: <Settings className="h-5 w-5 text-gray-400" />,
      title: "Agent Connector (MCP)",
      description: "Permite que agentes AI como Manus envíen leads directamente a tu CRM"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950 text-white border-2 border-cyan-400/30 shadow-2xl shadow-cyan-400/20 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="relative">
              <img 
                src="/assets/leadprime/logo.png" 
                alt="LeadPrime Logo" 
                className="h-10 w-10 object-contain animate-pulse"
              />
              <div className="absolute inset-0 h-10 w-10 blur-md opacity-30">
                <img 
                  src="/assets/leadprime/logo.png" 
                  alt="LeadPrime Logo Glow" 
                  className="h-10 w-10 object-contain"
                />
              </div>
            </div>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              LeadPrime CRM
            </span>
            <Badge 
              variant="secondary" 
              className="ml-2 bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-semibold px-3 py-1 shadow-lg shadow-cyan-400/50"
            >
              <Sparkles className="h-3 w-3 mr-1 inline" />
              Integrado
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Descripción principal */}
          <div className="relative p-4 rounded-lg bg-gradient-to-r from-cyan-400/10 to-blue-400/10 border border-cyan-400/30">
            <p className="text-gray-200 leading-relaxed">
              Gestión inteligente de leads con automatización AI y comunicación multi-canal. 
              Captura, organiza y convierte leads en clientes de manera eficiente.
            </p>
          </div>

          {/* Grid de características */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/20 hover:scale-[1.02]"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/0 via-cyan-400/0 to-blue-400/0 group-hover:from-cyan-400/5 group-hover:via-transparent group-hover:to-blue-400/5 rounded-lg transition-all duration-300" />
                
                <div className="relative flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 group-hover:border-cyan-400/30 transition-colors">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nota sobre el beneficio del 30% */}
          <div className="relative mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-400/30">
            <p className="text-xs text-gray-300 text-center leading-relaxed">
              <span className="text-purple-300 font-semibold">Beneficio exclusivo:</span> Usuarios de planes <span className="text-cyan-300 font-medium">Mero Patrón</span> y <span className="text-cyan-300 font-medium">Master Contractor</span> reciben <span className="text-purple-300 font-semibold">30% de descuento</span> en la suscripción de LeadPrime.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-6">
            <Button 
              onClick={() => window.open('https://leadprime.chyrris.com/', '_blank')}
              className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-400 text-black hover:from-cyan-300 hover:to-blue-300 font-semibold shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50 transition-all duration-300 hover:scale-[1.02]"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir LeadPrime CRM
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="border-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-cyan-400/50 hover:text-cyan-400 transition-all duration-300"
            >
              Cerrar
            </Button>
          </div>
        </div>

        {/* Efecto de escaneo futurista */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-scan" />
      </DialogContent>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scan {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }

        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #00ffff 0%, #0080ff 100%);
          border-radius: 4px;
          transition: background 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #00ffff 0%, #00ccff 100%);
        }
      `}</style>
    </Dialog>
  );
};
