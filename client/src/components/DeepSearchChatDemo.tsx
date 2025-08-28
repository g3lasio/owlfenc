/**
 * DEMO COMPONENT - DEEPSEARCH CHAT INTERACTIVO
 * 
 * Este es un componente demo simplificado que muestra cómo funciona
 * el sistema de chat interactivo con DeepSearch para refinamiento
 * en tiempo real de estimados.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, DollarSign, Package, Zap, CheckCircle2 } from 'lucide-react';

interface DemoResult {
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  labor: Array<{
    category: string;
    hours: number;
    rate: number;
    total: number;
  }>;
  totalMaterials: number;
  totalLabor: number;
  grandTotal: number;
}

export function DeepSearchChatDemo() {
  const [currentResult, setCurrentResult] = useState<DemoResult>({
    materials: [
      { name: "Postes de 4x4x8", quantity: 20, unit: "pcs", price: 15.50, total: 310.00 },
      { name: "Tablas de cercado", quantity: 150, unit: "ft", price: 3.25, total: 487.50 },
      { name: "Concreto premezclado", quantity: 15, unit: "bags", price: 8.75, total: 131.25 },
      { name: "Tornillos y hardware", quantity: 1, unit: "set", price: 85.00, total: 85.00 }
    ],
    labor: [
      { category: "Excavación", hours: 8, rate: 35.00, total: 280.00 },
      { category: "Instalación de postes", hours: 12, rate: 40.00, total: 480.00 },
      { category: "Instalación de cercado", hours: 16, rate: 35.00, total: 560.00 }
    ],
    totalMaterials: 1013.75,
    totalLabor: 1320.00,
    grandTotal: 2333.75
  });

  const [chatMessages, setChatMessages] = useState([
    "✅ **Estimado inicial completado**\n\n📊 **Resumen:**\n• 4 materiales por $1,013.75\n• 3 servicios de labor por $1,320.00\n• **Total: $2,333.75**\n\n¿Qué te gustaría ajustar?"
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  // Simulaciones de refinamiento
  const handleDemoRefinement = async (action: string) => {
    setIsProcessing(true);
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let newMessage = "";
    let newResult = { ...currentResult };

    switch (action) {
      case 'reduce_labor':
        newResult.labor = newResult.labor.map(l => ({
          ...l,
          rate: l.rate * 0.85,
          total: l.hours * (l.rate * 0.85)
        }));
        newResult.totalLabor = newResult.labor.reduce((sum, l) => sum + l.total, 0);
        newResult.grandTotal = newResult.totalMaterials + newResult.totalLabor;
        
        newMessage = "✅ **Precios de labor reducidos 15%**\n\n💰 **Nuevo total de labor:** $" + newResult.totalLabor.toFixed(2) + "\n📊 **Nuevo total del proyecto:** $" + newResult.grandTotal.toFixed(2) + "\n\n¡Los precios ahora son más competitivos para tu zona!";
        break;
        
      case 'add_material':
        newResult.materials.push({
          name: "Protector de madera",
          quantity: 2,
          unit: "gal",
          price: 45.00,
          total: 90.00
        });
        newResult.totalMaterials += 90.00;
        newResult.grandTotal = newResult.totalMaterials + newResult.totalLabor;
        
        newMessage = "✅ **Material agregado exitosamente**\n\n📦 **Nuevo material:** Protector de madera (2 gal)\n💰 **Costo adicional:** $90.00\n📊 **Nuevo total:** $" + newResult.grandTotal.toFixed(2) + "\n\nEste protector ayudará a extender la vida útil de la cerca.";
        break;
        
      case 'location_adjust':
        // Ajustar por ubicación específica
        newResult.materials = newResult.materials.map(m => ({
          ...m,
          price: m.price * 0.92,
          total: m.quantity * (m.price * 0.92)
        }));
        newResult.totalMaterials = newResult.materials.reduce((sum, m) => sum + m.total, 0);
        newResult.grandTotal = newResult.totalMaterials + newResult.totalLabor;
        
        newMessage = "✅ **Precios ajustados para tu ubicación**\n\n📍 **Ubicación:** Texas (precios locales aplicados)\n💰 **Ahorro en materiales:** 8%\n📊 **Nuevo total:** $" + newResult.grandTotal.toFixed(2) + "\n\nLos precios ahora reflejan el mercado local de Texas.";
        break;
        
      default:
        newMessage = "🤔 **Procesando tu solicitud personalizada...**\n\nHe analizado tu solicitud y aplicado los ajustes correspondientes. ¿Hay algo más específico que quieras modificar?";
    }

    setChatMessages(prev => [...prev, newMessage]);
    setCurrentResult(newResult);
    setIsProcessing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          DeepSearch Chat Interactivo - Demo
        </h1>
        <p className="text-slate-600">
          Experimenta cómo los contratistas pueden refinar sus estimados en tiempo real
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Chat Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              Chat de Refinamiento IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mensajes del chat */}
            <div className="bg-slate-50 rounded-lg p-4 h-64 overflow-y-auto space-y-3">
              {chatMessages.map((message, index) => (
                <div key={index} className="bg-white rounded-lg p-3 shadow-sm border">
                  <div className="whitespace-pre-wrap text-sm">
                    {message.split('\n').map((line, lineIndex) => (
                      <div key={lineIndex}>
                        {line.includes('**') ? (
                          <>
                            {line.split('**').map((part, partIndex) => 
                              partIndex % 2 === 0 ? part : <strong key={partIndex}>{part}</strong>
                            )}
                          </>
                        ) : (
                          line
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-700">Analizando y aplicando cambios...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción demo */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Prueba estas solicitudes comunes:</p>
              
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => handleDemoRefinement('reduce_labor')}
                  disabled={isProcessing}
                  variant="outline"
                  className="justify-start text-left h-auto p-3"
                >
                  <DollarSign className="mr-2 h-4 w-4 text-orange-600" />
                  <div>
                    <div className="font-medium">Reducir costos de labor</div>
                    <div className="text-xs text-slate-500">"Los precios de labor parecen altos para mi zona"</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleDemoRefinement('add_material')}
                  disabled={isProcessing}
                  variant="outline"
                  className="justify-start text-left h-auto p-3"
                >
                  <Package className="mr-2 h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">Agregar material faltante</div>
                    <div className="text-xs text-slate-500">"Falta incluir protector de madera"</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleDemoRefinement('location_adjust')}
                  disabled={isProcessing}
                  variant="outline"
                  className="justify-start text-left h-auto p-3"
                >
                  <Zap className="mr-2 h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">Ajustar por ubicación</div>
                    <div className="text-xs text-slate-500">"Verificar precios para Texas"</div>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Estimado Actual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Estimado Actual
              <Badge className="bg-green-100 text-green-800">En Vivo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Materiales */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <Package className="h-4 w-4" />
                Materiales ({currentResult.materials.length})
              </h4>
              <div className="space-y-1 text-sm">
                {currentResult.materials.map((material, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{material.name}</span>
                    <span className="font-medium">{formatCurrency(material.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Subtotal Materiales:</span>
                  <span>{formatCurrency(currentResult.totalMaterials)}</span>
                </div>
              </div>
            </div>

            {/* Labor */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Labor ({currentResult.labor.length})
              </h4>
              <div className="space-y-1 text-sm">
                {currentResult.labor.map((labor, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{labor.category}</span>
                    <span className="font-medium">{formatCurrency(labor.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Subtotal Labor:</span>
                  <span>{formatCurrency(currentResult.totalLabor)}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total del Proyecto:</span>
                <span className="font-bold text-2xl text-green-600">
                  {formatCurrency(currentResult.grandTotal)}
                </span>
              </div>
            </div>

            {/* Información adicional */}
            <div className="text-xs text-slate-500 space-y-1">
              <div>• Estimado generado con IA DeepSearch</div>
              <div>• Precios actualizados en tiempo real</div>
              <div>• Ajustado para ubicación específica</div>
              <div>• Confianza: 94% (Muy Alta)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Características del sistema */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-center">Características del Sistema DeepSearch Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <MessageCircle className="h-8 w-8 text-purple-600 mx-auto" />
              <h4 className="font-medium">Chat Conversacional</h4>
              <p className="text-sm text-slate-600">
                Refinamiento natural mediante conversación con IA especializada
              </p>
            </div>
            
            <div className="space-y-2">
              <Zap className="h-8 w-8 text-blue-600 mx-auto" />
              <h4 className="font-medium">Tiempo Real</h4>
              <p className="text-sm text-slate-600">
                Cambios instantáneos aplicados al estimado conforme conversas
              </p>
            </div>
            
            <div className="space-y-2">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
              <h4 className="font-medium">Inteligencia Contextual</h4>
              <p className="text-sm text-slate-600">
                Entiende ubicación, tipo de proyecto y preferencias específicas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}