/**
 * Estimate Wizard Chat Page
 * 
 * Página que contiene el asistente conversacional para automatizar
 * el flujo del Estimate Wizard paso a paso.
 */

import React from 'react';
import EstimateWizardChatAgent from '@/components/chat/EstimateWizardChatAgent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, FileText, MessageSquare } from 'lucide-react';

export default function EstimateWizardChat() {
  return (
    <div className="container mx-auto p-4 h-screen max-h-screen flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Estimate Wizard</h1>
            <p className="text-muted-foreground">
              Asistente inteligente que te guía paso a paso para crear estimados profesionales con PDF descargable
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="text-sm">
              <div className="font-medium">Chat Conversacional</div>
              <div className="text-muted-foreground">Guía paso a paso automática</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <FileText className="w-5 h-5 text-green-600" />
            <div className="text-sm">
              <div className="font-medium">AI Material Search</div>
              <div className="text-muted-foreground">Búsqueda inteligente de materiales</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Bot className="w-5 h-5 text-blue-600" />
            <div className="text-sm">
              <div className="font-medium">PDF Automático</div>
              <div className="text-muted-foreground">Generación y descarga instantánea</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Asistente de Estimados</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          <EstimateWizardChatAgent />
        </CardContent>
      </Card>
    </div>
  );
}