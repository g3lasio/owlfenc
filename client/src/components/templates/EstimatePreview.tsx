import { useEffect, useRef, useState } from "react";

interface EstimatePreviewProps {
  html: string;
}

export default function EstimatePreview({ html }: EstimatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLogError, setHasLogError] = useState(false);
  
  useEffect(() => {
    // Asegurarse de que el contenedor existe y que hay HTML para mostrar
    if (containerRef.current && html) {
      // Iniciar carga
      setIsLoading(true);
      setHasLogError(false);
      
      // Limpiar cualquier contenido previo
      containerRef.current.innerHTML = '';
      
      // Crear un contenedor para el HTML del estimado
      const previewContainer = document.createElement('div');
      previewContainer.innerHTML = html;
      previewContainer.style.width = '100%';
      previewContainer.style.height = '100%';
      previewContainer.style.overflow = 'auto';
      previewContainer.style.padding = '20px';
      previewContainer.style.backgroundColor = 'white';
      previewContainer.style.border = '1px solid #ddd';
      previewContainer.style.borderRadius = '8px';
      previewContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      
      // Agregar clases CSS para mayor estilo
      previewContainer.className = 'estimate-preview-inner';
      
      // Manejar la carga de imágenes
      const images = previewContainer.querySelectorAll('img');
      console.log(`Encontradas ${images.length} imágenes en el HTML del estimado`);
      
      // Verificar si hay imágenes en el HTML
      if (images.length > 0) {
        // Añadir event listeners a todas las imágenes
        images.forEach((img) => {
          // Cuando una imagen se carga exitosamente
          img.addEventListener('load', () => {
            console.log(`Imagen cargada correctamente: ${img.src}`);
          });
          
          // Cuando hay un error al cargar una imagen
          img.addEventListener('error', (e) => {
            console.warn(`Error al cargar imagen: ${img.src}`, e);
            setHasLogError(true);
            
            // Intentar cargar el logo local como respaldo
            if (img.alt.includes('Logo')) {
              console.log('Intentando cargar logo alternativo...');
              img.src = '/owl-logo.png';
            }
          });
        });
      }
      
      // Insertar el contenedor en el DOM
      containerRef.current.appendChild(previewContainer);
      
      // Completar carga
      setIsLoading(false);
    }
  }, [html]);
  
  return (
    <div 
      ref={containerRef} 
      className="estimate-preview-container"
      style={{
        width: '100%',
        minHeight: '500px',
        margin: '0 auto',
        padding: '20px 0',
      }}
    >
      {!html && (
        <div className="empty-preview-message" style={{ textAlign: 'center', padding: '100px 0' }}>
          <p>No hay contenido para previsualizar. Genera un estimado primero.</p>
        </div>
      )}
    </div>
  );
}
