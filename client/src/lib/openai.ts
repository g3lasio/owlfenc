
import { apiRequest } from "./queryClient";
import { contractQuestionService } from "./contractQuestionService";
// Commenting out woodFenceRules import as it's causing type issues and isn't used in this file
// import { woodFenceRules } from '../data/rules/woodfencerules.js';

// Using GPT-4 since it's the most capable model for handling Mexican slang and humor
const GPT_MODEL = "gpt-4";

const MEXICAN_STYLE_PROMPT = `Actúa como un mexicano carismático y bromista. Usa expresiones como:
- "¡Qué onda primo!"
- "¡Échale ganas!"
- "¡Está bien chingón!"
- "¡No manches!"
- "¡Órale!"
Mantén un tono amigable y casual, como si estuvieras hablando con un primo.`;

export async function generateEstimate(projectDetails: any): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/generate-estimate", {
      projectDetails,
      model: GPT_MODEL,
      systemPrompt: MEXICAN_STYLE_PROMPT
    });
    
    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error("¡Chale! Error generando el estimado:", error);
    throw error;
  }
}

// Función para formatear datos del proyecto para la generación de contrato
// Eliminada para evitar conflicto con la importación de contractGenerator

export async function generateContract(projectDetails: any): Promise<string> {
  try {
    console.log("Iniciando generación de contrato con datos:", projectDetails);
    
    // Usar directamente la API del servidor, que internamente intentará OpenAI primero
    // y luego usará el método de respaldo si es necesario
    const response = await apiRequest("POST", "/api/generate-contract", {
      projectDetails,
      model: GPT_MODEL,
      systemPrompt: MEXICAN_STYLE_PROMPT
    });
    
    const data = await response.json();
    
    if (!data.html) {
      throw new Error("La respuesta del servidor no contiene HTML para el contrato");
    }
    
    console.log("Contrato generado exitosamente");
    return data.html;
  } catch (error) {
    console.error("¡No manches! Error generando el contrato:", error);
    throw error;
  }
}

/**
 * Procesa un PDF para generar un contrato utilizando Mistral AI
 * @param pdfFile El archivo PDF a procesar
 * @returns Un objeto con los datos extraídos y el HTML del contrato
 */
export async function processPDFForContract(pdfFile: File): Promise<{
  datos_extraidos: any;
  contrato_html: string;
}> {
  try {
    // Crear el FormData para enviar el archivo
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    // Enviar la petición a la API
    const response = await fetch('/api/generar-contrato', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error procesando el PDF');
    }
    
    const data = await response.json();
    
    return {
      datos_extraidos: data.datos_extraidos,
      contrato_html: data.contrato_html,
    };
  } catch (error) {
    console.error("¡Chale! Error procesando el PDF para el contrato:", error);
    throw error;
  }
}

import { generateContractHTML } from './contractGenerator';

/**
 * Actualiza un contrato con cláusulas personalizadas o datos adicionales
 * @param datos_extraidos Datos originales extraídos del PDF
 * @param clausulas_adicionales Lista de cláusulas personalizadas a añadir
 * @param informacion_adicional Información adicional o correcciones a datos existentes
 * @returns HTML actualizado del contrato
 */
export async function actualizarContrato(
  datos_extraidos: any, 
  clausulas_adicionales?: string[],
  informacion_adicional?: any
): Promise<{
  contrato_html: string;
  datos_actualizados: any;
}> {
  try {
    console.log('Solicitando actualización de contrato con cláusulas adicionales:', clausulas_adicionales);
    
    // Primero intentamos generar el contrato localmente para una respuesta más rápida
    try {
      // Actualizamos los datos extraídos con la información adicional
      const datos_actualizados = { ...datos_extraidos };
      
      // Actualizar información del cliente si se proporciona
      if (informacion_adicional?.cliente) {
        datos_actualizados.cliente = {
          ...datos_actualizados.cliente,
          ...informacion_adicional.cliente
        };
      }
      
      // Actualizar información del contratista si se proporciona
      if (informacion_adicional?.contratista) {
        datos_actualizados.contratista = {
          ...datos_actualizados.contratista,
          ...informacion_adicional.contratista
        };
      }
      
      // Actualizar información del proyecto si se proporciona
      if (informacion_adicional?.proyecto) {
        datos_actualizados.proyecto = {
          ...datos_actualizados.proyecto,
          ...informacion_adicional.proyecto
        };
      }
      
      // Actualizar información del presupuesto si se proporciona
      if (informacion_adicional?.presupuesto) {
        datos_actualizados.presupuesto = {
          ...datos_actualizados.presupuesto,
          ...informacion_adicional.presupuesto
        };
      }
      
      // Añadir cláusulas adicionales si se proporcionan
      if (clausulas_adicionales && clausulas_adicionales.length > 0) {
        datos_actualizados.clausulasAdicionales = [
          ...(datos_actualizados.clausulasAdicionales || []),
          ...clausulas_adicionales
        ];
      }
      
      // Generar el contrato usando la API del servidor 
      // que utilizará OpenAI o el mecanismo de respaldo según sea necesario
      const response = await apiRequest("POST", "/api/generate-contract", {
        projectDetails: datos_actualizados,
        model: GPT_MODEL,
        systemPrompt: MEXICAN_STYLE_PROMPT
      });
      
      const data = await response.json();
      const html = data.html;
      
      return {
        contrato_html: html,
        datos_actualizados: datos_actualizados
      };
    } catch (localError) {
      console.warn('Error generando contrato localmente, usando API como fallback:', localError);
      
      // Si falla la generación local, usamos la API como fallback
      const response = await fetch('/api/ajustar-contrato', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datos_extraidos,
          clausulas_adicionales,
          informacion_adicional
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error ajustando el contrato');
      }
      
      const data = await response.json();
      
      return {
        contrato_html: data.contrato_html,
        datos_actualizados: data.datos_actualizados
      };
    }
  } catch (error) {
    console.error("¡Órale! Error actualizando el contrato:", error);
    throw error;
  }
}

