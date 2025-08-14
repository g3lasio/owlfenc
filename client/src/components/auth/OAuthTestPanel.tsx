/**
 * 🧪 OAUTH TEST PANEL
 * Panel para probar las 3 alternativas OAuth después de 3 días
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  instantGoogleLogin, 
  instantAppleLogin, 
  popupGoogleLogin, 
  popupAppleLogin,
  iframeGoogleLogin
} from '@/lib/ultra-simple-oauth';

export default function OAuthTestPanel() {
  const [testing, setTesting] = useState<string | null>(null);
  const { toast } = useToast();

  const testMethod = async (method: string, fn: () => void | Promise<any>) => {
    setTesting(method);
    try {
      const result = await fn();
      if (result) {
        toast({
          title: "OAuth Exitoso",
          description: `${method} funcionó correctamente`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "OAuth Error",
        description: error.message,
      });
    } finally {
      setTesting(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Panel de Pruebas OAuth
          <Badge variant="outline">3 Alternativas</Badge>
        </CardTitle>
        <CardDescription>
          Después de 3 días, prueba estas alternativas completamente diferentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* ALTERNATIVA 1: Redirección Instantánea */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">🚀 Alternativa 1: Redirección Instantánea</h3>
          <p className="text-sm text-muted-foreground">
            Sin verificaciones ni complejidad. Redirección directa al proveedor OAuth.
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={() => testMethod("Google Instantáneo", instantGoogleLogin)}
              disabled={testing === "Google Instantáneo"}
              className="flex-1"
            >
              {testing === "Google Instantáneo" ? "Redirigiendo..." : "🔵 Google Instantáneo"}
            </Button>
            <Button 
              onClick={() => testMethod("Apple Instantáneo", instantAppleLogin)}
              disabled={testing === "Apple Instantáneo"}
              variant="outline"
              className="flex-1"
            >
              {testing === "Apple Instantáneo" ? "Redirigiendo..." : "🍎 Apple Instantáneo"}
            </Button>
          </div>
        </div>

        {/* ALTERNATIVA 2: Popup OAuth */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">🪟 Alternativa 2: Popup OAuth</h3>
          <p className="text-sm text-muted-foreground">
            Abre OAuth en popup y comunica resultado via postMessage. Más amigable al usuario.
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={() => testMethod("Google Popup", () => popupGoogleLogin())}
              disabled={testing === "Google Popup"}
              className="flex-1"
            >
              {testing === "Google Popup" ? "Abriendo..." : "🔵 Google Popup"}
            </Button>
            <Button 
              onClick={() => testMethod("Apple Popup", () => popupAppleLogin())}
              disabled={testing === "Apple Popup"}
              variant="outline"
              className="flex-1"
            >
              {testing === "Apple Popup" ? "Abriendo..." : "🍎 Apple Popup"}
            </Button>
          </div>
        </div>

        {/* ALTERNATIVA 3: iframe OAuth */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">🖼️ Alternativa 3: iframe OAuth</h3>
          <p className="text-sm text-muted-foreground">
            OAuth discreto en iframe invisible con comunicación postMessage.
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={() => testMethod("Google iframe", () => iframeGoogleLogin())}
              disabled={testing === "Google iframe"}
              className="flex-1"
            >
              {testing === "Google iframe" ? "Procesando..." : "🔵 Google iframe"}
            </Button>
            <Button 
              disabled
              variant="outline"
              className="flex-1"
            >
              🍎 Apple iframe (No compatible)
            </Button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">💡 Notas Importantes:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>Instantáneo:</strong> La más simple, redirección directa</li>
            <li>• <strong>Popup:</strong> Mejor experiencia, permite popups</li>
            <li>• <strong>iframe:</strong> Más discreto, pero algunos proveedores lo bloquean</li>
            <li>• Si ninguna funciona, el problema puede estar en la configuración del servidor OAuth</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}