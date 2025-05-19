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
 * Esta versión se ejecuta completamente en el cliente
 * sin necesidad de llamar al servidor
 * 
 * @param html El contenido HTML a convertir a PDF
 * @param fileName Nombre del archivo para la descarga
 */
export async function generateClientSidePDF(html: string, fileName = 'documento'): Promise<void> {
  try {
    console.log('Iniciando generación de PDF en el cliente...');
    
    // Importar jsPDF y html2canvas dinámicamente
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);
    
    // Crear instancias
    const jsPDF = jsPDFModule.default;
    const html2canvas = html2canvasModule.default;
    
    // Crear un contenedor temporal para renderizar el HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // ~A4
    
    // Buscar todas las imágenes, incluyendo el logo, y prepararlas para el PDF
    const images = container.querySelectorAll('img');
    if (images.length > 0) {
      console.log(`Procesando ${images.length} imágenes para PDF...`);
      
      // Verificar si ya existe una imagen con alt="Logo"
      let hasLogo = false;
      
      images.forEach((img, index) => {
        // Agregar atributos y estilos para la carga correcta de imágenes
        img.setAttribute('crossorigin', 'anonymous');
        
        // Verificar si esta imagen es un logo
        if (img.alt === 'Logo') {
          hasLogo = true;
          console.log(`Imagen de logo encontrada en posición ${index}`);
          
          // Asegurarse de que el logo tenga los estilos adecuados
          img.style.maxWidth = '200px';
          img.style.maxHeight = '80px';
          img.style.objectFit = 'contain';
          
          // Hacer que si hay error en la carga, la imagen no rompa el layout
          img.onerror = function() {
            console.error('Error cargando logo en PDF, src:', img.src);
            
            // Intentar una URL alternativa si la original falla
            if (img.src.startsWith('http') && !img.src.includes('owl-logo.png')) {
              console.log('Intentando cargar logo alternativo');
              img.src = '/owl-logo.png';
            } else {
              // Si aún falla, ocultar la imagen
              this.style.display = 'none';
            }
          };
        }
      });
      
      // Si no se encontró ningún logo y debería tenerlo, intentamos añadir uno
      if (!hasLogo) {
        console.log('No se encontró logo en el HTML, intentando agregar uno por defecto');
        try {
          // Buscar un buen lugar para insertar el logo (al inicio del contenido)
          const companyInfo = container.querySelector('.company-info');
          
          if (companyInfo) {
            // Crear elemento de imagen para el logo
            const logoImg = document.createElement('img');
            logoImg.src = '/owl-logo.png';
            logoImg.alt = 'Logo';
            logoImg.className = 'company-logo';
            logoImg.setAttribute('crossorigin', 'anonymous');
            logoImg.style.maxWidth = '200px';
            logoImg.style.maxHeight = '80px';
            logoImg.style.marginBottom = '10px';
            logoImg.style.objectFit = 'contain';
            
            // Insertar al inicio del div de info de compañía
            companyInfo.insertBefore(logoImg, companyInfo.firstChild);
            console.log('Logo insertado en el contenido HTML');
          }
        } catch (logoError) {
          console.error('Error intentando añadir logo:', logoError);
        }
      }
    } else {
      console.warn('No se encontraron imágenes en el HTML para el PDF');
    }
    
    document.body.appendChild(container);

    // Crear una instancia de jsPDF
    const pdf = new jsPDF('p', 'pt', 'a4');
    
    console.log('Renderizando HTML...');
    
    // Esperar a que todas las imágenes se carguen antes de continuar
    await Promise.all(Array.from(container.querySelectorAll('img')).map(img => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(true);
        } else {
          img.onload = () => resolve(true);
          img.onerror = () => {
            console.warn('Error cargando imagen:', img.src);
            
            // Si es el logo, intentar con una URL de fallback
            if (img.alt === 'Logo' && img.src.startsWith('http')) {
              console.log('Intentando URL alternativa para el logo');
              img.src = '/owl-logo.png';
              // No resolvemos aquí, esperamos a que cargue o falle la alternativa
            } else {
              // Para cualquier otra imagen, o si ya estamos en la imagen fallback, continuar
              resolve(false);
            }
          };
        }
      });
    }));
    
    // Convertir el HTML a canvas con opciones mejoradas
    const canvas = await html2canvas(container, {
      scale: 2, // Mayor calidad
      useCORS: true,
      logging: false,
      allowTaint: true,
      imageTimeout: 5000, // Tiempo de espera más largo para imágenes
      backgroundColor: '#FFFFFF'
    });
    
    console.log('HTML renderizado, generando PDF...');
    
    // Obtener la imagen del canvas
    const imgData = canvas.toDataURL('image/png');
    
    // Establecer el tamaño de página
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calcular la altura proporcional 
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    
    // Añadir la imagen al PDF
    pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
    
    // Si el contenido es más alto que una página, agregar más páginas
    let remainingHeight = imgHeight * ratio;
    const pageHeight = pdfHeight;
    
    // Eliminar el contenedor temporal
    document.body.removeChild(container);
    
    // Guardar el PDF
    console.log('Descargando PDF...');
    pdf.save(`${fileName}.pdf`);
    
    console.log('PDF generado y descargado con éxito');
  } catch (error) {
    console.error('Error al generar PDF en cliente:', error);
    throw error;
  }
}