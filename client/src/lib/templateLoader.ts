
/**
 * Utilidad para cargar plantillas HTML desde el servicio centralizado
 */
import { getTemplateHTML } from './templateService';

/**
 * Carga la plantilla HTML premium independientemente del parámetro recibido
 * @returns Contenido HTML de la plantilla premium
 */
export async function loadTemplateHTML(): Promise<string> {
  try {
    console.log('Cargando template Premium único');
    
    // Obtener el template directamente del servicio centralizado
    const templateContent = getTemplateHTML();
    
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
