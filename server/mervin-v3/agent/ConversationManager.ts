/**
 * ConversationManager - Sistema de Conversaciones Guiadas Inteligentes
 * 
 * Gestiona conversaciones multi-turno con el usuario:
 * - Detecta información faltante
 * - Genera preguntas contextuales inteligentes
 * - Valida respuestas del usuario
 * - Infiere datos del contexto cuando es posible
 * - Guía al usuario paso a paso
 * 
 * Este es el sistema que permite a Mervin tener conversaciones naturales y guiadas.
 */

import { ecosystemKnowledge } from '../context/EcosystemKnowledgeBase';
import type { PlanningContext } from '../types/agent-types';

export interface FieldDefinition {
  name: string;
  displayName: string;
  description: string;
  question: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone';
  required: boolean;
  validation?: (value: any) => boolean;
  inferFrom?: string[]; // Campos de donde se puede inferir este valor
}

export interface MissingInfo {
  field: string;
  displayName: string;
  description: string;
  question: string;
  type: string;
  required: boolean;
  canInfer: boolean;
  inferredValue?: any;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export interface ConversationState {
  taskType: string;
  providedData: Record<string, any>;
  missingFields: MissingInfo[];
  currentQuestion?: string;
  attemptCount: number;
  context: any;
}

export class ConversationManager {
  
  /**
   * Definiciones de campos requeridos para cada tipo de tarea
   */
  private static TASK_FIELDS: Record<string, FieldDefinition[]> = {
    create_estimate: [
      {
        name: 'clientName',
        displayName: 'Nombre del Cliente',
        description: 'Nombre completo del cliente',
        question: '¿Cuál es el nombre completo del cliente?',
        type: 'string',
        required: true
      },
      {
        name: 'clientEmail',
        displayName: 'Email del Cliente',
        description: 'Email para enviar el estimado',
        question: '¿Cuál es el email del cliente? (Lo necesito para enviarle el estimado)',
        type: 'email',
        required: false,
        inferFrom: ['clientId']
      },
      {
        name: 'projectType',
        displayName: 'Tipo de Proyecto',
        description: 'Tipo de construcción (fence, deck, patio, etc.)',
        question: '¿Qué tipo de proyecto es? (fence, deck, patio, driveway, etc.)',
        type: 'string',
        required: true
      },
      {
        name: 'projectDescription',
        displayName: 'Descripción del Proyecto',
        description: 'Descripción detallada con dimensiones y materiales',
        question: '¿Puedes darme una descripción detallada del proyecto? (dimensiones, materiales, etc.)',
        type: 'string',
        required: true
      },
      {
        name: 'location',
        displayName: 'Ubicación',
        description: 'Ciudad y estado para precios regionales',
        question: '¿En qué ciudad y estado está el proyecto? (para precios regionales)',
        type: 'string',
        required: false,
        inferFrom: ['clientAddress', 'projectAddress']
      }
    ],
    
    create_contract: [
      {
        name: 'clientName',
        displayName: 'Nombre del Cliente',
        description: 'Nombre completo del cliente',
        question: '¿Cuál es el nombre completo del cliente?',
        type: 'string',
        required: true
      },
      {
        name: 'clientEmail',
        displayName: 'Email del Cliente',
        description: 'Email para enviar el link de firma',
        question: '¿Cuál es el email del cliente? (Lo necesito para enviarle el link de firma del contrato)',
        type: 'email',
        required: true,
        inferFrom: ['clientId']
      },
      {
        name: 'projectType',
        displayName: 'Tipo de Proyecto',
        description: 'Tipo de construcción',
        question: '¿Qué tipo de proyecto es?',
        type: 'string',
        required: true
      },
      {
        name: 'projectDescription',
        displayName: 'Descripción del Proyecto',
        description: 'Descripción detallada del trabajo',
        question: '¿Puedes describir el trabajo que se va a realizar?',
        type: 'string',
        required: true,
        inferFrom: ['estimateId']
      },
      {
        name: 'amount',
        displayName: 'Monto Total',
        description: 'Monto total del contrato en dólares',
        question: '¿Cuál es el monto total del contrato?',
        type: 'number',
        required: true,
        inferFrom: ['estimateId']
      },
      {
        name: 'projectAddress',
        displayName: 'Dirección del Proyecto',
        description: 'Dirección donde se realizará el trabajo',
        question: '¿En qué dirección se va a realizar el trabajo?',
        type: 'string',
        required: false,
        inferFrom: ['clientAddress']
      },
      {
        name: 'templateId',
        displayName: 'Tipo de Contrato',
        description: 'Template de contrato a usar',
        question: '¿Qué tipo de contrato necesitas?',
        type: 'string',
        required: true
      }
    ],
    
    send_email: [
      {
        name: 'recipientEmail',
        displayName: 'Email del Destinatario',
        description: 'Email donde enviar el documento',
        question: '¿A qué email quieres enviarlo?',
        type: 'email',
        required: true,
        inferFrom: ['clientEmail']
      }
    ]
  };
  
