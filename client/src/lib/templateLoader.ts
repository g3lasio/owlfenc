
/**
 * Utilidad para cargar plantillas HTML desde el servicio centralizado
 */
import { getTemplateHTML } from './templateService';

/**
 * Carga la plantilla HTML premium sin importar el estilo solicitado
 * @param templateStyle - Este parámetro se ignora, siempre carga el template premium
 * @returns Contenido HTML de la plantilla premium
 */
export async function loadTemplateHTML(templateStyle: string = 'standard'): Promise<string> {
  try {
    console.log(`Solicitud de plantilla "${templateStyle}" - Cargando template Premium único`);
    
    // Obtener el template directamente del servicio centralizado
    const templateContent = getTemplateHTML('professional');
    
    if (templateContent) {
      console.log(`Template premium cargado correctamente, tamaño: ${templateContent.length} bytes`);
      return templateContent;
    } else {
      throw new Error('No se pudo cargar el template premium');
    }
  } catch (error) {
    console.error('Error al cargar el template:', error);
    throw error;
  }
}
