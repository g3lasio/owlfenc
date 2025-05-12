// client/src/services/contractQuestionService.ts

export type QuestionType = 
  | 'text' 
  | 'multiline' 
  | 'date' 
  | 'number' 
  | 'choice';

export interface Question {
  /** Identificador único de la pregunta */
  id: string;
  /** Nombre de la propiedad donde se guardará la respuesta */
  field: string;
  /** Texto que se muestra al usuario */
  prompt: string;
  /** Tipo de entrada esperada */
  type: QuestionType;
  /** Opciones si es un choice */
  options?: string[];
  /** Indicador si es obligatoria */
  required?: boolean;
}

/**
 * Preguntas específicas para contratos de cercas
 */
export const fenceContractQuestions: Question[] = [
  // Datos del contratista
  {
    id: 'contractor_name',
    field: 'contractor.name',
    prompt: '¿Cuál es el nombre completo de tu empresa o nombre comercial?',
    type: 'text',
    required: true,
  },
  {
    id: 'contractor_address',
    field: 'contractor.address',
    prompt: '¿Cuál es la dirección completa de tu empresa?',
    type: 'multiline',
    required: true,
  },
  {
    id: 'contractor_phone',
    field: 'contractor.phone',
    prompt: '¿Cuál es el número telefónico de contacto de tu empresa?',
    type: 'text',
    required: true,
  },
  {
    id: 'contractor_email',
    field: 'contractor.email',
    prompt: '¿Cuál es el correo electrónico de contacto de tu empresa?',
    type: 'text',
    required: true,
  },
  {
    id: 'contractor_license',
    field: 'contractor.license',
    prompt: '¿Cuál es tu número de licencia de contratista?',
    type: 'text',
    required: true,
  },
  
  // Datos del cliente
  {
    id: 'client_name',
    field: 'client.name',
    prompt: '¿Cuál es el nombre completo del cliente?',
    type: 'text',
    required: true,
  },
  {
    id: 'client_address',
    field: 'client.address',
    prompt: '¿Cuál es la dirección completa del cliente o del proyecto?',
    type: 'multiline',
    required: true,
  },
  {
    id: 'client_phone',
    field: 'client.phone',
    prompt: '¿Cuál es el número telefónico del cliente?',
    type: 'text',
    required: true,
  },
  {
    id: 'client_email',
    field: 'client.email',
    prompt: '¿Cuál es el correo electrónico del cliente?',
    type: 'text',
    required: false,
  },
  
  // Detalles del proyecto
  {
    id: 'fence_type',
    field: 'project.fenceType',
    prompt: '¿Qué tipo de cerca se instalará?',
    type: 'choice',
    options: ['Privacidad', 'Residencial', 'Comercial', 'Seguridad', 'Picket', 'Split Rail', 'Vinilo', 'Madera', 'Aluminio', 'Acero', 'Otro'],
    required: true,
  },
  {
    id: 'fence_material',
    field: 'project.fenceMaterial',
    prompt: '¿De qué material será la cerca?',
    type: 'text',
    required: true,
  },
  {
    id: 'fence_height',
    field: 'project.fenceHeight',
    prompt: '¿Cuál será la altura de la cerca (en pies)?',
    type: 'number',
    required: true,
  },
  {
    id: 'fence_length',
    field: 'project.fenceLength',
    prompt: '¿Cuál es la longitud total de la cerca (en pies lineales)?',
    type: 'number',
    required: true,
  },
  {
    id: 'gates',
    field: 'project.gates',
    prompt: '¿Cuántos portones o puertas incluirá la cerca?',
    type: 'number',
    required: true,
  },
  {
    id: 'gate_details',
    field: 'project.gateDetails',
    prompt: 'Describe los detalles de los portones (tamaños, ubicaciones, cerraduras, etc.):',
    type: 'multiline',
    required: false,
  },
  {
    id: 'scope_details',
    field: 'project.scopeDetails',
    prompt: '¿Hay detalles adicionales sobre el alcance del trabajo? (preparación del terreno, remoción de cerca existente, etc.)',
    type: 'multiline',
    required: false,
  },
  
  // Fechas y plazos
  {
    id: 'start_date',
    field: 'project.startDate',
    prompt: '¿Cuál es la fecha de inicio prevista para el proyecto? (DD/MM/AAAA)',
    type: 'date',
    required: true,
  },
  {
    id: 'estimated_duration',
    field: 'project.duration',
    prompt: '¿Cuál es la duración estimada del proyecto en días laborables?',
    type: 'number',
    required: true,
  },
  
  // Pagos y costos
  {
    id: 'total_cost',
    field: 'payment.totalCost',
    prompt: '¿Cuál es el costo total del proyecto?',
    type: 'number',
    required: true,
  },
  {
    id: 'deposit_amount',
    field: 'payment.depositAmount',
    prompt: '¿Cuál es el monto del depósito inicial requerido?',
    type: 'number',
    required: true,
  },
  {
    id: 'payment_schedule',
    field: 'payment.schedule',
    prompt: '¿Cuál será el calendario de pagos? (Por ejemplo: 50% al inicio, 50% al finalizar)',
    type: 'multiline',
    required: true,
  },
  
  // Garantías y términos adicionales
  {
    id: 'warranty_period',
    field: 'terms.warrantyPeriod',
    prompt: '¿Qué periodo de garantía ofrecerás (en años)?',
    type: 'number',
    required: true,
  },
  {
    id: 'warranty_coverage',
    field: 'terms.warrantyCoverage',
    prompt: '¿Qué cubre específicamente la garantía?',
    type: 'multiline',
    required: false,
  },
  {
    id: 'permits',
    field: 'terms.permits',
    prompt: '¿Quién será responsable de obtener los permisos necesarios?',
    type: 'choice',
    options: ['Contratista', 'Cliente', 'Ambos'],
    required: true,
  },
  {
    id: 'additional_terms',
    field: 'terms.additional',
    prompt: '¿Hay términos adicionales que deseas incluir en el contrato?',
    type: 'multiline',
    required: false,
  },
];

