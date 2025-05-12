// server/services/contractQuestionsFlow.ts

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

export const contractQuestions: Question[] = [
  {
    id: 'contractor_name',
    field: 'contractor.name',
    prompt: '1. Please enter the full legal name of the Contractor (your company or personal name):',
    type: 'text',
    required: true,
  },
  {
    id: 'contractor_address',
    field: 'contractor.address',
    prompt: '2. Enter the Contractor’s full address (street, city, state, ZIP):',
    type: 'multiline',
    required: true,
  },
  {
    id: 'contractor_phone',
    field: 'contractor.phone',
    prompt: '3. Enter the Contractor’s contact phone number:',
    type: 'text',
    required: true,
  },
  {
    id: 'contractor_email',
    field: 'contractor.email',
    prompt: '4. Enter the Contractor’s email address:',
    type: 'text',
    required: true,
  },
  {
    id: 'client_name',
    field: 'client.name',
    prompt: '5. Please enter the full name of the Client:',
    type: 'text',
    required: true,
  },
  {
    id: 'client_address',
    field: 'client.address',
    prompt: '6. Enter the Client’s full address (street, city, state, ZIP):',
    type: 'multiline',
    required: true,
  },
  {
    id: 'client_phone',
    field: 'client.phone',
    prompt: '7. Enter the Client’s contact phone number:',
    type: 'text',
    required: true,
  },
  {
    id: 'client_email',
    field: 'client.email',
    prompt: '8. Enter the Client’s email address:',
    type: 'text',
    required: true,
  },
  {
    id: 'background',
    field: 'background',
    prompt: '9. Briefly describe the background and purpose of this Agreement:',
    type: 'multiline',
    required: true,
  },
  {
    id: 'scope_of_work',
    field: 'project.scope',
    prompt: '10. Provide a detailed description of the services to be performed:',
    type: 'multiline',
    required: true,
  },
  {
    id: 'start_date',
    field: 'project.startDate',
    prompt: '11. What is the planned start date of the project? (MM/DD/YYYY)',
    type: 'date',
    required: true,
  },
  {
    id: 'completion_date',
    field: 'project.endDate',
    prompt: '12. What is the estimated completion date? (MM/DD/YYYY)',
    type: 'date',
    required: true,
  },
  {
    id: 'total_cost',
    field: 'payment.totalCost',
    prompt: '13. What is the total contract amount (e.g., 3035.64)?',
    type: 'number',
    required: true,
  },
  {
    id: 'deposit_pct',
    field: 'payment.depositPct',
    prompt: '14. What deposit percentage will be required (e.g., 30)?',
    type: 'number',
    required: true,
  },
  {
    id: 'payment_terms',
    field: 'payment.terms',
    prompt: '15. Describe the payment schedule and methods (e.g., balance due on completion):',
    type: 'multiline',
    required: true,
  },
  {
    id: 'expenses_reimbursement',
    field: 'payment.expenses',
    prompt: '16. Will there be reimbursable expenses (materials, permits)? If yes, describe approval procedure:',
    type: 'multiline',
    required: false,
  },
  {
    id: 'late_payment_interest',
    field: 'payment.lateInterest',
    prompt: '17. What interest rate applies to late payments (e.g., 5% per annum)?',
    type: 'text',
    required: true,
  },
  {
    id: 'confidentiality',
    field: 'confidentiality',
    prompt: '18. Any special confidentiality obligations beyond the standard? (yes/no + details):',
    type: 'multiline',
    required: false,
  },
  {
    id: 'state',
    field: 'governing.state',
    prompt: '19. In which State will this Agreement be governed? (for placeholder [State]):',
    type: 'text',
    required: true,
  },
  {
    id: 'county',
    field: 'governing.county',
    prompt: '20. In which County will arbitration occur? (for placeholder [County]):',
    type: 'text',
    required: true,
  },
  {
    id: 'site_access',
    field: 'site.access',
    prompt: '21. Describe any site access requirements or safety protocols:',
    type: 'multiline',
    required: false,
  },
  {
    id: 'weather_delays',
    field: 'project.weatherDelays',
    prompt: '22. Any notes on handling weather-related delays? If none, type "standard":',
    type: 'text',
    required: false,
  },
  {
    id: 'code_compliance',
    field: 'project.codeCompliance',
    prompt: '23. Should changes in codes after contract date be client’s responsibility? (yes/no):',
    type: 'choice',
    options: ['yes', 'no'],
    required: true,
  },
  {
    id: 'additional_clauses',
    field: 'additionalClauses',
    prompt: '24. Any additional clauses you want to include? (e.g., non-solicitation, insurance requirements):',
    type: 'multiline',
    required: false,
  },
];

