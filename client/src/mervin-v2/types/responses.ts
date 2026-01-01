/**
 * Mervin V2 - Shared Response Types
 * 
 * Este archivo define las interfaces compartidas entre el backend (Auto-Discovery)
 * y el frontend para asegurar consistencia en la comunicación.
 * Estas interfaces están basadas en la `EnrichedResponse` del `UniversalAPIExecutor`.
 */

// 1. Botones de Acción (para ejecutar herramientas dinámicas)
export interface ActionButton {
  label: string; // Texto del botón (e.g., "Generar PDF")
  action: string; // Nombre de la herramienta a ejecutar (e.g., "generate_pdf")
  params?: Record<string, any>; // Parámetros para la herramienta
  style?: 'primary' | 'secondary' | 'danger'; // Estilo del botón
}

// 2. Botones de Opciones (para selección del usuario)
export interface OptionButton {
  text: string; // Texto de la opción
  value: any; // Valor que se enviará al backend
  clickable: boolean; // Si la opción es clickeable
}

// 3. Links Estructurados
export interface Link {
  url: string; // URL del link
  label: string; // Texto a mostrar
  external?: boolean; // Si se debe abrir en nueva pestaña
}

// 4. Adjuntos (PDFs, imágenes, etc.)
export interface Attachment {
  type: 'pdf' | 'image' | 'document'; // Tipo de adjunto
  url: string; // URL para ver o descargar
  filename: string; // Nombre del archivo
}

/**
 * 5. EnrichedResponse - La estructura principal de respuesta del backend
 * 
 * Esta es la interfaz que el `UniversalAPIExecutor` del backend envía.
 * El frontend debe ser capaz de recibir y renderizar esta estructura.
 */
export interface EnrichedResponse {
  content: string; // Contenido principal del mensaje en Markdown
  actions?: ActionButton[]; // Botones para ejecutar acciones
  options?: OptionButton[]; // Opciones para que el usuario elija
  links?: Link[]; // Lista de links importantes
  attachments?: Attachment[]; // Archivos adjuntos
  metadata?: Record<string, any>; // Metadatos (ID de workflow, etc.)
}

/**
 * 6. Message - La interfaz que usa el frontend para renderizar mensajes
 * 
 * Extiende EnrichedResponse y añade campos específicos del frontend como `id` y `sender`.
 */
export interface Message extends Partial<EnrichedResponse> {
  id: string; // ID único del mensaje
  sender: 'user' | 'assistant'; // Quién envió el mensaje
  content: string; // Se sobreescribe para que no sea opcional
  isTyping?: boolean; // Para el efecto de escritura
}