  /**
   * Detectar qué información falta para completar una tarea
   */
  async getMissingInformation(params: {
    taskType: string;
    providedData: Record<string, any>;
    context: PlanningContext;
  }): Promise<MissingInfo[]> {
    const fields = ConversationManager.TASK_FIELDS[params.taskType] || [];
    const missing: MissingInfo[] = [];
    
    for (const field of fields) {
      // Si el campo ya está proporcionado, skip
      if (params.providedData[field.name]) {
        continue;
      }
      
      // Intentar inferir el valor del contexto
      let inferredValue: any = null;
      let canInfer = false;
      
      if (field.inferFrom && field.inferFrom.length > 0) {
        inferredValue = await this.tryToInferValue(field, params.providedData, params.context);
        canInfer = inferredValue !== null;
      }
      
      // Si es requerido y no se pudo inferir, agregarlo a missing
      if (field.required && !canInfer) {
        missing.push({
          field: field.name,
          displayName: field.displayName,
          description: field.description,
          question: field.question,
          type: field.type,
          required: field.required,
          canInfer: false
        });
      }
      
      // Si se pudo inferir, agregarlo con el valor inferido
      if (canInfer && inferredValue) {
        missing.push({
          field: field.name,
          displayName: field.displayName,
          description: field.description,
          question: `Veo que ${field.displayName.toLowerCase()} es "${inferredValue}". ¿Es correcto?`,
          type: field.type,
          required: field.required,
          canInfer: true,
          inferredValue
        });
      }
    }
    
    return missing;
  }
  
  /**
   * Intentar inferir un valor del contexto
   */
  private async tryToInferValue(
    field: FieldDefinition,
    providedData: Record<string, any>,
    context: PlanningContext
  ): Promise<any> {
    if (!field.inferFrom) return null;
    
    // Si tenemos clientId, buscar información del cliente
    if (field.inferFrom.includes('clientId') && providedData.clientId) {
      try {
        const client = await ecosystemKnowledge.getEntityDetails({
          entityType: 'client',
          entityId: providedData.clientId,
          userId: context.userId
        });
        
        if (client) {
          if (field.name === 'clientEmail') return client.data.email;
          if (field.name === 'clientPhone') return client.data.phone;
          if (field.name === 'clientAddress') return client.data.address;
        }
      } catch (error) {
        console.error('Error inferring from clientId:', error);
      }
    }
    
    // Si tenemos estimateId, buscar información del estimado
    if (field.inferFrom.includes('estimateId') && providedData.estimateId) {
      try {
        const estimate = await ecosystemKnowledge.getEntityDetails({
          entityType: 'estimate',
          entityId: providedData.estimateId,
          userId: context.userId
        });
        
        if (estimate) {
          if (field.name === 'projectDescription') return estimate.data.projectDescription;
          if (field.name === 'amount') return estimate.data.total;
          if (field.name === 'projectType') return estimate.data.projectType;
          if (field.name === 'clientName') return estimate.data.clientName;
        }
      } catch (error) {
        console.error('Error inferring from estimateId:', error);
      }
    }
    
    // Inferir location de address
    if (field.name === 'location') {
      const address = providedData.clientAddress || providedData.projectAddress;
      if (address) {
        // Extraer ciudad y estado de la dirección
        const match = address.match(/([A-Za-z\s]+),\s*([A-Z]{2})/);
        if (match) {
          return `${match[1]}, ${match[2]}`;
        }
      }
    }
    
    // Inferir projectAddress de clientAddress
    if (field.name === 'projectAddress' && providedData.clientAddress) {
      return providedData.clientAddress;
    }
    
    return null;
  }
  
