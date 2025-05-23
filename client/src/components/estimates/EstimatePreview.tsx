import { useEffect, useState } from 'react';
import { loadTemplateById } from '../../lib/templateLoader';

// ID de la plantilla Premium predefinida
const PREMIUM_TEMPLATE_ID = 999001;

interface EstimatePreviewProps {
  estimateData: any;
  templateId?: number;
  className?: string;
}

export default function EstimatePreview({ estimateData, templateId = PREMIUM_TEMPLATE_ID, className = '' }: EstimatePreviewProps) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    async function loadHtml() {
      try {
        // Cargar la plantilla Premium
        const templateHtml = await loadTemplateById(PREMIUM_TEMPLATE_ID);

        // Aplicar los datos del estimado a la plantilla
        const filledHtml = applyDataToTemplate(templateHtml, estimateData);

        setHtml(filledHtml);
      } catch (error) {
        console.error('Error loading estimate template:', error);
        setHtml('<div>Error loading estimate template</div>');
      }
    }

    loadHtml();
  }, [estimateData]);

  return (
    <div className={`estimate-preview ${className}`}>
      <iframe 
        srcDoc={html} 
        title="Estimate Preview" 
        width="100%" 
        height="600px"
        style={{ border: 'none', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
      />
    </div>
  );
}

/**
 * Aplica los datos del estimado a la plantilla HTML
 */
function applyDataToTemplate(template: string, data: any): string {
  let result = template;

  // Datos de la compañía
  result = result.replace(/\[Company Name\]/g, data.contractor?.name || 'Your Company');
  result = result.replace(/\[Company Address, City, State, ZIP\]/g, data.contractor?.address || 'Company Address');
  result = result.replace(/\[COMPANY_EMAIL\]/g, data.contractor?.email || 'contact@example.com');
  result = result.replace(/\[COMPANY_PHONE\]/g, data.contractor?.phone || '(555) 123-4567');
  result = result.replace(/\[COMPANY_LOGO_URL\]/g, data.contractor?.logo || '');

  // Datos del estimado
  result = result.replace(/\[Estimate Date\]/g, data.date || new Date().toLocaleDateString());
  result = result.replace(/\[Estimate Number\]/g, data.estimateNumber || 'EST-' + Date.now().toString().slice(-6));
  result = result.replace(/\[Estimate Valid Until\]/g, data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString());

  // Datos del cliente
  result = result.replace(/\[Client Name\]/g, data.client?.name || 'Client Name');
  result = result.replace(/\[Client Email\]/g, data.client?.email || 'client@example.com');
  result = result.replace(/\[Client Phone\]/g, data.client?.phone || '(555) 987-6543');
  result = result.replace(/\[Client Address\]/g, data.client?.address || 'Client Address');

  // Datos del proyecto
  result = result.replace(/\[Scope of Work\]/g, data.project?.scope || 'Detailed scope of work to be performed');
  result = result.replace(/\[Estimated Completion Timeframe\]/g, data.project?.timeframe || '2-3 weeks');
  result = result.replace(/\[Work Process\/Steps\]/g, data.project?.process || 'Step-by-step process of work to be completed');
  result = result.replace(/\[Included Services or Materials\]/g, data.project?.includes || 'All materials, labor, and cleanup');
  result = result.replace(/\[Excluded Services or Materials\]/g, data.project?.excludes || 'Permits, inspections, and unforeseen conditions');

  // Año actual para el copyright
  result = result.replace(/\[YEAR\]/g, new Date().getFullYear().toString());
  result = result.replace(/\[Your Company Name\]/g, data.contractor?.name || 'Your Company');

  // Procesar los elementos del estimado
  if (data.items && Array.isArray(data.items)) {
    const itemsHtml = data.items.map((item: any) => `
      <tr>
        <td>${item.name || ''}</td>
        <td>${item.description || ''}</td>
        <td>${item.quantity || ''}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    // Reemplazar el marcador de posición para los items
    result = result.replace(
      /<tr>\s*<td>\[Item Name\]<\/td>\s*<td>\[Item Description\]<\/td>\s*<td>\[Qty\]<\/td>\s*<td>\[Unit Price\]<\/td>\s*<td>\[Total\]<\/td>\s*<\/tr>/,
      itemsHtml
    );

    // Calcular el total
    const grandTotal = data.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    result = result.replace(/\[Grand Total\]/g, formatCurrency(grandTotal));
  }

  return result;
}

/**
 * Formatea un número como moneda
 */
function formatCurrency(value: number | string): string {
  if (value === undefined || value === null) return '$0.00';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
}