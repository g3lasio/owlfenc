import React, { useEffect, useState } from 'react';
import { loadTemplateHTML } from '../../lib/templateLoader';
import { getTemplateHTML } from '../../lib/templateService';

interface EstimatePreviewProps {
  estimateData: any;
  templateId?: number;
  className?: string;
}

const EstimatePreview: React.FC<EstimatePreviewProps> = ({ 
  estimateData, 
  templateId = 999001, // ID por defecto para basic template
  className = '' 
}) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Siempre usamos el template premium independientemente del ID
  const getTemplateStyle = (id: number): string => {
    return 'professional'; // Siempre usamos el estilo professional (Premium)
  };

  // Cargar el HTML de la plantilla cada vez que cambia el templateId
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);

        // Siempre usamos el template premium
        console.log(`Cargando plantilla Premium (ID: ${templateId} - ignorado)`);

        // Cargar el HTML de la plantilla
        let templateHtml;
        try {
          templateHtml = await loadTemplateHTML('professional');
          if (templateHtml) {
            console.log(`Plantilla Premium cargada exitosamente. Longitud: ${templateHtml.length} caracteres`);
          } else {
            console.error('La función loadTemplateHTML devolvió un valor nulo o vacío');
          }
        } catch (templateError) {
          console.error('Error al cargar la plantilla:', templateError);
          setHtml(`<div class="error">Error al cargar la plantilla: ${templateError.message}</div>`);
          setLoading(false);
          return;
        }

        if (!templateHtml) {
          console.error('No se pudo cargar la plantilla HTML');
          setHtml(`
            <div class="error" style="padding: 20px; background-color: #fff1f2; border-left: 4px solid #e11d48; margin: 20px 0;">
              <h3 style="color: #be123c; margin-top: 0;">Error al cargar la plantilla</h3>
              <p>No se pudo cargar la plantilla Premium</p>
            </div>
          `);
          setLoading(false);
          return;
        }

        // Aplicar los datos del estimado al HTML
        let processedHtml = templateHtml;

        // Reemplazar campos básicos
        const replacements: Record<string, string> = {
          '[COMPANY_NAME]': estimateData.contractor?.name || 'Nombre de la Empresa',
          '[COMPANY_ADDRESS]': estimateData.contractor?.address || 'Dirección de la Empresa',
          '[COMPANY_PHONE]': estimateData.contractor?.phone || 'Teléfono',
          '[COMPANY_EMAIL]': estimateData.contractor?.email || 'Email',
          '[COMPANY_LICENSE]': estimateData.contractor?.license || 'Licencia',
          '[ESTIMATE_DATE]': new Date().toLocaleDateString(),
          '[ESTIMATE_NUMBER]': estimateData.projectId || 'N/A',
          '[CLIENT_NAME]': estimateData.client?.name || 'Cliente',
          '[CLIENT_ADDRESS]': estimateData.client?.address || 'Dirección',
          '[CLIENT_CITY_STATE_ZIP]': `${estimateData.client?.city || ''} ${estimateData.client?.state || ''} ${estimateData.client?.zip || ''}`,
          '[CLIENT_PHONE]': estimateData.client?.phone || 'Teléfono',
          '[CLIENT_EMAIL]': estimateData.client?.email || 'Email',
          '[PROJECT_TYPE]': `${estimateData.project?.type || ''} - ${estimateData.project?.subtype || ''}`,
          '[PROJECT_ADDRESS]': estimateData.client?.address || '',
          '[PROJECT_DIMENSIONS]': formatDimensions(estimateData.project?.dimensions),
          '[PROJECT_NOTES]': estimateData.project?.notes || '',
          '[SUBTOTAL]': formatCurrency(getSubtotal(estimateData)),
          '[TAX_RATE]': '8.75%',
          '[TAX_AMOUNT]': formatCurrency(getTaxAmount(estimateData)),
          '[TOTAL]': formatCurrency(getTotal(estimateData)),
          '[COMPLETION_TIME]': getCompletionTime(estimateData)
        };

        // Reemplazar cada placeholder en el template
        Object.entries(replacements).forEach(([placeholder, value]) => {
          processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
        });

        // Para el logo de la empresa
        if (estimateData.contractor?.logo) {
          processedHtml = processedHtml.replace('[COMPANY_LOGO]', 
            `<img src="${estimateData.contractor.logo}" alt="Logo" style="max-width: 100%; max-height: 100px; object-fit: contain;" />`);
        } else {
          processedHtml = processedHtml.replace('[COMPANY_LOGO]', '');
        }

        // Generar las filas de la tabla
        const tableRowsHtml = generateEstimateTableRows(estimateData);
        processedHtml = processedHtml.replace('[COST_TABLE_ROWS]', tableRowsHtml);

        setHtml(processedHtml);
      } catch (error) {
        console.error('Error generando la previsualización:', error);
        setHtml('<div class="error">Error al generar la previsualización</div>');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [estimateData, templateId]);

  // Funciones helper para formatear los datos
  function formatDimensions(dimensions: any): string {
    if (!dimensions) return 'N/A';

    const parts = [];
    if (dimensions.length) parts.push(`Longitud: ${dimensions.length} pies`);
    if (dimensions.width) parts.push(`Ancho: ${dimensions.width} pies`);
    if (dimensions.height) parts.push(`Altura: ${dimensions.height} pies`);
    if (dimensions.area) parts.push(`Área: ${dimensions.area} pies²`);

    return parts.join(', ') || 'N/A';
  }

  function getSubtotal(data: any): number {
    if (!data.rulesBasedEstimate) return 0;

    const materialTotal = data.rulesBasedEstimate.materialTotal || 0;
    const laborTotal = data.rulesBasedEstimate.labor?.totalCost || 0;
    const additionalTotal = data.rulesBasedEstimate.additionalTotal || 0;

    return materialTotal + laborTotal + additionalTotal;
  }

  function getTaxAmount(data: any): number {
    const subtotal = getSubtotal(data);
    return subtotal * 0.0875; // 8.75% tax rate
  }

  function getTotal(data: any): number {
    const subtotal = getSubtotal(data);
    const taxAmount = getTaxAmount(data);
    return subtotal + taxAmount;
  }

  function getCompletionTime(data: any): string {
    return data.rulesBasedEstimate?.estimatedDays || 'N/A';
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function generateEstimateTableRows(data: any): string {
    let html = '';

    // Materiales
    if (data.rulesBasedEstimate?.materials) {
      const materials = data.rulesBasedEstimate.materials;

      Object.entries(materials).forEach(([key, value]: [string, any]) => {
        if (key === 'roofing') {
          html += `
            <tr>
              <td>Material de Techo (${value.type || ''})</td>
              <td>${value.areaSqFt || 0} pies²</td>
              <td>Pie²</td>
              <td>${formatCurrency(value.costPerSqFt || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'posts') {
          html += `
            <tr>
              <td>Postes (${value.type || ''})</td>
              <td>${value.quantity || 0}</td>
              <td>Pieza</td>
              <td>${formatCurrency(value.costPerUnit || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'rails') {
          html += `
            <tr>
              <td>Rieles</td>
              <td>${value.quantity || 0}</td>
              <td>Pieza</td>
              <td>${formatCurrency(value.costPerUnit || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'pickets' || key === 'panels' || key === 'mesh') {
          html += `
            <tr>
              <td>${key === 'pickets' ? 'Tablas' : key === 'panels' ? 'Paneles' : 'Malla'}</td>
              <td>${value.quantity || value.feet || 0}</td>
              <td>${key === 'mesh' ? 'Pie' : 'Pieza'}</td>
              <td>${formatCurrency(value.costPerUnit || value.costPerFoot || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'concrete') {
          html += `
            <tr>
              <td>Concreto</td>
              <td>${value.bags || 0}</td>
              <td>Bolsa</td>
              <td>${formatCurrency(value.costPerBag || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'underlayment' || key === 'flashing' || key === 'hardware') {
          html += `
            <tr>
              <td>${key === 'underlayment' ? 'Membrana' : key === 'flashing' ? 'Tapajuntas' : 'Herrajes'}</td>
              <td>${value.areaSqFt || 0}</td>
              <td>Pie²</td>
              <td>${formatCurrency(value.costPerSqFt || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        }
      });
    }

    // Mano de obra
    if (data.rulesBasedEstimate?.labor) {
      const labor = data.rulesBasedEstimate.labor;
      html += `
        <tr>
          <td>Mano de Obra</td>
          <td>${labor.hours || 0}</td>
          <td>Hora</td>
          <td>${formatCurrency(labor.hourlyRate || 0)}</td>
          <td>${formatCurrency(labor.totalCost || 0)}</td>
        </tr>
      `;
    }

    // Costos adicionales
    if (data.rulesBasedEstimate?.additionalCosts) {
      const additionalCosts = data.rulesBasedEstimate.additionalCosts;

      Object.entries(additionalCosts).forEach(([key, value]: [string, any]) => {
        let description = key;

        if (key === 'demolition') description = 'Demolición/Remoción';
        else if (key === 'painting') description = 'Pintura/Acabado';
        else if (key === 'lattice') description = 'Celosía';
        else if (key === 'gates') description = 'Puertas';
        else if (key === 'roofRemoval') description = 'Remoción de Techo';
        else if (key === 'ventilation') description = 'Ventilación';
        else if (key === 'gutters') description = 'Canalones';

        html += `
          <tr>
            <td>${description}</td>
            <td>1</td>
            <td>Servicio</td>
            <td>${formatCurrency(value)}</td>
            <td>${formatCurrency(value)}</td>
          </tr>
        `;
      });
    }

    return html;
  }

  if (loading) {
    return (
      <div className={`estimate-preview ${className}`}>
        <div className="loading-spinner">Cargando previsualización...</div>
      </div>
    );
  }

  return (
    <div className={`estimate-preview ${className}`}>
      <div className="w-full bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
          <h3 className="text-md font-semibold">Vista previa del estimado</h3>
          <span className="text-xs text-muted-foreground">
            Plantilla Premium
          </span>
        </div>
        <div 
          className="estimate-content p-4 max-h-[500px] overflow-y-auto" 
          dangerouslySetInnerHTML={{ __html: html }}
        ></div>
      </div>
    </div>
  );
};

export default EstimatePreview;