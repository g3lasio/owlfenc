/**
 * Servicio para la generación y manejo de PDFs
 */

/**
 * Convierte HTML a PDF y lo descarga en el navegador
 * @param html El contenido HTML a convertir en PDF
 * @param fileName Nombre del archivo para descargar (sin extensión)
 */
export async function downloadHTMLAsPDF(html: string, fileName = 'documento'): Promise<void> {
  try {
    // Verificar que hay contenido HTML para generar el PDF
    if (!html || html.trim() === '') {
      throw new Error('No hay contenido HTML para generar el PDF');
    }
    
    // Crear FormData para enviar al servidor
    const formData = new FormData();
    formData.append('html', html);
    formData.append('filename', `${fileName}.pdf`);
    
    // Llamar al endpoint del servidor para generar el PDF
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al generar el PDF');
    }
    
    // Obtener el blob del PDF
    const blob = await response.blob();
    
    // Crear URL para descargar
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${fileName}.pdf`;
    
    // Añadir temporalmente a la página y simular clic
    document.body.appendChild(a);
    a.click();
    
    // Limpiar
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error descargando PDF:', error);
    throw error;
  }
}

/**
 * Convierte HTML a PDF usando jsPDF (implementación client-side)
 * Esta versión es una alternativa que se ejecuta completamente en el cliente
 * sin necesidad de llamar al servidor
 * 
 * @param html El contenido HTML a convertir a PDF
 * @param fileName Nombre del archivo para la descarga
 */
export async function generateClientSidePDF(html: string, fileName = 'documento'): Promise<void> {
  try {
    // En caso de que el servidor no esté disponible, podríamos implementar aquí
    // una solución client-side usando jsPDF y html2canvas
    
    // Por ahora, lanzamos un error para indicar que esta funcionalidad no está implementada
    throw new Error('La generación de PDF en el cliente no está implementada');
  } catch (error) {
    console.error('Error generando PDF en el cliente:', error);
    throw error;
  }
}