// client/src/services/newContractQuestionService.ts

export type QuestionType = 
  | 'text' 
  | 'multiline' 
  | 'date' 
  | 'number' 
  | 'choice'
  | 'address'
  | 'ai-enhanced';

export interface Question {
  /** Unique identifier for the question */
  id: string;
  /** Name of the property where the answer will be stored */
  field: string;
  /** Text shown to the user */
  prompt: string;
  /** Type of input expected */
  type: QuestionType;
  /** Options if this is a choice type */
  options?: string[];
  /** Indicator if it's required */
  required?: boolean;
  /** Indicator to use company profile data */
  useCompanyProfile?: boolean;
  /** Additional description or help */
  description?: string;
  /** Project type this applies to, null or empty for all */
  projectTypes?: string[];
}

/**
 * Project categories for contractor work
 */
export const projectCategories = [
  { id: 'general', name: 'General Contractor', icon: 'tool' },
  { id: 'fencing', name: 'Fencing and Gates', icon: 'fence' },
  { id: 'roofing', name: 'Roofing', icon: 'home' },
  { id: 'plumbing', name: 'Plumbing', icon: 'droplet' },
  { id: 'electrical', name: 'Electrical', icon: 'zap' },
  { id: 'carpentry', name: 'Carpentry', icon: 'hammer' },
  { id: 'concrete', name: 'Concrete', icon: 'square' },
  { id: 'landscaping', name: 'Landscaping', icon: 'tree' },
  { id: 'painting', name: 'Painting', icon: 'paint-bucket' },
  { id: 'flooring', name: 'Flooring', icon: 'grid' },
  { id: 'hvac', name: 'HVAC', icon: 'thermometer' },
  { id: 'other', name: 'Other', icon: 'more-horizontal' }
];

/**
 * Independent Contractor Agreement questions
 * Following the structure of 2 questions per screen
 */
