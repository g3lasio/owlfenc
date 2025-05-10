
import { apiRequest } from "./queryClient";
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

export async function generateContract(projectDetails: any): Promise<string> {
  try {
    // Primero intentamos generar el contrato utilizando contractGenerator local
    try {
      console.log("Intentando generar contrato localmente con datos:", projectDetails);
      
      // Formatear los datos para el generador de contratos
      const contractData = formatContractData(projectDetails);
      
      // Generar el HTML del contrato utilizando la plantilla local
      const html = generateContractHTML(contractData);
      console.log("Contrato generado localmente con éxito");
      
      return html;
    } catch (localError) {
      console.warn("Error generando contrato localmente, usando API como fallback:", localError);
      
      // Si falla la generación local, intentamos con la API
      const response = await apiRequest("POST", "/api/generate-contract", {
        projectDetails,
        model: GPT_MODEL,
        systemPrompt: MEXICAN_STYLE_PROMPT
      });
      
      const data = await response.json();
      return data.html;
    }
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

import { formatContractData, generateContractHTML } from './contractGenerator';

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
      
      // Formatear los datos para el generador de contratos
      const contractData = formatContractData(datos_actualizados);
      
      // Generar el contrato usando la plantilla local
      const html = generateContractHTML(contractData);
      
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

export async function processChatMessage(message: string, context: any): Promise<any> {
  try {
    console.log('Chat context being used:', context);
    
    // Detectar mensajes específicos relacionados con contratos y responder localmente
    // para mejorar el tiempo de respuesta y la coherencia del flujo
    
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
      
      // Procesar los datos según el paso actual
      const paso = context.recopilacionDatos.paso;
      const datosActuales = context.recopilacionDatos.datos;
      
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
          return {
            message: "¿Cuál será el monto del depósito inicial? (ej: $2,500 o 50%)",
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
          datosActuales.presupuesto.deposito = message;
          return {
            message: "¿Cuál será la forma de pago aceptada? (ej: efectivo, cheque, transferencia bancaria)",
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
