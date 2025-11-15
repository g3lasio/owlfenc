/**
 * Unified Invoice Payload Builder
 * 
 * Este módulo proporciona una función compartida para construir
 * payloads de facturas desde diferentes fuentes (proyectos, estimados)
 * garantizando una estructura consistente.
 */

interface InvoiceItemData {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoicePayload {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo?: string;
  };
  invoice: {
    number: string;
    date: string;
    due_date: string;
    items: Array<{
      code: string;
      description: string;
      qty: number | string;
      unit_price: string;
      total: string;
    }>;
    subtotal: string;
    discounts?: string;
    discountAmount?: number;
    tax_rate: number;
    tax_amount: string;
    total: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contact?: string;
  };
  invoiceConfig?: {
    projectCompleted: boolean;
    downPaymentAmount?: string;
    totalAmountPaid: boolean;
  };
}

/**
 * Genera un número de factura único basado en el timestamp
 */
function generateInvoiceNumber(sourceId?: string): string {
  const timestamp = Date.now();
  if (sourceId) {
    return `INV-${sourceId}-${timestamp}`;
  }
  return `INV-${timestamp}`;
}

/**
 * Formatea una fecha de forma consistente para facturas
 */
function formatInvoiceDate(date?: Date): string {
  const targetDate = date || new Date();
  return targetDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Calcula la fecha de vencimiento (30 días por defecto)
 */
function calculateDueDate(issueDateStr?: string, daysToAdd: number = 30): string {
  const issueDate = issueDateStr ? new Date(issueDateStr) : new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + daysToAdd);
  
  return formatInvoiceDate(dueDate);
}

/**
 * Formatea un número como moneda sin el símbolo $
 */
function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Construye el payload de factura desde datos de un PROYECTO
 */
export function buildInvoicePayloadFromProject(
  project: any,
  profile: any
): InvoicePayload {
  const issueDate = formatInvoiceDate();
  const dueDate = calculateDueDate();
  
  // Obtener el total pagado desde paymentDetails
  const paymentDetails = typeof project.paymentDetails === 'string' 
    ? JSON.parse(project.paymentDetails) 
    : project.paymentDetails || {};
  
  const totalPaid = paymentDetails.totalPaid || 0;
  const projectTotal = (project.totalPrice || 0);
  
  // Crear item único del proyecto
  const projectItem: InvoiceItemData = {
    code: 'Item',
    description: `${project.projectType || 'construction'} - ${project.projectSubtype || ''}`,
    quantity: 1,
    unitPrice: projectTotal,
    total: projectTotal
  };
  
  // Calcular subtotal y tax (asumiendo tax incluido en el total)
  const taxRate = 0; // Por defecto 0% para proyectos simples
  const subtotal = projectTotal;
  const taxAmount = 0;
  
  return {
    company: {
      name: profile?.company || 'Company Name',
      address: [
        profile?.address,
        profile?.city,
        profile?.state,
        profile?.zipCode
      ].filter(Boolean).join(', ') || 'Company Address',
      phone: profile?.phone || 'Phone Number',
      email: profile?.email || '',
      website: profile?.website || 'Website',
      logo: profile?.logo || '',
    },
    invoice: {
      number: generateInvoiceNumber(project.projectId),
      date: issueDate,
      due_date: dueDate,
      items: [{
        code: projectItem.code || '',
        description: projectItem.description,
        qty: projectItem.quantity,
        unit_price: `$${formatCurrency(projectItem.unitPrice)}`,
        total: `$${formatCurrency(projectItem.total)}`
      }],
      subtotal: `$${formatCurrency(subtotal)}`,
      tax_rate: taxRate,
      tax_amount: `$${formatCurrency(taxAmount)}`,
      total: `$${formatCurrency(projectTotal)}`
    },
    client: {
      name: project.clientName || 'Client Name',
      email: project.clientEmail || '',
      phone: project.clientPhone || 'No phone provided',
      address: project.address || 'Dirección no especificada',
      contact: `${project.clientPhone || 'No phone provided'}\n${project.clientEmail || ''}`
    },
    invoiceConfig: {
      projectCompleted: project.status === 'completed',
      downPaymentAmount: totalPaid > 0 ? `$${formatCurrency(totalPaid)}` : undefined,
      totalAmountPaid: totalPaid >= projectTotal
    }
  };
}

/**
 * Construye el payload de factura desde datos de un ESTIMADO
 */
export function buildInvoicePayloadFromEstimate(
  estimate: any,
  profile: any,
  invoiceConfig?: {
    projectCompleted: boolean;
    downPaymentAmount: string;
    totalAmountPaid: boolean;
  }
): InvoicePayload {
  const issueDate = formatInvoiceDate();
  const dueDate = calculateDueDate();
  
  // Mapear items del estimado al formato de factura
  // EstimatesWizard usa unitPrice y totalPrice, no price y total
  const invoiceItems = (estimate.items || []).map((item: any) => {
    const unitPrice = typeof item.unitPrice === 'string'
      ? parseFloat(item.unitPrice.replace(/[$,]/g, ''))
      : Number(item.unitPrice || 0);
    
    const totalPrice = typeof item.totalPrice === 'string'
      ? parseFloat(item.totalPrice.replace(/[$,]/g, ''))
      : Number(item.totalPrice || (item.quantity * unitPrice) || 0);

    return {
      code: item.name || 'Item',
      description: item.description || item.name || 'Service',
      qty: item.quantity || 1,
      unit_price: `$${formatCurrency(unitPrice)}`,
      total: `$${formatCurrency(totalPrice)}`
    };
  });
  
  return {
    company: {
      name: profile?.company || 'Company Name',
      address: [
        profile?.address,
        profile?.city,
        profile?.state,
        profile?.zipCode
      ].filter(Boolean).join(', ') || 'Company Address',
      phone: profile?.phone || 'Phone Number',
      email: profile?.email || '',
      website: profile?.website || 'Website',
      logo: profile?.logo || '',
    },
    invoice: {
      number: generateInvoiceNumber(),
      date: issueDate,
      due_date: dueDate,
      items: invoiceItems,
      subtotal: `$${formatCurrency(estimate.subtotal || 0)}`,
      discounts: estimate.discountAmount > 0 ? `-$${formatCurrency(estimate.discountAmount)}` : undefined,
      discountAmount: estimate.discountAmount || 0,
      tax_rate: Number(estimate.taxRate) || 0,
      tax_amount: `$${formatCurrency(estimate.tax || 0)}`,
      total: `$${formatCurrency(estimate.total || 0)}`
    },
    client: {
      name: estimate.client?.name || 'Client Name',
      email: estimate.client?.email || '',
      phone: estimate.client?.phone || 'No phone provided',
      address: estimate.client?.address || 'No address provided',
      contact: `${estimate.client?.phone || 'No phone provided'}\n${estimate.client?.email || ''}`
    },
    invoiceConfig: invoiceConfig || {
      projectCompleted: true,
      downPaymentAmount: '',
      totalAmountPaid: true
    }
  };
}

/**
 * Función principal para construir payload de factura
 * Auto-detecta el tipo de fuente y llama a la función correspondiente
 */
export function buildInvoicePayload(
  source: any,
  profile: any,
  sourceType: 'project' | 'estimate',
  config?: any
): InvoicePayload {
  if (sourceType === 'project') {
    return buildInvoicePayloadFromProject(source, profile);
  } else {
    return buildInvoicePayloadFromEstimate(source, profile, config);
  }
}