export const contractQuestions: Question[] = [
  // Group 1: Client Information (Part 1)
  {
    id: 'client_name',
    field: 'client.name',
    prompt: "What is the client's full name?",
    type: 'text',
    required: true,
  },
  {
    id: 'client_address',
    field: 'client.address',
    prompt: "What is the client's address?",
    type: 'address',
    required: true,
    description: "Enter the complete address"
  },
  
  // Group 2: Client Information (Part 2)
  {
    id: 'client_phone',
    field: 'client.phone',
    prompt: "What is the client's phone number?",
    type: 'text',
    required: true,
  },
  {
    id: 'client_email',
    field: 'client.email',
    prompt: "What is the client's email address?",
    type: 'text',
    required: true,
  },
  
  // Group 3: Contractor Information (Part 1)
  {
    id: 'contractor_company_name',
    field: 'contractor.companyName',
    prompt: "What is the contractor's company name?",
    type: 'text',
    required: true,
    useCompanyProfile: true,
    description: "Your business or company name"
  },
  {
    id: 'contractor_contact_name',
    field: 'contractor.contactName',
    prompt: "Who is the main contact for the contractor?",
    type: 'text',
    required: true,
    useCompanyProfile: true,
    description: "Primary contact person name"
  },
  
  // Group 4: Contractor Information (Part 2)
  {
    id: 'contractor_address',
    field: 'contractor.address',
    prompt: "What is the contractor's address?",
    type: 'address',
    required: true,
    useCompanyProfile: true,
  },
  {
    id: 'contractor_phone',
    field: 'contractor.phone',
    prompt: "What is the contractor's phone number?",
    type: 'text',
    required: true,
    useCompanyProfile: true,
  },
  
  // Group 5: Contractor Information (Part 3)
  {
    id: 'contractor_email',
    field: 'contractor.email',
    prompt: "What is the contractor's email address?",
    type: 'text',
    required: true,
    useCompanyProfile: true,
  },
  {
    id: 'contractor_license',
    field: 'contractor.license',
    prompt: "What is the contractor's license number? (if applicable)",
    type: 'text',
    required: false,
    useCompanyProfile: true,
    description: "Leave blank if not applicable"
  },
  
  // Group 6: Key Dates (Part 1)
  {
    id: 'contract_issue_date',
    field: 'contract.issueDate',
    prompt: "What is the contract issue date?",
    type: 'date',
    required: true,
  },
  {
    id: 'contract_start_date',
    field: 'contract.startDate',
    prompt: "What is the agreement start date?",
    type: 'date',
    required: true,
  },
  
  // Group 7: Key Dates (Part 2)
  {
    id: 'contract_completion_date',
    field: 'contract.completionDate',
    prompt: "What is the estimated project completion date?",
    type: 'text',
    required: true,
    description: "Can be a specific date or 'upon completion' if open-ended"
  },
  // Placeholder for 2nd question
  {
    id: 'project_type',
    field: 'project.type',
    prompt: "What type of project is this?",
    type: 'choice',
    options: projectCategories.map(cat => cat.name),
    required: true,
  },
  
  // Group 8: Project Property Address
  {
    id: 'project_property_address',
    field: 'project.propertyAddress',
    prompt: "What is the property address where the work will be performed?",
    type: 'address',
    required: true,
  },
  {
    id: 'project_state',
    field: 'legal.governingState',
    prompt: "In which state will the agreement be governed?",
    type: 'text',
    required: true,
    description: "This will be automatically filled based on the address above"
  },
  
  // Group 9: Project Scope (Combinado con background)
  {
    id: 'project_scope',
    field: 'project.scope',
    prompt: "Please describe in detail the scope of work, including background and all deliverables.",
    type: 'ai-enhanced',
    required: true,
    description: "Include context, what will be done, materials, timelines, etc."
  },
  // Placeholder - This question is intentionally left empty since we already ask for project type earlier
  {
    id: 'material_requirements',
    field: 'project.materialRequirements',
    prompt: "Are there any specific material requirements or specifications?",
    type: 'multiline',
    required: false,
    description: "Specify any particular brands, qualities, or standards needed"
  },
  
  // Group 10: Payment Terms (Part 1)
  {
    id: 'payment_total_amount',
    field: 'payment.totalAmount',
    prompt: "What is the total contract amount (in USD)?",
    type: 'text',
    required: true,
    description: "Total price for the project"
  },
  {
    id: 'payment_split',
    field: 'payment.splitFiftyFifty',
    prompt: "Will payments be split 50% upon signing and 50% upon completion?",
    type: 'choice',
    options: ['Yes', 'No'],
    required: true,
  },
  
  // Group 11: Payment Terms (Part 2)
  {
    id: 'payment_schedule',
    field: 'payment.schedule',
    prompt: "If not using 50/50 split, please specify the payment schedule.",
    type: 'multiline',
    required: false,
    description: "Describe when payments are due and what percentage each payment represents"
  },
  {
    id: 'payment_late_penalty',
    field: 'payment.latePenalty',
    prompt: "What is the late payment penalty rate?",
    type: 'text',
    required: true,
    description: "Example: 2% per week"
  },
  
  // Group 12: Expenses & Reimbursements
  {
    id: 'expenses_details',
    field: 'expenses.details',
    prompt: "Are there any anticipated reimbursable expenses? If yes, please specify.",
    type: 'multiline',
    required: false,
  },
  {
    id: 'expenses_approval_required',
    field: 'expenses.approvalRequired',
    prompt: "Will all expenses require prior written approval from the client?",
    type: 'choice',
    options: ['Yes', 'No'],
    required: true,
  },
  
  // Group 13: Equipment & Materials
  {
    id: 'equipment_provider',
    field: 'equipment.provider',
    prompt: "Who will provide the necessary equipment and materials?",
    type: 'choice',
    options: ['Contractor', 'Client', 'Both'],
    required: true,
  },
  {
    id: 'equipment_client_tools',
    field: 'equipment.clientOwnedTools',
    prompt: "Will the contractor use any client-owned tools or property?",
    type: 'text',
    required: false,
    description: "If yes, please specify which items"
  },
  
  // Group 14: Autonomy, Legal & Jurisdiction (Part 1)
  {
    id: 'legal_governing_state',
    field: 'legal.governingState',
    prompt: "In which state (and city, if relevant) will the agreement be governed?",
    type: 'text',
    required: true,
  },
  {
    id: 'legal_requirements',
    field: 'legal.requirements',
    prompt: "Are there any special legal or regulatory requirements, permits, or restrictions for this project?",
    type: 'multiline',
    required: false,
  },
  
  // Group 15: Autonomy, Legal & Jurisdiction (Part 2)
  {
    id: 'legal_confidentiality',
    field: 'legal.confidentialityClause',
    prompt: "Are there any confidentiality, return of property, or intellectual property conditions to note?",
    type: 'multiline',
    required: false,
    description: "If yes, specify any special conditions"
  },
  // Placeholder for 2nd question
  {
    id: 'legal_restrictions',
    field: 'legal.restrictions',
    prompt: "Are there any restrictions on the use of subcontractors for this project?",
    type: 'multiline',
    required: false,
  },
  
  // Group 16: Notices & Signatures (Part 1)
  {
    id: 'legal_notice_address',
    field: 'legal.noticeAddress',
    prompt: "To which address or email should all official notices be sent?",
    type: 'text',
    required: true,
    description: "Confirm if same as above or specify a different address"
  },
  {
    id: 'signatures_client',
    field: 'signatures.clientName',
    prompt: "Who will sign the agreement on behalf of the client?",
    type: 'text',
    required: true,
  },
  
  // Group 17: Notices & Signatures (Part 2)
  {
    id: 'signatures_contractor',
    field: 'signatures.contractorName',
    prompt: "Who will sign on behalf of the contractor?",
    type: 'text',
    required: true,
    useCompanyProfile: true,
  },
  // Placeholder for 2nd question
  {
    id: 'signatures_witness',
    field: 'signatures.witnessRequired',
    prompt: "Does this contract require witness signatures?",
    type: 'choice',
    options: ['Yes', 'No'],
    required: false,
  },
  
  // Group 18: Final Confirmation
  {
    id: 'legal_special_clauses',
    field: 'legal.specialClauses',
    prompt: "Are there any special clauses, additional agreements, or instructions to include?",
    type: 'ai-enhanced',
    required: false,
    description: "Add any specific terms or conditions not covered in standard sections"
  },
  {
    id: 'contract_notes',
    field: 'contract.notes',
    prompt: "Any additional notes about this contract?",
    type: 'multiline',
    required: false,
  },
];

