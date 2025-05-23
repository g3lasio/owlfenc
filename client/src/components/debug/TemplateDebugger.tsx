
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function TemplateDebugger() {
  const [results, setResults] = useState<{[key: string]: {success: boolean, size?: number, error?: string}}>(
    {}
  );
  const [loading, setLoading] = useState(false);

  const templatePaths = [
    '/templates/basictemplateestimate.html',
    '/templates/Premiumtemplateestimate.html',
    '/templates/luxurytemplate.html',
    '/static/templates/basictemplateestimate.html',
    '/static/templates/Premiumtemplateestimate.html',
    '/static/templates/luxurytemplate.html'
  ];

  const testTemplates = async () => {
    setLoading(true);
    const newResults: {[key: string]: {success: boolean, size?: number, error?: string}} = {};

    for (const path of templatePaths) {
      try {
        const response = await fetch(path, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const content = await response.text();
          newResults[path] = { 
            success: true, 
            size: content.length 
          };
        } else {
          newResults[path] = { 
            success: false, 
            error: `HTTP ${response.status}: ${response.statusText}` 
          };
        }
      } catch (error) {
        newResults[path] = { 
          success: false, 
          error: (error as Error).message 
        };
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <h2 className="text-xl font-bold">Diagnóstico de Plantillas</h2>
      
      <Button 
        variant="outline" 
        onClick={testTemplates} 
        disabled={loading}
      >
        {loading ? 'Probando...' : 'Probar todas las rutas de plantillas'}
      </Button>
      
      {Object.entries(results).length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="font-semibold text-lg">Resultados:</h3>
          
          {Object.entries(results).map(([path, result]) => (
            <Alert key={path} variant={result.success ? "default" : "destructive"}>
              <AlertTitle>{path}</AlertTitle>
              <AlertDescription>
                {result.success 
                  ? `Éxito: Archivo encontrado (${result.size} bytes)` 
                  : `Error: ${result.error}`}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
