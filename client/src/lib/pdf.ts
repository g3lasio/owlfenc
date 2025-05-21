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
    
    // Aplicar estilos específicos basados en el data-template del HTML
    const templateType = container.querySelector('body')?.getAttribute('data-template') || 'professional';
    console.log('Generando PDF con plantilla:', templateType);
    
    // Buscar todas las imágenes, incluyendo el logo, y prepararlas para el PDF
    const images = container.querySelectorAll('img');
    if (images.length > 0) {
      console.log(`Procesando ${images.length} imágenes para PDF...`);
      
      // Verificar si ya existe una imagen con alt="Logo"
      let hasLogo = false;
      
      // Corregir todas las imágenes para asegurar que se carguen correctamente en el PDF
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        // Agregar atributos y estilos para la carga correcta de imágenes
        img.setAttribute('crossorigin', 'anonymous');
        
        // Usar rutas absolutas para las imágenes que tienen rutas relativas
        if (img.src.startsWith('/') && !img.src.startsWith('//')) {
          const baseUrl = window.location.origin;
          img.src = baseUrl + img.src;
          console.log(`Convertida URL relativa a absoluta: ${img.src}`);
        }
        
        // Verificar si esta imagen es un logo
        if (img.alt === 'Logo') {
          hasLogo = true;
          console.log(`Imagen de logo encontrada en posición ${i}`);
          
          // Asegurarse de que el logo tenga los estilos adecuados
          img.style.maxWidth = '200px';
          img.style.maxHeight = '80px';
          img.style.objectFit = 'contain';
          
          // Mejor manejo de errores para las imágenes de logo
          img.onerror = function() {
            console.error('Error cargando logo en PDF, src:', img.src);
            // Usar una imagen base64 como respaldo
            this.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABGCAYAAAA1X+/BAAAGm0lEQVR4Xu2cW2xURRjH/7O7bUtbLm1lsagEBHn0geIlJF5iRJFoVDQ8EN80kvjkhSghEU0UQ8QHQngyIRoRNUEMD0qEaIQYNYiGFBWCj4IIAZVCuJVu2e1u9+T7znC2e87psWdnd2fm3JnkJJ3dc/lmvt/8z8x3vjPLcY1s3FLnDZ2Lw+IFiKU74RRdw8ClQpAlAVzk4vFLpH3XeVTe0PBG2wHsOTIz6/HRYueGZZuwavnMrMcPR5ZLINLdDZ6PeTEcxxn6bnLgjDOQOCmtf/VRdGJI83t7y9DqzwKH3e51yCSdZlgRBrLeUKWlW2RKpE0CnMxgdtRz4o2t+9F+VjPkC09uQMctK6RlN3JYASXYfnwxhFBzgMTDZUiYE22H4Fj/Ej7bdDDbTYVf9yRUnO1Hzfuj4OKMMKQSAEfyc9sV/P7NU2hvNBARKGTIVHAP1Rw3vwUZQiE18/sFgzZZDNprNjHb4eJ3u7IRDMmP04xxgbdfqERbVq9F7YRZ8PXXw5wKyJoZdBOK3D4EwCIZEpwZ0/8JI9oW7kYu9w8p8eY7lzDiwM+DQHzpWu8aNc7rQxjn6UcVh9dgbV//rR2DVbfD4R5YfQ3wH30KKNgP+DlCmIwgf8vkb0qXNBMiHLkTFvkx7Gwy0bRjl1H5ehU+aLyYs0EY8qMQjkdhjVqP4jXTYHxfIueFZb69IBQZX+s4P3YVJsAjAKqOA/0hFBHGrpPHO/D9+60oeaRNzgMGjHtOYcTtYK8Px8G2GYXD0HDwKnbsXYmZ09fC6J2Mg7tHY1Jt4iyxaXmg2LeLYBmVsrKyQtBkxYyPwuUF+0FZdZlDnMJa7Dy8DtpPOzG+7kag7CxgfI2hZ5qB8RPZoHMsrJgA5kFJo/uy3l50fdeFkvUkdP+CxSnXMXpMMfRCt9yvXwCRIdZMt3qPeZmE7nLBKmL19RTKa+lc7Rg7zPf1nffDl52oWNe6D91vbcT2T9t0d9seFyCTKWgNXV2e7A2eEmKpAQRCOfDmfk0cQSKuUmD7C8tGrMMzc5+CYY6C3lIH62QZvDlnUf/GclQu2o+eni57J6vwOjOpIb7IRJcPrK97cU1FIdA5Ddb5yXjjt+x3PX0YuQBxPfQTgDM+i0oFIcRG78JYDHbLUlgdZQNzxPYJWuZqzfYV83D3AzMwtqoc3J9p97+ZnHFSZnGRbg51xNYRXeRLGIVdPgzutsXfqRBHuE3WoI7qrqQACCFsIXsdEQRMH3Z3JT7UyoADhWDJ9ENWVqJXTtqZ/yCqpXRZQnGBp2wq6VQQNBGd79G5Ie7HcQHylQ1/Q9e0V87uQHfxIVRv3AfLLILHpb1F8+B1VxwTmyQV7mIJTmJ8KSHQOl9n1E51n2Uw0yZLwrDriBEEYjKP0UXAj0E9QezqcYGnSgOkuM/9KFXEQBc0eoYAwDRhnG+A2VADa9ol4E4Pxs8YBJbnf1s0AUJlFdtVugwxF1SJ6/pYHnGVw+q7GcKoQ1H5GeC51QP6kuO99F5KIJoKXdaRQR0RluCW3GDRHWpqaZc6ktucSgnEk0/7wdjftnCQPJSHR3NEGOFtWtIyOu5cZtmVEoghBc7tOsKC4BLh+qFFt2tJr5eK8GXNkZQaEl5H0sqQbJWn7D5bQxJLJKmGSB2REULOdSRdJevmfG9/3wQI39WQ8wd+XC/6Rr47k/P9ZAUEZY7NcRPsD0Fb0Xx3Is/7+wYIBm1aBxbdYOXbvr5psjzRY4YXlbSCSLPpCoiyq94jBEQZRGxmrUEoj0h1jYlGHR15HSGXObxkkUdpfnv0RIAop6iOIuswb/RVpuvw6MkAUVJHCIRYdEcXWJFCJ3ooCUFRXkeMAvlCihY5UuRF/RKCc9RIVUNQZifrrUCBE5wfwv52jmOXuHdUbbrM2YyD+JA+G0mPgHCFRUb9EQTCOXq+l/rJCYKbLwq6LNIR/3xYNOPSX0g4lDdT7qD8EpIRbTFTgLBj0NdZ7mLg4FGIJwzKd+RkJNiPKNFkCRASiJx17zcF8hKnC59c2PcAocjPYJUXpLwAoSjv+6xC+WiX5QVJRUEwrIgCyX0ZlwKiAkPqyPSXQT7FcYFBKzvOW+IKNEsYaqVHV8SUvTpCZaQD9Sy5Aqm84FdAKM9wy0NkQEZYRbXLck/IlpN/Af7V/9Lxs+dnAAAAAElFTkSuQmCC';
          };
        }
      }
      
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