/**
 * Organize questions into groups of 2 for the survey flow
 */
export function createQuestionGroups() {
  const groups = [];
  
  // Group questions in pairs, with appropriate titles
  for (let i = 0; i < contractQuestions.length; i += 2) {
    const question1 = contractQuestions[i];
    const question2 = i + 1 < contractQuestions.length ? contractQuestions[i + 1] : null;
    
    // Determine the title based on the category of questions
    let title = "Contract Information";
    let description = "";
    
    if (question1.field.startsWith('client.')) {
      title = "Client Information";
      description = "Details about the client for this contract";
    } else if (question1.field.startsWith('contractor.')) {
      title = "Contractor Information";
      description = "Your company information for the contract";
    } else if (question1.field.startsWith('contract.')) {
      title = "Contract Details";
      description = "Key dates and information about the contract itself";
    } else if (question1.field.startsWith('project.')) {
      title = "Project Details";
      description = "Information about the project scope and requirements";
    } else if (question1.field.startsWith('payment.')) {
      title = "Payment Terms";
      description = "How and when payment will be made";
    } else if (question1.field.startsWith('expenses.')) {
      title = "Expenses & Reimbursements";
      description = "Handling of additional expenses beyond the contract amount";
    } else if (question1.field.startsWith('equipment.')) {
      title = "Equipment & Materials";
      description = "Who provides tools and materials for the project";
    } else if (question1.field.startsWith('legal.')) {
      title = "Legal & Compliance";
      description = "Legal requirements and special provisions";
    } else if (question1.field.startsWith('signatures.')) {
      title = "Signatures & Execution";
      description = "Who will sign the final agreement";
    }
    
    const questions = question2 ? [question1, question2] : [question1];
    groups.push({ title, description, questions });
  }
  
  return groups;
}

/**
 * Convert flat answers to hierarchical structure for contract
 */