/**
 * Función para obtener la siguiente pregunta basada en respuestas previas
 * Ahora usa validación del servidor para garantizar la integridad de los datos
 * y permitir control centralizado del flujo de preguntas.
 */
export async function getNextQuestion(currentQuestionId: string | null, answers: Record<string, any>): Promise<Question | null> {
  try {
    // Llamar a la API para validar y obtener la siguiente pregunta
    const response = await fetch('/api/contracts/questions/next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentQuestionId,
        answers
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.validationError) {
        throw new Error(errorData.validationError);
      }
      throw new Error('Error al obtener la siguiente pregunta');
    }
    
    const data = await response.json();
    
    // Si el servidor indica que hemos completado el flujo
    if (data.completed) {
      return null;
    }
    
    // Devolver la siguiente pregunta proporcionada por el servidor
    return data.nextQuestion;
  } catch (error) {
    console.error('Error en validación de pregunta:', error);
    
    // Como fallback, usar la lógica local si el servidor falla
    console.warn('Usando lógica local como respaldo');
    
    // Si no hay pregunta actual, comenzar desde el principio
    if (!currentQuestionId) {
      return fenceContractQuestions[0];
    }
    
    // Encontrar índice de la pregunta actual
    const currentIndex = fenceContractQuestions.findIndex(q => q.id === currentQuestionId);
    if (currentIndex === -1 || currentIndex >= fenceContractQuestions.length - 1) {
      return null; // No hay más preguntas
    }
    
    // Lógica para saltar preguntas basadas en respuestas anteriores
    // Por ejemplo, si no hay puertas, saltar los detalles de puertas
    if (currentQuestionId === 'gates' && answers['project.gates'] === 0) {
      // Encontrar índice de gate_details para saltarlo
      const gateDetailsIndex = fenceContractQuestions.findIndex(q => q.id === 'gate_details');
      if (gateDetailsIndex > -1 && gateDetailsIndex === currentIndex + 1) {
        return fenceContractQuestions[gateDetailsIndex + 1];
      }
    }
    
    // Devolver la siguiente pregunta en secuencia
    return fenceContractQuestions[currentIndex + 1];
  }
}

/**
 * Convierte las respuestas de formato plano a estructura jerárquica
 */
export function formatAnswersForContract(answers: Record<string, any>): Record<string, any> {
  const formattedData: Record<string, any> = {};
  
  // Iterar sobre todas las respuestas
  Object.entries(answers).forEach(([field, value]) => {
    // Separar el campo por puntos para crear la estructura jerárquica
    const parts = field.split('.');
    let current = formattedData;
    
    // Construir la estructura anidada
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    // Asignar el valor al campo más profundo
    current[parts[parts.length - 1]] = value;
  });
  
  return formattedData;
}

/**
 * Transforma la estructura jerárquica a formato plano para el formulario
 */
export function mapFormDataToContractForm(data: Record<string, any>): Record<string, any> {
  // Mapeo específico para nuestro formulario de contrato
  return {
    clientName: data.client?.name || '',
    clientEmail: data.client?.email || '',
    clientPhone: data.client?.phone || '',
    clientAddress: data.client?.address || '',
    fenceType: data.project?.fenceType || '',
    fenceHeight: data.project?.fenceHeight?.toString() || '',
    fenceLength: data.project?.fenceLength?.toString() || '',
    projectTotal: data.payment?.totalCost?.toString() || '',
    // Se pueden añadir más campos según sea necesario
  };
}