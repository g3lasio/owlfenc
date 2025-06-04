/**
 * Página de Automatización con IA
 */

import AIAutomationPanel from '@/components/automation/AIAutomationPanel';

export default function AIAutomation() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Automatización con IA
        </h1>
        <p className="text-gray-600 text-lg">
          Deja que la inteligencia artificial configure todo tu sistema automáticamente
        </p>
      </div>
      
      <AIAutomationPanel />
    </div>
  );
}