/**
 * Enumeración para identificar el modo/contexto actual del asistente
 */
enum MervinMode {
  CONTRACT = 'contract',      // Modo de generación de contratos
  ESTIMATE = 'estimate',      // Modo de generación de estimados
  OWNERSHIP = 'ownership',    // Modo de verificación de propiedad
  PERMITS = 'permits',        // Modo de asesor de permisos
  GENERAL = 'general'         // Modo general/conversacional
}

/**
 * Función para detectar comandos de cambio de modo/contexto
 * @param message Mensaje del usuario
 * @returns El modo detectado o null si no se detecta ningún cambio
 */
function detectModeChange(message: string): MervinMode | null {
  // Normalizar mensaje para facilitar detección
  const normalizedMsg = message.toLowerCase();
  
  // Detectar comandos de cambio a modo contrato
  if (normalizedMsg.includes('generar contrato') || 
      normalizedMsg.includes('crear contrato') || 
      normalizedMsg.includes('hacer contrato') ||
      normalizedMsg.includes('elaborar contrato')) {
    return MervinMode.CONTRACT;
  }
  
  // Detectar comandos de cambio a modo estimado
  if (normalizedMsg.includes('generar estimado') || 
      normalizedMsg.includes('crear estimado') || 
      normalizedMsg.includes('hacer estimado') ||
      normalizedMsg.includes('crear presupuesto')) {
    return MervinMode.ESTIMATE;
  }
  
  // Detectar comandos de cambio a modo verificación de propiedad
  if (normalizedMsg.includes('verificar propiedad') || 
      normalizedMsg.includes('verificar dueño') || 
      normalizedMsg.includes('verificar propietario') ||
      normalizedMsg.includes('ownership') ||
      normalizedMsg.includes('verificación de propiedad')) {
    return MervinMode.OWNERSHIP;
  }
  
  // Detectar comandos de cambio a modo asesor de permisos
  if (normalizedMsg.includes('asesor de permisos') || 
      normalizedMsg.includes('verificar permisos') || 
      normalizedMsg.includes('consultar permisos') ||
      normalizedMsg.includes('permisos de construcción')) {
    return MervinMode.PERMITS;
  }
  
  return null;
}

/**
 * Función para analizar el texto en busca de información de la compañía
 * @param message Mensaje del usuario
 * @returns Información de la compañía extraída o null
 */
function extractCompanyInfo(message: string) {
  let companyInfo: any = {};
  
  // Buscar nombre de compañía
  const companyNameRegex = /[Cc]ompañ[ií]a(?:\s+que\s+es|\s+es)?:?\s*([^,\.;]+)|[Cc]ompany(?:\s+que\s+es|\s+es)?:?\s*([^,\.;]+)/;
  const companyNameMatch = message.match(companyNameRegex);
  
  if (companyNameMatch) {
    companyInfo.nombre = (companyNameMatch[1] || companyNameMatch[2]).trim();
  }
  
  // Buscar dirección
  const addressRegex = /[Dd]irecci[oó]n:?\s*([^\.;]+)|[Aa]ddress:?\s*([^\.;]+)/;
  const addressMatch = message.match(addressRegex);
  
  if (addressMatch) {
    companyInfo.direccion = (addressMatch[1] || addressMatch[2]).trim();
  }
  
  return Object.keys(companyInfo).length > 0 ? { contratista: companyInfo } : null;
}

/**
 * Función para analizar los campos requeridos basado en el template del contrato
 * @param datos Los datos actuales recopilados
 * @returns Objeto con información sobre los campos requeridos
 */
function analizarCamposContrato(datos: any): { 
  faltantes: string[]; 
  completos: string[]; 
  opcional: string[];
  porcentajeCompletado: number;
} {
  const camposFaltantes: string[] = [];
  const camposCompletos: string[] = [];
  const camposOpcionales: string[] = ['cliente.telefono', 'cliente.email', 'proyecto.estilo'];
  
  // 1. CAMPOS OBLIGATORIOS DEL CLIENTE (Sección Parties)
  if (!datos.cliente?.nombre) {
    camposFaltantes.push('cliente.nombre');
  } else {
    camposCompletos.push('cliente.nombre');
  }
  
  if (!datos.cliente?.direccion) {
    camposFaltantes.push('cliente.direccion');
  } else {
    camposCompletos.push('cliente.direccion');
  }
  
  // 2. CAMPOS OBLIGATORIOS DEL CONTRATISTA (Sección Parties)
  // Estos pueden venir pre-llenados desde el PDF o configuración
  if (!datos.contratista?.nombre) {
    camposFaltantes.push('contratista.nombre');
  } else {
    camposCompletos.push('contratista.nombre');
  }
  
  if (!datos.contratista?.direccion) {
    camposFaltantes.push('contratista.direccion');
  } else {
    camposCompletos.push('contratista.direccion');
  }
  
  // 3. CAMPOS OBLIGATORIOS DEL PROYECTO (Sección Services Provided)
  if (!datos.proyecto?.descripcion) {
    camposFaltantes.push('proyecto.descripcion');
  } else {
    camposCompletos.push('proyecto.descripcion');
  }
  
  if (!datos.proyecto?.tipoCerca) {
    camposFaltantes.push('proyecto.tipoCerca');
  } else {
    camposCompletos.push('proyecto.tipoCerca');
  }
  
  if (!datos.proyecto?.ubicacion && !datos.cliente?.direccion) {
    camposFaltantes.push('proyecto.ubicacion');
  } else {
    camposCompletos.push('proyecto.ubicacion');
  }
  
  if (!datos.proyecto?.material) {
    camposFaltantes.push('proyecto.material');
  } else {
    camposCompletos.push('proyecto.material');
  }
  
  // 4. CAMPOS OBLIGATORIOS DEL PRESUPUESTO (Sección Compensation)
  if (!datos.presupuesto?.total) {
    camposFaltantes.push('presupuesto.total');
  } else {
    camposCompletos.push('presupuesto.total');
  }
  
  if (!datos.presupuesto?.deposito) {
    camposFaltantes.push('presupuesto.deposito');
  } else {
    camposCompletos.push('presupuesto.deposito');
  }
  
  // 5. CAMPOS OPCIONALES
  // Si los campos opcionales están presentes, los marcamos como completos
  if (datos.cliente?.telefono) {
    camposCompletos.push('cliente.telefono');
  }
  
  if (datos.cliente?.email) {
    camposCompletos.push('cliente.email');
  }
  
  // Calcular porcentaje de completitud (excluyendo campos opcionales)
  const camposObligatorios = 10; // Número total de campos obligatorios analizados
  const camposObligatoriosCompletos = camposCompletos.filter(
    campo => !camposOpcionales.includes(campo)
  ).length;
  
  const porcentajeCompletado = Math.round((camposObligatoriosCompletos / camposObligatorios) * 100);
  
  return {
    faltantes: camposFaltantes,
    completos: camposCompletos,
    opcional: camposOpcionales,
    porcentajeCompletado
  };
}

