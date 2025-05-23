/**
 * Utilidad para cargar plantillas HTML desde el servicio centralizado
 */
import { getTemplateHTML } from './templateService';

/**
 * Carga una plantilla HTML basada en el estilo seleccionado
 * @param templateStyle - Estilo de la plantilla a cargar ('standard', 'professional', 'luxury')
 * @returns Contenido HTML de la plantilla
 */
export async function loadTemplateHTML(templateStyle: string = 'standard'): Promise<string> {
  try {
    console.log(`Cargando plantilla para el estilo: ${templateStyle}`);

    // Obtener el template directamente del servicio centralizado
    const templateContent = getTemplateHTML(templateStyle);

    if (templateContent) {
      console.log(`Plantilla "${templateStyle}" cargada exitosamente, tamaño: ${templateContent.length} bytes`);
      return templateContent;
    } else {
      console.warn(`No se pudo cargar la plantilla "${templateStyle}". Usando plantilla estándar.`);
      return getTemplateHTML('standard');
    }
  } catch (error) {
    console.error('Error al cargar la plantilla:', error);
    // Usar plantilla estándar en caso de error
    return getTemplateHTML('standard');
  }
}