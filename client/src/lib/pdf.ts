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
    // Mostrar un mensaje de carga mientras se procesa
    console.log('Generando PDF...');
    
    // Crear un FormData para enviar el HTML al servidor
    const formData = new FormData();
    formData.append('html', html);
    formData.append('filename', `${fileName}.pdf`);
    
    console.log('Enviando solicitud a /api/pdf/generate...');
    
    // Llamar al endpoint del servidor para generar el PDF
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      body: formData,
    });
    
    console.log('Respuesta recibida, estado:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Error desconocido';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || 'Error desconocido';
      } catch (e) {
        console.error('Error al procesar respuesta de error:', e);
      }
      throw new Error(`Error en el servidor: ${errorMessage}`);
    }
    
    // Obtener el blob del PDF
    console.log('Obteniendo blob del PDF...');
    const blob = await response.blob();
    console.log('Blob obtenido, tamaño:', blob.size);
    
    // Crear una URL para el blob
    const url = window.URL.createObjectURL(blob);
    
    // Crear un enlace invisible
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.pdf`;
    
    // Hacer clic en el enlace para descargar
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('PDF descargado con éxito');
  } catch (error) {
    console.error('Error al generar PDF:', error);
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
    // Esta función requeriría la importación de jsPDF y html2canvas
    // que actualmente no están instalados en el proyecto
    console.warn('generateClientSidePDF: Esta función no está implementada aún');
    throw new Error('Función no implementada');
  } catch (error) {
    console.error('Error al generar PDF en cliente:', error);
    throw error;
  }
}