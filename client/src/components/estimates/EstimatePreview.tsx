import React, { useEffect, useState } from 'react';

interface EstimatePreviewProps {
  estimateData: any;
  className?: string;
}

const EstimatePreview: React.FC<EstimatePreviewProps> = ({ 
  estimateData, 
  className = '' 
}) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);

        // Load the universal template HTML
        let templateHtml;
        try {
          const response = await fetch('/src/templates/universal-estimate-template.html');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          templateHtml = await response.text();
          console.log(`Universal template loaded successfully. Length: ${templateHtml.length} characters`);
        } catch (templateError: any) {
          console.error('Error loading template:', templateError);
          setHtml(`<div class="error">Error loading template: ${templateError?.message || 'Unknown error'}</div>`);
          setLoading(false);
          return;
        }

        if (!templateHtml) {
          console.error('Could not load template HTML');
          setHtml(`
            <div class="error" style="padding: 20px; background-color: #fff1f2; border-left: 4px solid #e11d48; margin: 20px 0;">
              <h3 style="color: #be123c; margin-top: 0;">Error loading template</h3>
              <p>Could not load the universal estimate template</p>
            </div>
          `);
          setLoading(false);
          return;
        }

        // Apply estimate data to HTML template
        let processedHtml = templateHtml;

        // Create comprehensive replacement map
        const replacements: Record<string, string> = {
          // Company information
          '\\[Company Name\\]': estimateData.contractor?.companyName || estimateData.contractor?.name || 'Your Company',
          '\\[Company Address, City, State, ZIP\\]': formatFullAddress(estimateData.contractor?.address) || 'Company Address',
          '\\[COMPANY_EMAIL\\]': estimateData.contractor?.email || 'company@email.com',
          '\\[COMPANY_PHONE\\]': estimateData.contractor?.phone || '(555) 123-4567',
          '\\[COMPANY_LOGO_URL\\]': estimateData.contractor?.logo || '/owl-logo.png',

          // Client information
          '\\[Client Name\\]': estimateData.client?.name || 'Client Name',
          '\\[Client Email\\]': estimateData.client?.email || 'client@email.com',
          '\\[Client Phone\\]': estimateData.client?.phone || '(555) 987-6543',
          '\\[Client Address\\]': formatFullAddress(estimateData.client?.address) || 'Client Address',

          // Estimate metadata
          '\\[Estimate Date\\]': formatDate(estimateData.estimateDate) || new Date().toLocaleDateString(),
          '\\[Estimate Number\\]': estimateData.estimateNumber || estimateData.projectId || `EST-${Date.now()}`,
          '\\[Estimate Valid Until\\]': formatDate(estimateData.validUntil) || calculateValidUntil(),

          // Project details
          '\\[Scope of Work\\]': estimateData.scope || estimateData.project?.notes || 'Project scope to be defined',
          '\\[Estimated Completion Timeframe\\]': estimateData.timeline || getCompletionTime(estimateData) || 'Timeline to be determined',
          '\\[Work Process/Steps\\]': estimateData.process || 'Installation process to be defined',
          '\\[Included Services or Materials\\]': estimateData.includes || 'All materials and labor as specified',
          '\\[Excluded Services or Materials\\]': estimateData.excludes || 'Permits, site preparation (if not specified)',

          // Financial totals
          '\\[Grand Total\\]': formatCurrency(getTotal(estimateData)),

          // Footer information
          '\\[YEAR\\]': new Date().getFullYear().toString(),
          '\\[Your Company Name\\]': estimateData.contractor?.companyName || estimateData.contractor?.name || 'Your Company',
        };

        // Apply all replacements to the template
        Object.entries(replacements).forEach(([placeholder, value]) => {
          processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
        });

        // Generate the estimate items table rows
        const tableRowsHtml = generateEstimateTableRows(estimateData);
        processedHtml = processedHtml.replace('\\[ESTIMATE_ITEMS_ROWS\\]', tableRowsHtml);

        setHtml(processedHtml);
      } catch (error) {
        console.error('Error generating preview:', error);
        setHtml('<div class="error">Error generating preview</div>');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [estimateData]);

  // Helper functions for formatting data
  function formatFullAddress(address: any): string {
    if (!address) return '';
    
    if (typeof address === 'string') return address;
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    
    return parts.join(', ');
  }

  function formatDate(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  }

  function calculateValidUntil(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    if (data.rulesBasedEstimate?.estimatedDays) {
      const days = data.rulesBasedEstimate.estimatedDays;
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    return '';
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

    // Materials section
    if (data.rulesBasedEstimate?.materials) {
      const materials = data.rulesBasedEstimate.materials;

      Object.entries(materials).forEach(([key, value]: [string, any]) => {
        if (key === 'roofing') {
          html += `
            <tr>
              <td>Roofing Material (${value.type || 'Standard'})</td>
              <td>${value.type || 'Standard roofing material'}</td>
              <td>${value.areaSqFt || 0} sq ft</td>
              <td>${formatCurrency(value.costPerSqFt || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'posts') {
          html += `
            <tr>
              <td>Posts (${value.type || 'Standard'})</td>
              <td>Structural posts for installation</td>
              <td>${value.quantity || 0}</td>
              <td>${formatCurrency(value.costPerUnit || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'rails') {
          html += `
            <tr>
              <td>Rails</td>
              <td>Horizontal support rails</td>
              <td>${value.quantity || 0}</td>
              <td>${formatCurrency(value.costPerUnit || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'pickets' || key === 'panels' || key === 'mesh') {
          const itemName = key === 'pickets' ? 'Pickets' : key === 'panels' ? 'Panels' : 'Mesh';
          const description = key === 'pickets' ? 'Vertical fence pickets' : 
                            key === 'panels' ? 'Fence panels' : 'Wire mesh material';
          html += `
            <tr>
              <td>${itemName}</td>
              <td>${description}</td>
              <td>${value.quantity || value.feet || 0}</td>
              <td>${formatCurrency(value.costPerUnit || value.costPerFoot || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'concrete') {
          html += `
            <tr>
              <td>Concrete</td>
              <td>Concrete mix for post setting</td>
              <td>${value.bags || 0} bags</td>
              <td>${formatCurrency(value.costPerBag || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        } else if (key === 'underlayment' || key === 'flashing' || key === 'hardware') {
          const itemName = key === 'underlayment' ? 'Underlayment' : 
                          key === 'flashing' ? 'Flashing' : 'Hardware';
          const description = key === 'underlayment' ? 'Protective underlayment material' :
                            key === 'flashing' ? 'Weather protection flashing' : 'Installation hardware';
          html += `
            <tr>
              <td>${itemName}</td>
              <td>${description}</td>
              <td>${value.areaSqFt || value.quantity || 0}</td>
              <td>${formatCurrency(value.costPerSqFt || value.costPerUnit || 0)}</td>
              <td>${formatCurrency(value.totalCost || 0)}</td>
            </tr>
          `;
        }
      });
    }

    // Labor section
    if (data.rulesBasedEstimate?.labor) {
      const labor = data.rulesBasedEstimate.labor;
      html += `
        <tr>
          <td>Labor</td>
          <td>Professional installation service</td>
          <td>${labor.hours || 0} hours</td>
          <td>${formatCurrency(labor.hourlyRate || 0)}</td>
          <td>${formatCurrency(labor.totalCost || 0)}</td>
        </tr>
      `;
    }

    // Additional costs section
    if (data.rulesBasedEstimate?.additionalCosts) {
      const additionalCosts = data.rulesBasedEstimate.additionalCosts;

      Object.entries(additionalCosts).forEach(([key, value]: [string, any]) => {
        let itemName = key;
        let description = 'Additional service';

        if (key === 'demolition') {
          itemName = 'Demolition/Removal';
          description = 'Removal of existing structures';
        } else if (key === 'painting') {
          itemName = 'Painting/Finishing';
          description = 'Paint and finishing work';
        } else if (key === 'lattice') {
          itemName = 'Lattice Work';
          description = 'Decorative lattice installation';
        } else if (key === 'gates') {
          itemName = 'Gates';
          description = 'Gate installation and hardware';
        } else if (key === 'roofRemoval') {
          itemName = 'Roof Removal';
          description = 'Existing roof removal';
        } else if (key === 'ventilation') {
          itemName = 'Ventilation';
          description = 'Ventilation system installation';
        } else if (key === 'gutters') {
          itemName = 'Gutters';
          description = 'Gutter system installation';
        }

        html += `
          <tr>
            <td>${itemName}</td>
            <td>${description}</td>
            <td>1</td>
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
        <div className="loading-spinner">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className={`estimate-preview ${className}`}>
      <div className="w-full bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
          <h3 className="text-md font-semibold">Estimate Preview</h3>
          <span className="text-xs text-muted-foreground">
            Universal Template
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