/**
 * Función para validar qué campos son necesarios según el modo de operación
 * @param datos Los datos actuales recopilados
 * @param modo El modo actual del asistente
 * @returns Array con los nombres de los campos que faltan
 */
function validarCamposNecesarios(datos: any, modo: MervinMode): string[] {
  // Para el modo CONTRATO, usamos el análisis basado en template
  if (modo === MervinMode.CONTRACT) {
    const analisis = analizarCamposContrato(datos);
    return analisis.faltantes;
  }
  
  // Para otros modos, usamos la lógica anterior
  const camposFaltantes: string[] = [];
  
  // Campos comunes para todos los modos
  if (!datos.cliente?.nombre) camposFaltantes.push('nombre_cliente');
  if (!datos.cliente?.direccion) camposFaltantes.push('direccion_cliente');
  
  // Campos específicos por modo
  switch (modo) {
    case MervinMode.ESTIMATE:
      // Para estimados necesitamos información detallada del proyecto
      if (!datos.proyecto?.tipoCerca) camposFaltantes.push('tipo_cerca');
      if (!datos.proyecto?.longitud) camposFaltantes.push('longitud_cerca');
      if (!datos.proyecto?.material) camposFaltantes.push('material_cerca');
      // Aquí el teléfono y email son más importantes
      if (!datos.cliente?.telefono) camposFaltantes.push('telefono_cliente');
      if (!datos.cliente?.email) camposFaltantes.push('email_cliente');
      break;
      
    case MervinMode.OWNERSHIP:
      // Para verificación de propiedad solo necesitamos la dirección
      // Todos los campos requeridos ya están verificados arriba
      break;
      
    case MervinMode.PERMITS:
      // Para asesoría de permisos necesitamos dirección y tipo de proyecto
      if (!datos.proyecto?.tipoCerca) camposFaltantes.push('tipo_cerca');
      break;
  }
  
  return camposFaltantes;
}

/**
 * Función para determinar la siguiente pregunta según el campo faltante
 * @param campoFaltante El campo que falta por preguntar
 * @param datos Los datos actuales recopilados
 * @param context El contexto actual de la conversación
 * @returns Objeto con mensaje y contexto actualizado
 */
function manejarSiguienteCampoFaltante(campoFaltante: string, datos: any, context: any): any {
  // Determinar el paso correspondiente al campo
  let nuevoPaso = 1;
  let mensaje = "";
  
  // Mapeo de campos a pasos y mensajes correspondientes
  switch (campoFaltante) {
    case 'nombre_cliente':
      nuevoPaso = 1;
      mensaje = "Por favor, ¿cuál es el nombre del cliente?";
      break;
      
    case 'direccion_cliente':
      nuevoPaso = 2;
      mensaje = "¿Cuál es la dirección completa del cliente?";
      break;
      
    case 'telefono_cliente':
      nuevoPaso = 3;
      mensaje = "¿Cuál es el número de teléfono del cliente? (Escribe 'omitir' si no lo tienes)";
      break;
      
    case 'email_cliente':
      nuevoPaso = 4;
      mensaje = "¿Cuál es el correo electrónico del cliente? (Escribe 'omitir' si no lo tienes)";
      break;
      
    case 'descripcion_proyecto':
      nuevoPaso = 10;
      mensaje = "¿Puedes proporcionar una descripción breve del proyecto de cerca?";
      break;
      
    case 'tipo_cerca':
      nuevoPaso = 11;
      mensaje = "¿Qué tipo de cerca será instalada? (madera, hierro, vinilo, etc.)";
      break;
      
    case 'longitud_cerca':
      nuevoPaso = 12;
      mensaje = "¿Cuál es la longitud aproximada de la cerca en pies?";
      break;
      
    case 'material_cerca':
      nuevoPaso = 13;
      mensaje = "¿Qué material se utilizará para la cerca?";
      break;
      
    case 'total_presupuesto':
      nuevoPaso = 20;
      mensaje = "¿Cuál es el monto total del presupuesto?";
      break;
      
    default:
      nuevoPaso = 1;
      mensaje = "¿Qué otra información puedes proporcionarme sobre el proyecto?";
  }
  
  return {
    message: mensaje,
    context: {
      ...context,
      recopilacionDatos: {
        activa: true,
        paso: nuevoPaso,
        datos: datos
      }
    }
  };
}

