import { getTemplateById } from './templateService';

// Definimos la plantilla Premium como predeterminada
const PREMIUM_TEMPLATE_ID = 999001;

// Cache de plantillas para no cargarlas repetidamente
const templateCache: Record<number, string> = {};

/**
 * Carga la plantilla Premium para estimados
 */
export async function loadTemplateById(templateId: number): Promise<string> {
  // Para estimados, siempre usamos la plantilla Premium

  // Si está en caché, retornarla directamente
  if (templateCache[PREMIUM_TEMPLATE_ID]) {
    return templateCache[PREMIUM_TEMPLATE_ID];
  }

  try {
    // Cargar la plantilla Premium desde los archivos estáticos
    const response = await fetch('/templates/Premiumtemplateestimate.html');
    const html = await response.text();
    templateCache[PREMIUM_TEMPLATE_ID] = html;
    return html;
  } catch (error) {
    console.error(`Error loading premium template:`, error);
    return '<div>Error loading template</div>';
  }
}

/**
 * Carga una plantilla por su nombre o ID (siempre retorna la Premium para estimados)
 */
export async function loadTemplate(templateIdOrName: number | string): Promise<string> {
  // Siempre retornamos la plantilla Premium para estimados
  return loadTemplateById(PREMIUM_TEMPLATE_ID);
}