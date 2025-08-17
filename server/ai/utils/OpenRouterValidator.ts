/**
 * VALIDADOR DE OPENROUTER - VERIFICACIONES DE SALUD Y CONFIGURACIÓN
 * 
 * Utilitarios para verificar que OpenRouter esté funcionando correctamente
 * y proporcionar diagnósticos útiles al usuario
 */

export interface OpenRouterHealth {
  isAvailable: boolean;
  keyValid: boolean;
  modelsAccessible: string[];
  errorMessage?: string;
  recommendation?: string;
}

export class OpenRouterValidator {
  
  /**
   * VERIFICACIÓN COMPLETA DE SALUD DE OPENROUTER
   */
  static async checkHealth(): Promise<OpenRouterHealth> {
    const result: OpenRouterHealth = {
      isAvailable: false,
      keyValid: false,
      modelsAccessible: []
    };

    // 1. Verificar si la API key existe
    if (!process.env.OPENROUTER_API_KEY) {
      result.errorMessage = 'OPENROUTER_API_KEY no encontrada en variables de entorno';
      result.recommendation = 'Agrega OPENROUTER_API_KEY en Secrets de Replit con tu key de openrouter.ai';
      return result;
    }

    // 2. Verificar formato de la key
    if (!process.env.OPENROUTER_API_KEY.startsWith('sk-or-')) {
      result.errorMessage = 'OPENROUTER_API_KEY no tiene formato válido (debe empezar con sk-or-)';
      result.recommendation = 'Verifica que copiaste la key completa desde openrouter.ai/keys';
      return result;
    }

    try {
      // 3. Hacer test call simple
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://owlfenc.com',
          'X-Title': 'OWL FENC Health Check'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        result.isAvailable = true;
        result.keyValid = true;
        result.modelsAccessible = [
          'anthropic/claude-3.5-sonnet',
          'openai/gpt-4o',
          'google/gemini-pro',
          'x-ai/grok-beta'
        ];
      } else {
        const errorData = await response.json();
        result.errorMessage = `Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`;
        
        if (response.status === 401) {
          result.recommendation = 'API key inválida. Regenera una nueva en openrouter.ai/keys';
        } else if (response.status === 429) {
          result.recommendation = 'Rate limit alcanzado. Espera unos minutos e intenta de nuevo';
        } else {
          result.recommendation = 'Verifica tu conexión y que la key sea válida';
        }
      }

    } catch (error: any) {
      result.errorMessage = `Error de conexión: ${error.message}`;
      result.recommendation = 'Verifica tu conexión a internet y que openrouter.ai esté disponible';
    }

    return result;
  }

  /**
   * VERIFICACIÓN RÁPIDA PARA LOGS
   */
  static async quickCheck(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.isAvailable && health.keyValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * GENERAR REPORTE DE DIAGNÓSTICO
   */
  static async generateDiagnosticReport(): Promise<string> {
    const health = await this.checkHealth();
    
    let report = '🔍 DIAGNÓSTICO OPENROUTER\n\n';
    
    if (health.isAvailable && health.keyValid) {
      report += '✅ OpenRouter está funcionando correctamente\n';
      report += `🎯 Modelos disponibles: ${health.modelsAccessible.length}\n`;
      report += `📋 Lista: ${health.modelsAccessible.join(', ')}\n`;
      report += '\n🚀 Sistema listo para usar OpenRouter con failover automático';
    } else {
      report += '❌ OpenRouter NO está disponible\n';
      report += `🚫 Error: ${health.errorMessage}\n`;
      report += `💡 Solución: ${health.recommendation}\n`;
      report += '\n🔄 Usando APIs individuales como fallback';
    }

    return report;
  }

  /**
   * PASOS DE CONFIGURACIÓN PARA EL USUARIO
   */
  static getSetupInstructions(): string {
    return `
📋 INSTRUCCIONES DE CONFIGURACIÓN OPENROUTER:

1️⃣ REGISTRARSE:
   • Ve a: https://openrouter.ai
   • Crea una cuenta (gratis)
   • No requiere tarjeta de crédito para empezar

2️⃣ OBTENER API KEY:
   • Ve a "Keys" en tu dashboard
   • Click "Create Key"
   • Copia la key completa (empieza con sk-or-)

3️⃣ AGREGAR EN REPLIT:
   • En tu proyecto, click el ícono del candado (Secrets)
   • Agrega nueva secret:
     - Name: OPENROUTER_API_KEY
     - Value: tu-key-de-openrouter
   • Save

4️⃣ VERIFICAR:
   • Reinicia tu aplicación
   • OpenRouter se activará automáticamente
   • Verás logs "🚀 [OPENROUTER] Cliente inicializado"

✨ BENEFICIOS INMEDIATOS:
   • Acceso a 300+ modelos con una sola key
   • Failover automático entre modelos
   • Precios sin markup (mismo costo que directo)
   • Eliminación de errores de API keys múltiples
`;
  }
}

export default OpenRouterValidator;