  /**
   * Generar pregunta inteligente contextual
   */
  generateSmartQuestion(params: {
    missingInfo: MissingInfo;
    context: any;
    attemptNumber?: number;
  }): string {
    const { missingInfo, context, attemptNumber = 1 } = params;
    
    // Si es un reintento, agregar ayuda adicional
    if (attemptNumber > 1) {
      return this.generateRetryQuestion(missingInfo, attemptNumber);
    }
    
    // Personalizar pregunta según contexto
    
    // Email del cliente
    if (missingInfo.field === 'clientEmail' && context.clientName) {
      return `¿Cuál es el email de ${context.clientName}? Lo necesito para ${context.reason || 'enviarle el documento'}.`;
    }
    
    // Template de contrato
    if (missingInfo.field === 'templateId') {
      if (context.hasExistingContract) {
        return `Veo que ya tienes un contrato con este cliente. ¿Quieres:
1. **Change Order** - Modificar el proyecto existente (agregar trabajo, cambiar materiales)
2. **Contract Addendum** - Agregar términos adicionales sin cambiar el scope
3. **Nuevo contrato independiente** - Empezar un proyecto completamente nuevo

¿Cuál describe mejor tu situación?`;
      }
      
      if (context.clientPaid) {
        return `Mencionaste que el cliente pagó. ¿Quieres generar un **Lien Waiver** para documentar el pago y liberar el gravamen?`;
      }
      
      if (context.projectCompleted) {
        return `El proyecto está terminado. ¿Quieres generar un **Certificate of Completion** para certificar que el trabajo está completo?`;
      }
      
      return `¿Qué tipo de contrato necesitas? Puedo ayudarte a elegir el correcto si me das más contexto.`;
    }
    
    // Monto del contrato
    if (missingInfo.field === 'amount' && context.estimateTotal) {
      return `Veo que el estimado es de $${context.estimateTotal}. ¿Ese es el monto del contrato o cambió?`;
    }
    
    // Pregunta por defecto
    return missingInfo.question;
  }
  
  /**
   * Generar pregunta de reintento con ayuda adicional
   */
  private generateRetryQuestion(missingInfo: MissingInfo, attemptNumber: number): string {
    const examples: Record<string, string> = {
      email: 'Ejemplo: john@example.com',
      phone: 'Ejemplo: +1 (555) 123-4567',
      date: 'Ejemplo: 2026-03-15 o 15 de marzo',
      number: 'Ejemplo: 15000 (solo el número, sin símbolos)'
    };
    
    const example = examples[missingInfo.type] || '';
    
    return `${missingInfo.question}

${example ? `${example}` : ''}

(Intento ${attemptNumber}/3)`;
  }
  
  /**
   * Validar respuesta del usuario
   */
  validateResponse(field: string, value: any, fieldType: string): ValidationResult {
    // Validación de email
    if (fieldType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          valid: false,
          error: 'El formato del email no es válido.',
          suggestion: 'Ejemplo: john@example.com'
        };
      }
    }
    