/**
 * Función para extraer información sobre los términos de pago
 * @param message Mensaje del usuario
 * @returns Información de términos de pago extraída o null
 */
function extractPaymentTerms(message: string) {
  let paymentInfo: any = {};
  const normalizedMsg = message.toLowerCase();
  
  // Patrones específicos para "AGREGAR QUE EL UPFRONT COSTS DEBE SER EL 50%"
  if (normalizedMsg.includes('upfront') && normalizedMsg.includes('50%') || 
      normalizedMsg.includes('agregar que el upfront') || 
      normalizedMsg.includes('cots debe ser el 50')) {
    paymentInfo.deposito = '50%';
    paymentInfo.politicaPago = '50% inicial, 50% después de la aprobación del cliente';
    return { presupuesto: paymentInfo };
  }
  
  // Patrones para español
  if ((normalizedMsg.includes('pago inicial') || normalizedMsg.includes('anticipo')) && 
      (normalizedMsg.includes('50%') || normalizedMsg.includes('50 por ciento') || 
       normalizedMsg.includes('cincuenta por ciento') || normalizedMsg.includes('mitad'))) {
    paymentInfo.deposito = '50%';
    paymentInfo.politicaPago = '50% inicial, 50% después de la aprobación del cliente';
    return { presupuesto: paymentInfo };  
  }
  
  // Buscar patrones para "50% y 50% después de aprobación"
  if (normalizedMsg.includes('50%') && 
      (normalizedMsg.includes('aprobacion') || normalizedMsg.includes('aprobación'))) {
    paymentInfo.deposito = '50%';
    paymentInfo.politicaPago = '50% inicial, 50% después de la aprobación del cliente';
    return { presupuesto: paymentInfo };
  }
  
  // Buscar otros patrones de política de pago
  const upfrontRegex = /(?:upfront|adelanto|inicial|depósito|pago).*?(\d+)%/i;
  const upfrontMatch = message.match(upfrontRegex);
  
  if (upfrontMatch && upfrontMatch[1]) {
    const percentage = upfrontMatch[1];
    paymentInfo.deposito = `${percentage}%`;
    paymentInfo.politicaPago = `${percentage}% inicial, ${100 - parseInt(percentage)}% después de la aprobación del cliente`;
    return { presupuesto: paymentInfo };
  }
  
  return null;
}