export function formatAnswersForContract(answers: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(answers)) {
    const parts = key.split('.');
    let current = formatted;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  // ===== MEJORAS PARA LA VISTA PREVIA DEL CONTRATO =====
  
  // Usar el perfil de la empresa si está disponible y datos están faltantes
  try {
    // Inicializar contratista si no existe
    if (!formatted.contractor) {
      formatted.contractor = {};
    }
    
    // Intentar obtener datos del perfil del localStorage
    const profileString = localStorage.getItem('companyProfile');
    if (profileString) {
      const profile = JSON.parse(profileString);
      
      // Completar información del contratista si falta
      if (!formatted.contractor.companyName) {
        formatted.contractor.companyName = profile.companyName || '';
      }
      
      if (!formatted.contractor.contactName) {
        formatted.contractor.contactName = profile.ownerName || '';
      }
      
      if (!formatted.contractor.address && profile.address) {
        formatted.contractor.address = [
          profile.address,
          profile.city,
          profile.state,
          profile.zip
        ].filter(Boolean).join(', ');
      }
      
      if (!formatted.contractor.phone) {
        formatted.contractor.phone = profile.phone || profile.mobilePhone || '';
      }
      
      if (!formatted.contractor.email) {
        formatted.contractor.email = profile.email || '';
      }
      
      if (!formatted.contractor.license) {
        formatted.contractor.license = profile.licenseNumber || '';
      }
    }
  } catch (error) {
    console.error('Error al procesar datos del perfil:', error);
    // Continuar sin datos del perfil
  }
  
  // Handle default payment schedule based on 50/50 selection
  if (formatted.payment?.splitFiftyFifty === 'Yes' && (!formatted.payment?.schedule || formatted.payment?.schedule.trim() === '')) {
    formatted.payment.schedule = '50% al firmar, 50% al completar';
  }
  
  // Set formatted dates for the contract template
  if (formatted.contract?.issueDate) {
    formatted.contract.date = formatted.contract.issueDate;
  }
  
  if (formatted.contract?.startDate) {
    formatted.dates = formatted.dates || {};
    formatted.dates.startDate = formatted.contract.startDate;
  }
  
  if (formatted.contract?.completionDate) {
    formatted.dates = formatted.dates || {};
    formatted.dates.endDate = formatted.contract.completionDate;
  }
  
  // Format payment information for the template
  if (formatted.payment?.totalAmount) {
    // Asegurar que el monto total es un número válido
    let totalAmount = formatted.payment.totalAmount;
    if (typeof totalAmount === 'string') {
      // Eliminar caracteres no numéricos excepto el punto decimal
      totalAmount = totalAmount.replace(/[^0-9.]/g, '');
    }
    
    const numericAmount = parseFloat(totalAmount);
    
    if (!isNaN(numericAmount)) {
      formatted.payment.initialPayment = formatted.payment.splitFiftyFifty === 'Yes' 
        ? `$${(numericAmount * 0.5).toFixed(2)}` 
        : '(Ver cronograma de pagos)';
        
      formatted.payment.finalPayment = formatted.payment.splitFiftyFifty === 'Yes'
        ? `$${(numericAmount * 0.5).toFixed(2)}`
        : '(Ver cronograma de pagos)';
        
      // Format total amount with dollar sign
      if (typeof formatted.payment.totalAmount === 'string' && !formatted.payment.totalAmount.includes('$')) {
        formatted.payment.totalAmount = `$${numericAmount.toFixed(2)}`;
      }
    }
  }
  
  // Format penalty for late payments
  if (!formatted.payment) {
    formatted.payment = {};
  }
  
  if (formatted.payment.latePenalty) {
    formatted.payment.lateFee = formatted.payment.latePenalty.replace(/[^0-9.]/g, '');
  } else {
    formatted.payment.lateFee = '2'; // Default value
  }
  
  // Format background information
  if (formatted.project?.background) {
    formatted.background = formatted.background || {};
    formatted.background.description = formatted.project.background;
  }
  
  // Format scope description
  if (formatted.project?.scope) {
    formatted.scope = formatted.scope || {};
    formatted.scope.description = formatted.project.scope;
  }
  
  // Format equipment description
  if (formatted.equipment?.provider) {
    formatted.equipment = formatted.equipment || {};
    let equipmentDescription = `${formatted.equipment.provider} proporcionará todas las herramientas, equipos y materiales necesarios para realizar el trabajo.`;
    
    if (formatted.equipment.clientOwnedTools) {
      equipmentDescription += ` El cliente proporcionará lo siguiente: ${formatted.equipment.clientOwnedTools}.`;
    }
    
    formatted.equipment.description = equipmentDescription;
  }
  
  // Format expenses description
  if (formatted.expenses) {
    let expensesDescription = 'El Cliente acepta reembolsar al Contratista todos los gastos razonables y necesarios incurridos durante la ejecución del trabajo';
    
    if (formatted.expenses.approvalRequired === 'Yes') {
      expensesDescription += ', siempre que dichos gastos tengan aprobación previa por escrito del Cliente.';
    } else {
      expensesDescription += '.';
    }
    
    if (formatted.expenses.details) {
      expensesDescription += ` Los gastos reembolsables anticipados incluyen: ${formatted.expenses.details}`;
    }
    
    formatted.expenses.description = expensesDescription;
  }
  
  // Format legal notices
  if (formatted.legal?.noticeAddress) {
    formatted.legal.noticeTerms = `Cualquier notificación requerida bajo este Acuerdo deberá ser por escrito y entregada a las partes en sus direcciones establecidas anteriormente, o a la siguiente dirección alternativa: ${formatted.legal.noticeAddress}, mediante entrega personal, correo certificado o servicio de mensajería reconocido.`;
  }
  
  // Format additional terms
  if (formatted.legal?.specialClauses) {
    formatted.additional = formatted.additional || {};
    formatted.additional.terms = formatted.legal.specialClauses;
  }
  
  return formatted;
}

/**
 * Transform hierarchical structure to flat format for the form
 */
export function mapFormDataToContractForm(data: Record<string, any>): Record<string, any> {
  const flat: Record<string, any> = {};
  
  function flatten(obj: Record<string, any>, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, newKey);
      } else {
        flat[newKey] = value;
      }
    }
  }
  
  flatten(data);
  return flat;
}