    // Validación de teléfono
    if (fieldType === 'phone') {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(value)) {
        return {
          valid: false,
          error: 'El formato del teléfono no es válido.',
          suggestion: 'Ejemplo: +1 (555) 123-4567'
        };
      }
    }
    
    // Validación de número
    if (fieldType === 'number') {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: 'Debe ser un número positivo.',
          suggestion: 'Ejemplo: 15000'
        };
      }
    }
    
    // Validación de fecha
    if (fieldType === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          valid: false,
          error: 'El formato de fecha no es válido.',
          suggestion: 'Ejemplo: 2026-03-15 o "15 de marzo"'
        };
      }
    }
    
    // Validación de string vacío
    if (fieldType === 'string' && (!value || value.trim().length === 0)) {
      return {
        valid: false,
        error: 'Este campo no puede estar vacío.'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Detectar si el usuario está confundido o necesita ayuda
   */
  detectConfusion(userMessage: string): boolean {
    const confusionIndicators = [
      'no sé',
      'no estoy seguro',
      'qué es',
      'cuál es la diferencia',
      'no entiendo',
      'ayuda',
      'explica',
      'no me acuerdo',
      'no recuerdo',
      'confused',
      'help',
      'what is',
      'i don\'t know'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return confusionIndicators.some(indicator => lowerMessage.includes(indicator));
  }
  
  /**
   * Generar respuesta de ayuda cuando el usuario está confundido
   */
  generateHelpResponse(field: string, context: any): string {
    const helpResponses: Record<string, string> = {
      templateId: `Déjame explicarte las opciones de contratos:

**Independent Contractor Agreement** (Contrato completo)
→ Para proyectos nuevos desde cero
→ Ejemplo: Cliente aprobó un estimado de $15,000 para instalar una cerca

**Change Order** (Orden de cambio)
→ Para modificar un proyecto existente
→ Ejemplo: Cliente quiere agregar 20 pies más de cerca al proyecto original

**Work Order** (Orden de trabajo)
→ Para trabajos simples o rápidos
→ Ejemplo: Reparación de una sección dañada por $500

**Lien Waiver** (Renuncia de gravamen)
→ Cuando el cliente paga y quieres documentarlo
→ Ejemplo: Cliente pagó el 50% inicial

¿Cuál describe mejor tu situación?`,
      
      projectType: `El tipo de proyecto puede ser:
- **Fence** (cerca)
- **Deck** (terraza/deck)
- **Patio** (patio)
- **Driveway** (entrada de autos)
- **Remodeling** (remodelación)
- **Painting** (pintura)
- O cualquier otro tipo de construcción

¿Cuál es el tuyo?`,
      
      amount: `El monto total es el precio completo del proyecto.

Si ya tienes un estimado aprobado, usa ese monto.
Si es un cambio al proyecto, indica el costo adicional.

Ejemplo: 15000 (sin símbolos de dólar ni comas)

¿Cuál es el monto?`
    };
    
    return helpResponses[field] || `Déjame ayudarte con esto. ${context.question}`;
  }
  
  /**
   * Recomendar siguiente acción basada en el contexto
   */
  async recommendNextAction(context: any): Promise<{
    action: string;
    reason: string;
    confidence: number;
  }> {
    // Si mencionó "pago" o "pagó"
    if (context.userMessage?.toLowerCase().includes('pag')) {
      return {
        action: 'create_lien_waiver',
        reason: 'Detecté que mencionaste un pago. Un Lien Waiver documenta el pago y protege al cliente.',
        confidence: 0.85
      };
    }
    
    // Si mencionó "terminé" o "completé"
    if (context.userMessage?.toLowerCase().match(/termin|complet|finish/)) {
      return {
        action: 'create_certificate_completion',
        reason: 'El proyecto está terminado. Un Certificate of Completion certifica oficialmente la finalización.',
        confidence: 0.88
      };
    }
    
    // Si mencionó "cambio" o "modificar"
    if (context.userMessage?.toLowerCase().match(/cambio|modific|agregar|add/)) {
      return {
        action: 'create_change_order',
        reason: 'Quieres modificar un proyecto existente. Un Change Order documenta los cambios.',
        confidence: 0.90
      };
    }
    
    // Default: nuevo contrato
    return {
      action: 'create_contract',
      reason: 'Para un proyecto nuevo, un Independent Contractor Agreement es el estándar.',
      confidence: 0.70
    };
  }
}

// Singleton instance
export const conversationManager = new ConversationManager();