export async function processChatMessage(message: string, context: any): Promise<any> {
  try {
    console.log('Chat context being used:', context);
    
    // Detectar si se solicita un cambio de modo de operación
    const newMode = detectModeChange(message);
    if (newMode) {
      // Actualizar el contexto con el nuevo modo
      const updatedContext = {
        ...context,
        currentMode: newMode
      };
      
      // Mensaje de confirmación según el modo
      let responseMsg = "";
      switch (newMode) {
        case MervinMode.CONTRACT:
          // Si ya tenemos datos extraídos, analizar qué información falta
          if (context.datos_extraidos) {
            // Analizar los datos existentes del PDF
            const analisis = contractQuestionService.analizarDatos(context.datos_extraidos);
            
            if (analisis.porcentajeCompletado >= 90) {
              // Si ya tenemos suficiente información del PDF, ofrecer generar el contrato
              responseMsg = `¡Excelente! Ya tengo casi toda la información necesaria del PDF (${analisis.porcentajeCompletado}% completado).\n\n${contractQuestionService.generarResumen(context.datos_extraidos)}\n\n¿Quieres proceder a generar el contrato o ajustar algún dato?`;
            } else {
              // Si falta información, obtener la próxima pregunta
              const proximaPregunta = contractQuestionService.obtenerProximaPregunta(context.datos_extraidos);
              
              if (proximaPregunta) {
                // Activar modo recopilación para manejar las respuestas
                responseMsg = `He extraído algo de información del PDF (${analisis.porcentajeCompletado}% completado), pero necesito algunos datos adicionales.\n\n${proximaPregunta.texto}`;
                updatedContext.recopilacionDatos = {
                  activa: true,
                  servicioContrato: true,
                  preguntaActual: proximaPregunta.campo,
                  datos: context.datos_extraidos
                };
              } else {
                responseMsg = "He analizado los datos del PDF. ¿Quieres generar el contrato ahora?";
              }
            }
          } else {
            // Si no hay datos previos, preguntar cómo obtenerlos
            responseMsg = "Entendido. Estoy listo para ayudarte a generar un contrato. ¿Quieres cargar un PDF de estimado o ingresar los datos manualmente?";
          }
          break;
          
        case MervinMode.ESTIMATE:
          responseMsg = "Perfecto. Vamos a crear un estimado. ¿Tienes los detalles del proyecto o quieres que te guíe a través del proceso?";
          break;
          
        case MervinMode.OWNERSHIP:
          responseMsg = "Cambié al modo de verificación de propiedad. Por favor proporciona la dirección que deseas verificar.";
          break;
          
        case MervinMode.PERMITS:
          responseMsg = "Ahora estoy en modo asesor de permisos. ¿En qué jurisdicción necesitas información sobre permisos de construcción?";
          break;
      }
      
      return {
        message: responseMsg,
        context: updatedContext
      };
    }
    
    // Verificar si el mensaje contiene instrucciones específicas sobre términos de pago
    // Nos enfocamos en detectar "AGREGAR QUE EL UPFRONT COSTS DEBE SER EL 50%"
    if (message.toUpperCase().includes("UPFRONT") && message.includes("50%")) {
      // Este es el caso específico mostrado en la imagen
      const datos_actualizados = context.datos_extraidos ? {
        ...context.datos_extraidos,
        presupuesto: {
          ...context.datos_extraidos.presupuesto,
          deposito: "50%",
          politicaPago: "50% inicial, 50% después de la aprobación del cliente"
        }
      } : {};
      
      console.log("Términos de pago actualizados a 50% upfront");
      
      // Guardar en localStorage como respaldo
      try {
        localStorage.setItem('mervin_extracted_data', JSON.stringify(datos_actualizados));
        console.log("Datos actualizados guardados en localStorage");
      } catch (err) {
        console.error("Error guardando datos actualizados en localStorage:", err);
      }
      
      return {
        message: "He actualizado el anticipo (upfront payment) al 50% del total. El pago será 50% inicial y 50% después de la aprobación del cliente. ¿Deseas revisar el contrato actualizado?",
        context: {
          ...context,
          datos_extraidos: datos_actualizados,
          expectingContractMethod: false
        }
      };
    }
    
    // Verificar si el mensaje contiene información sobre términos de pago (caso general)
    const paymentTerms = extractPaymentTerms(message);
    if (paymentTerms && context.datos_extraidos) {
      // Actualizar términos de pago en el contexto
      const datos_actualizados = {
        ...context.datos_extraidos,
        presupuesto: {
          ...context.datos_extraidos.presupuesto,
          ...paymentTerms.presupuesto
        }
      };
      
      console.log("Términos de pago actualizados:", datos_actualizados.presupuesto);
      
      // Guardar en localStorage como respaldo
      try {
        localStorage.setItem('mervin_extracted_data', JSON.stringify(datos_actualizados));
        console.log("Datos actualizados guardados en localStorage");
      } catch (err) {
        console.error("Error guardando datos actualizados en localStorage:", err);
      }
      
      return {
        message: `He actualizado los términos de pago: ${paymentTerms.presupuesto.politicaPago}. ¿Hay algún otro detalle que quieras incluir en el contrato?`,
        context: {
          ...context,
          datos_extraidos: datos_actualizados,
          expectingContractMethod: false // Desactivar espera de método
        }
      };
    }
    
    // Detectar información de la compañía en el mensaje
    const companyInfo = extractCompanyInfo(message);
    if (companyInfo && context.datos_extraidos) {
      // Actualizar información de la compañía
      const datos_actualizados = {
        ...context.datos_extraidos,
        contratista: {
          ...context.datos_extraidos.contratista,
          ...companyInfo.contratista
        }
      };
      
      console.log("Información de la compañía actualizada:", datos_actualizados.contratista);
      
      // Guardar en localStorage como respaldo
      try {
        localStorage.setItem('mervin_extracted_data', JSON.stringify(datos_actualizados));
        console.log("Datos actualizados guardados en localStorage");
      } catch (err) {
        console.error("Error guardando datos actualizados en localStorage:", err);
      }
      
      return {
        message: `He actualizado la información de tu compañía. Nombre: ${companyInfo.contratista.nombre || 'No proporcionado'}, Dirección: ${companyInfo.contratista.direccion || 'No proporcionada'}. ¿Qué más necesitas ajustar?`,
        context: {
          ...context,
          datos_extraidos: datos_actualizados,
          expectingContractMethod: false // Desactivar espera de método
        }
      };
    }
    
    // Comprobar si estamos en modo recopilación de datos y el usuario quiere cancelar
    if (context.recopilacionDatos?.activa && 
        (message.toLowerCase().includes('cancelar') || message.toLowerCase().includes('detener'))) {
      return {
        message: "He cancelado el proceso de recopilación de datos. ¿En qué más puedo ayudarte?",
        context: {
          ...context,
          recopilacionDatos: {
            activa: false
          }
        }
      };
    }
    
    // 1. Detectar solicitudes relacionadas con cláusulas personalizadas
    if (message.toLowerCase().includes("añadir cláusula") || 
        message.toLowerCase().includes("agregar cláusula") ||
        message.toLowerCase().includes("añadir clausula") ||
        message.toLowerCase().includes("agregar clausula") ||
        message.toLowerCase().includes("incluir cláusula") ||
        message.toLowerCase().includes("incluir clausula") ||
        message.toLowerCase().includes("cláusula pepsi") ||
        message.toLowerCase().includes("clausula pepsi")) {
      
      // Verificar si hay un contrato generado
      if (context.datos_extraidos) {
        return {
          message: "Por supuesto, puedes añadir una cláusula personalizada a tu contrato. Por favor escribe la cláusula que deseas añadir o pídeme que te sugiera algunas opciones comunes.",
          context: context
        };
      } else {
        return {
          message: "Para añadir una cláusula personalizada, primero necesitamos generar un contrato. ¿Te gustaría subir un estimado para crear un contrato?",
          context: context
        };
      }
    }
    
    // 2. Detectar solicitudes de ejemplos de cláusulas
    if (message.toLowerCase().includes("ejemplo de cláusula") ||
        message.toLowerCase().includes("ejemplo de clausula") ||
        message.toLowerCase().includes("ejemplos de cláusulas") ||
        message.toLowerCase().includes("ejemplos de clausulas") ||
        message.toLowerCase().includes("sugerir cláusula") ||
        message.toLowerCase().includes("sugerir clausula")) {
      
      return {
        message: "Aquí tienes algunos ejemplos de cláusulas comunes que podrías añadir a tu contrato:\n\n" +
                "1. **Cláusula de Limpieza**: \"El contratista se compromete a mantener el área de trabajo limpia y a remover todos los desechos y materiales sobrantes al finalizar el proyecto.\"\n\n" +
                "2. **Cláusula Pepsi**: \"Si el cliente proporciona bebidas refrescantes durante el trabajo, deben incluir productos de Pepsi y no de la competencia.\"\n\n" +
                "3. **Cláusula de Garantía Extendida**: \"El contratista ofrece una garantía extendida de 2 años adicionales sobre la mano de obra, que se suma a la garantía estándar de 1 año especificada en el contrato.\"\n\n" +
                "4. **Cláusula de Mascotas**: \"El cliente debe mantener a las mascotas alejadas del área de trabajo durante toda la duración del proyecto por razones de seguridad.\"\n\n" +
                "¿Te gustaría añadir alguna de estas cláusulas o tienes una cláusula personalizada en mente?",
        context: context
      };
    }
    
    // 3. Detectar preguntas sobre qué se puede corregir en un contrato
    if (message.toLowerCase().includes("qué puedo corregir") ||
        message.toLowerCase().includes("que puedo corregir") ||
        message.toLowerCase().includes("qué puedo modificar") ||
        message.toLowerCase().includes("que puedo modificar") ||
        message.toLowerCase().includes("qué información puedo cambiar") ||
        message.toLowerCase().includes("que información puedo cambiar")) {
      
      // Verificar si hay un contrato generado
      if (context.datos_extraidos) {
        return {
          message: "Puedes corregir o modificar diversos aspectos del contrato, incluyendo:\n\n" +
                  "**Información del Cliente:**\n" +
                  "- Nombre del cliente\n" +
                  "- Dirección del cliente\n" +
                  "- Teléfono del cliente\n" +
                  "- Email del cliente\n\n" +
                  "**Información del Contratista:**\n" +
                  "- Nombre del contratista\n" +
                  "- Dirección del contratista\n" +
                  "- Información de contacto\n" +
                  "- Número de licencia\n\n" +
                  "**Detalles del Proyecto:**\n" +
                  "- Tipo de cerca\n" +
                  "- Altura y longitud\n" +
                  "- Material utilizado\n" +
                  "- Fecha de inicio\n" +
                  "- Descripción del proyecto\n\n" +
                  "**Información de Pago:**\n" +
                  "- Costo total\n" +
                  "- Monto del depósito\n" +
                  "- Forma de pago\n\n" +
                  "Para corregir cualquiera de estos campos, simplemente escribe algo como \"El nombre del cliente es [nombre correcto]\" o \"La altura de la cerca es [altura correcta]\".",
          context: context
        };
      } else {
        return {
          message: "Para corregir información en un contrato, primero necesitamos generar uno. ¿Te gustaría subir un estimado para crear un contrato?",
          context: context
        };
      }
    }
    
    // 4. Detectar mensajes sobre generación de contratos
    if (message.toLowerCase().includes("genera un contrato") ||
        message.toLowerCase().includes("generar contrato") ||
        message.toLowerCase().includes("crear contrato") ||
        message.toLowerCase().includes("hacer un contrato") ||
        message.toLowerCase() === "2. generar contrato" ||
        message.toLowerCase() === "generar contrato") {
      
      // Comprobar si ya tenemos un proceso de recopilación de datos en curso
      if (context.recopilacionDatos && context.recopilacionDatos.activa) {
        return {
          message: "Ya estamos en el proceso de crear un contrato. Por favor, responde a mi última pregunta o escribe 'cancelar' si deseas detener el proceso.",
          context: context
        };
      }
      
      // Ofrecer ambas opciones: subir PDF o ingresar datos manualmente
      return {
        message: "Puedo ayudarte a generar un contrato. Tienes dos opciones:\n\n1. Cargar un estimado en formato PDF y lo procesaré automáticamente (usa el ícono de clip en la barra de chat).\n\n2. O puedo hacerte algunas preguntas para crear el contrato desde cero. ¿Qué prefieres?",
        options: [
          "Cargar PDF",
          "Ingresar datos manualmente"
        ],
        context: {
          ...context,
          expectingContractMethod: true
        }
      };
    }
    
    // 5. Detectar selección de método para generar contrato
    if (context.expectingContractMethod) {
      if (message.toLowerCase().includes("manual") || 
          message.toLowerCase() === "ingresar datos manualmente" ||
          message.toLowerCase() === "2") {
        
        // Iniciar proceso de recopilación de datos
        return {
          message: "Perfecto, vamos a crear tu contrato paso a paso. Primero, necesito algunos datos básicos del cliente.\n\n¿Cuál es el nombre completo de tu cliente?",
          context: {
            ...context,
            expectingContractMethod: false,
            recopilacionDatos: {
              activa: true,
              paso: 1,
              datos: {
                cliente: {},
                contratista: {},
                proyecto: {},
                presupuesto: {}
              }
            }
          }
        };
      }
      
      if (message.toLowerCase().includes("pdf") || 
          message.toLowerCase() === "cargar pdf" ||
          message.toLowerCase() === "1") {
        
        return {
          message: "Por favor, usa el ícono de clip en la barra de chat para cargar tu archivo PDF con el estimado.",
          context: {
            ...context,
            expectingContractMethod: false,
          }
        };
      }
    }
    
    // 6. Procesar respuestas durante la recopilación de datos para el contrato
    if (context.recopilacionDatos && context.recopilacionDatos.activa) {
      // Si el usuario quiere cancelar el proceso
      if (message.toLowerCase() === "cancelar" || 
          message.toLowerCase() === "detener" || 
          message.toLowerCase() === "salir") {
        
        return {
          message: "He cancelado el proceso de creación del contrato. ¿En qué más puedo ayudarte?",
          context: {
            ...context,
            recopilacionDatos: {
              activa: false
            }
          }
        };
      }
      
      // Primero, verificar si estamos en un modo específico
    const currentMode = context.currentMode || MervinMode.CONTRACT;
    
    // Procesar los datos según el modo actual y el paso
    const paso = context.recopilacionDatos.paso;
    const datosActuales = context.recopilacionDatos.datos;
    
    // Verificar si hay términos de pago o información de compañía en el mensaje
    const paymentTerms = extractPaymentTerms(message);
    const companyInfo = extractCompanyInfo(message);
    
    // Si encontramos información relevante, la incorporamos a los datos
    if (paymentTerms) {
      datosActuales.presupuesto = {
        ...datosActuales.presupuesto,
        ...paymentTerms.presupuesto
      };
      
      console.log("Actualizando términos de pago en paso de recopilación:", datosActuales.presupuesto);
    }
    
    if (companyInfo) {
      datosActuales.contratista = {
        ...datosActuales.contratista,
        ...companyInfo.contratista
      };
      
      console.log("Actualizando información de compañía en paso de recopilación:", datosActuales.contratista);
    }
    
    // Continuar con el flujo normal de recopilación
    switch (paso) {
        // Nombre del cliente
        case 1:
          datosActuales.cliente.nombre = message;
          return {
            message: `Gracias. ¿Cuál es la dirección completa de ${message}?`,
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 2,
                datos: datosActuales
              }
            }
          };
          
        // Dirección del cliente
        case 2:
          datosActuales.cliente.direccion = message;
          return {
            message: "¿Cuál es el número de teléfono del cliente? (Escribe 'omitir' si no lo tienes)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 3,
                datos: datosActuales
              }
            }
          };
          
        // Teléfono del cliente
        case 3:
          if (message.toLowerCase() !== "omitir") {
            datosActuales.cliente.telefono = message;
          }
          
          // Verificar si necesitamos continuar pidiendo información según el modo
          const camposFaltantes = validarCamposNecesarios(datosActuales, currentMode);
          
          // Si no necesitamos el email, redirigir a otro campo importante o finalizar
          if (!camposFaltantes.includes('email_cliente')) {
            // Si hay otros campos faltantes, ir al siguiente
            if (camposFaltantes.length > 0) {
              console.log(`Saltando a siguiente campo faltante: ${camposFaltantes[0]}`);
              return manejarSiguienteCampoFaltante(camposFaltantes[0], datosActuales, context);
            } else {
              // Si no hay más campos necesarios, finalizar recopilación
              console.log("Completando recopilación de datos, todos los campos necesarios obtenidos");
              return {
                message: "¡Perfecto! Tengo toda la información necesaria para continuar. ¿Qué deseas hacer ahora?",
                context: {
                  ...context,
                  recopilacionDatos: {
                    activa: false,
                    datos: datosActuales
                  },
                  datos_extraidos: datosActuales
                }
              };
            }
          }
          
          // Si necesitamos el email, continuar normalmente
          return {
            message: "¿Cuál es el correo electrónico del cliente? (Escribe 'omitir' si no lo tienes)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 4,
                datos: datosActuales
              }
            }
          };
          
        // Email del cliente
        case 4:
          if (message.toLowerCase() !== "omitir") {
            datosActuales.cliente.email = message;
          }
          
          // Verificar nuevamente campos faltantes después de actualizar correo
          const camposFaltantesEmail = validarCamposNecesarios(datosActuales, currentMode);
          
          // Si ya tenemos información de contratista/empresa, podemos saltarnos esa pregunta
          if (datosActuales.contratista.nombre && datosActuales.contratista.direccion) {
            // Si hay otros campos faltantes importantes, ir al siguiente
            if (camposFaltantesEmail.length > 0) {
              console.log(`Saltando a otro campo faltante: ${camposFaltantesEmail[0]}`);
              return manejarSiguienteCampoFaltante(camposFaltantesEmail[0], datosActuales, context);
            } else {
              // Si no hay más campos necesarios, finalizar recopilación
              console.log("Ya tenemos información del contratista y todos los campos requeridos");
              return {
                message: "¡Excelente! Ya tengo tu información de contratista y todos los datos necesarios. ¿Deseas continuar con la generación del contrato?",
                context: {
                  ...context,
                  recopilacionDatos: {
                    activa: false,
                    datos: datosActuales
                  },
                  datos_extraidos: datosActuales
                }
              };
            }
          }
          
          // Si no tenemos información de contratista, continuar normalmente
          return {
            message: "Ahora necesito información sobre tu empresa. ¿Cuál es el nombre de tu empresa/contratista?",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 5,
                datos: datosActuales
              }
            }
          };
          
        // Nombre del contratista
        case 5:
          datosActuales.contratista.nombre = message;
          return {
            message: "¿Cuál es la dirección de tu empresa?",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 6,
                datos: datosActuales
              }
            }
          };
          
        // Dirección del contratista
        case 6:
          datosActuales.contratista.direccion = message;
          return {
            message: "¿Cuál es tu número de teléfono de contacto?",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 7,
                datos: datosActuales
              }
            }
          };
          
        // Teléfono del contratista
        case 7:
          datosActuales.contratista.telefono = message;
          return {
            message: "¿Cuál es tu correo electrónico de contacto?",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 8,
                datos: datosActuales
              }
            }
          };
          
        // Email del contratista
        case 8:
          datosActuales.contratista.email = message;
          return {
            message: "¿Cuál es tu número de licencia de contratista? (Escribe 'omitir' si no aplica)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 9,
                datos: datosActuales
              }
            }
          };
          
        // Licencia del contratista
        case 9:
          if (message.toLowerCase() !== "omitir") {
            datosActuales.contratista.licencia = message;
          }
          return {
            message: "Ahora hablemos del proyecto. ¿Qué tipo de cerca vas a instalar? (ej: madera, vinilo, hierro forjado)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 10,
                datos: datosActuales
              }
            }
          };
          
        // Tipo de cerca
        case 10:
          datosActuales.proyecto.tipoCerca = message;
          return {
            message: "¿Cuál es la altura de la cerca? (ej: 6 pies)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 11,
                datos: datosActuales
              }
            }
          };
          
        // Altura de la cerca
        case 11:
          datosActuales.proyecto.altura = message;
          return {
            message: "¿Cuál es la longitud total de la cerca? (ej: 100 pies)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 12,
                datos: datosActuales
              }
            }
          };
          
        // Longitud de la cerca
        case 12:
          datosActuales.proyecto.longitud = message;
          return {
            message: "¿De qué material será la cerca?",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 13,
                datos: datosActuales
              }
            }
          };
          
        // Material de la cerca
        case 13:
          datosActuales.proyecto.material = message;
          return {
            message: "¿Cuándo planeas comenzar el proyecto? (ej: 15 de junio de 2025)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 14,
                datos: datosActuales
              }
            }
          };
          
        // Fecha de inicio
        case 14:
          datosActuales.proyecto.fechaInicio = message;
          return {
            message: "¿Cuánto tiempo estimas que tardará la instalación? (ej: 2 semanas)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 15,
                datos: datosActuales
              }
            }
          };
          
        // Duración estimada
        case 15:
          datosActuales.proyecto.duracionEstimada = message;
          return {
            message: "¿Puedes proporcionar una breve descripción del proyecto? (ubicación específica en la propiedad, detalles especiales, etc.)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 16,
                datos: datosActuales
              }
            }
          };
          
        // Descripción del proyecto
        case 16:
          datosActuales.proyecto.descripcion = message;
          return {
            message: "Ahora hablemos del presupuesto. ¿Cuál es el costo total del proyecto? (ej: $5,000)",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 17,
                datos: datosActuales
              }
            }
          };
          
        // Costo total
        case 17:
          datosActuales.presupuesto.total = message;
          
          // Guardar datos en localStorage para respaldo
          try {
            localStorage.setItem('mervin_contract_data', JSON.stringify(datosActuales));
            console.log("Datos guardados en localStorage durante recopilación", datosActuales);
          } catch (error) {
            console.error("Error guardando datos en localStorage:", error);
          }
          
          return {
            message: "He actualizado que el costo total del proyecto es " + message + ". ¿Cómo se distribuirá el pago? En la industria es común solicitar un depósito inicial del 50% y el 50% restante después de la aprobación del cliente.",
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 18,
                datos: datosActuales
              }
            }
          };
          
        // Depósito
        case 18:
          // Analiza la respuesta del usuario sobre términos de pago
          let depositoInfo = "";
          
          // Busca patrones comunes de distribución de pago
          if (message.includes("50%") || message.toLowerCase().includes("mitad")) {
            depositoInfo = "50% upfront, 50% al completar";
            datosActuales.presupuesto.politicaPago = "50% inicial, 50% después de la aprobación del cliente";
          } else if (message.includes("30%")) {
            depositoInfo = "30% upfront, 70% al completar";
            datosActuales.presupuesto.politicaPago = "30% inicial, 70% después de la aprobación del cliente";
          } else {
            // Si el formato no es reconocido, usar la respuesta directa
            depositoInfo = message;
            datosActuales.presupuesto.politicaPago = message;
          }
          
          datosActuales.presupuesto.deposito = depositoInfo;
          
          // Guardar datos en localStorage para respaldo
          try {
            localStorage.setItem('mervin_contract_data', JSON.stringify(datosActuales));
            console.log("Datos de depósito guardados:", depositoInfo);
          } catch (error) {
            console.error("Error guardando datos de depósito:", error);
          }
          
          return {
            message: `He registrado que la política de pago será: ${depositoInfo}. ¿Cuál será la forma de pago aceptada? (ej: efectivo, cheque, transferencia bancaria)`,
            context: {
              ...context,
              recopilacionDatos: {
                activa: true,
                paso: 19,
                datos: datosActuales
              }
            }
          };
          
        // Forma de pago
        case 19:
          datosActuales.presupuesto.formaPago = message;
          
          // Formatear los datos en el formato esperado
          const datosFormateados = {
            cliente: datosActuales.cliente,
            contratista: datosActuales.contratista,
            proyecto: datosActuales.proyecto,
            presupuesto: datosActuales.presupuesto
          };
          
          return {
            message: "¡Gracias por proporcionar toda la información! Ahora voy a generar tu contrato con estos datos.",
            context: {
              ...context,
              recopilacionDatos: {
                activa: false
              },
              datos_extraidos: datosFormateados
            },
            action: "generateContract"
          };
          
        default:
          // Si algo sale mal, reiniciar el proceso
          return {
            message: "Lo siento, parece que hubo un error en el proceso. ¿Quieres intentar nuevamente?",
            context: {
              ...context,
              recopilacionDatos: {
                activa: false
              }
            }
          };
      }
    }
    
    // Si no es un mensaje que podemos manejar localmente, enviarlo a la API
    const response = await apiRequest("POST", "/api/chat", {
      message,
      context,
      model: GPT_MODEL,
      systemPrompt: MEXICAN_STYLE_PROMPT
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("¡Ay caramba! Error procesando el mensaje:", error);
    throw error;
  }
}
