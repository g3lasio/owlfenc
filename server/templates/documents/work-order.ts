/**
 * Work Order / Statement of Work Template
 * Version 1.0
 */

import { templateRegistry, TemplateData, ContractorBranding } from '../registry';

function generateWorkOrderHTML(data: TemplateData, branding: ContractorBranding): string {
  const contractorName = branding.companyName || data.contractor.name || 'Contractor';
  const contractorAddress = branding.address || data.contractor.address || '';
  const contractorPhone = branding.phone || data.contractor.phone || '';
  const contractorLicense = branding.licenseNumber || data.contractor.license || '';

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const workOrder = data.workOrder || {
    workOrderNumber: `WO-${Date.now().toString().slice(-8)}`,
    masterContractId: '',
    specificTasks: [data.project.description],
    materialsProvided: [],
    deliverables: [],
  };

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Work Order</title>
    <style>
        @page {
            size: 8.5in 11in;
            margin: 0.75in;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            color: #000;
        }
        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .title-block {
            flex: 1;
        }
        .contract-title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
        }
        .wo-number {
            font-size: 14pt;
            color: #333;
            margin-top: 5px;
        }
        .date-block {
            text-align: right;
        }
        .section-header {
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            background: #f0f0f0;
            padding: 8px 10px;
        }
        .parties-grid {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
        }
        .party-box {
            flex: 1;
            margin: 0 10px;
            padding: 15px;
            border: 1px solid #ddd;
        }
        .party-title {
            font-weight: bold;
            font-size: 11pt;
            color: #555;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .project-info {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border: 1px solid #ddd;
        }
        .info-row {
            display: flex;
            margin: 8px 0;
        }
        .info-label {
            width: 150px;
            font-weight: bold;
        }
        .info-value {
            flex: 1;
        }
        .task-list {
            margin: 10px 0;
        }
        .task-item {
            padding: 8px 15px;
            margin: 5px 0;
            background: #fff;
            border: 1px solid #ddd;
            border-left: 3px solid #333;
        }
        .task-number {
            font-weight: bold;
            margin-right: 10px;
        }
        .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        .materials-table th,
        .materials-table td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: left;
        }
        .materials-table th {
            background: #f0f0f0;
            font-weight: bold;
        }
        .financial-box {
            margin: 20px 0;
            border: 2px solid #333;
            padding: 15px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14pt;
            font-weight: bold;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            margin-top: 10px;
        }
        .terms-list {
            margin: 10px 0;
        }
        .term-item {
            margin: 8px 0;
            padding-left: 20px;
            text-indent: -20px;
        }
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        .signature-column {
            flex: 1;
            margin: 0 15px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            height: 40px;
            margin: 15px 0 5px 0;
        }
        .signature-label {
            margin: 3px 0;
            font-size: 10pt;
        }
    </style>
</head>
<body>

<div class="header-section">
    <div class="title-block">
        <h1 class="contract-title">WORK ORDER</h1>
        <div class="wo-number">Order #: ${workOrder.workOrderNumber}</div>
    </div>
    <div class="date-block">
        <div><strong>Date Issued:</strong> ${currentDate}</div>
        ${data.project.startDate ? `<div><strong>Start Date:</strong> ${data.project.startDate}</div>` : ''}
        ${data.project.endDate ? `<div><strong>Due Date:</strong> ${data.project.endDate}</div>` : ''}
    </div>
</div>

<div class="parties-grid">
    <div class="party-box">
        <div class="party-title">Client</div>
        <div><strong>${data.client.name}</strong></div>
        <div>${data.client.address}</div>
        ${data.client.phone ? `<div>${data.client.phone}</div>` : ''}
        ${data.client.email ? `<div>${data.client.email}</div>` : ''}
    </div>
    <div class="party-box">
        <div class="party-title">Contractor</div>
        <div><strong>${contractorName}</strong></div>
        ${contractorAddress ? `<div>${contractorAddress}</div>` : ''}
        ${contractorPhone ? `<div>${contractorPhone}</div>` : ''}
        ${contractorLicense ? `<div>License: ${contractorLicense}</div>` : ''}
    </div>
</div>

<div class="project-info">
    <div class="info-row">
        <span class="info-label">Project Type:</span>
        <span class="info-value">${data.project.type}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Location:</span>
        <span class="info-value">${data.project.location}</span>
    </div>
    ${workOrder.masterContractId ? `
    <div class="info-row">
        <span class="info-label">Master Contract:</span>
        <span class="info-value">${workOrder.masterContractId}</span>
    </div>
    ` : ''}
</div>

<div class="section-header">Scope of Work</div>
<p>${data.project.description}</p>

<div class="section-header">Specific Tasks</div>
<div class="task-list">
${workOrder.specificTasks.map((task, index) => `
    <div class="task-item">
        <span class="task-number">${index + 1}.</span>
        ${task}
    </div>
`).join('')}
</div>

${workOrder.materialsProvided.length > 0 ? `
<div class="section-header">Materials to be Provided</div>
<table class="materials-table">
    <thead>
        <tr>
            <th>#</th>
            <th>Material/Item</th>
        </tr>
    </thead>
    <tbody>
        ${workOrder.materialsProvided.map((material, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${material}</td>
        </tr>
        `).join('')}
    </tbody>
</table>
` : ''}

${workOrder.deliverables.length > 0 ? `
<div class="section-header">Deliverables</div>
<div class="task-list">
${workOrder.deliverables.map((deliverable, index) => `
    <div class="task-item">
        <span class="task-number">${index + 1}.</span>
        ${deliverable}
    </div>
`).join('')}
</div>
` : ''}

<div class="section-header">Compensation</div>
<div class="financial-box">
    <div class="total-row">
        <span>Total Work Order Amount:</span>
        <span>$${data.financials.total.toLocaleString()}</span>
    </div>
</div>

<div class="section-header">Terms & Conditions</div>
<div class="terms-list">
    <div class="term-item">• Work shall be performed in a professional and workmanlike manner.</div>
    <div class="term-item">• Contractor shall comply with all applicable codes and regulations.</div>
    <div class="term-item">• Payment is due upon completion and acceptance of work.</div>
    <div class="term-item">• Any changes to scope require written authorization.</div>
    <div class="term-item">• Client shall provide reasonable access to work site.</div>
</div>

<div class="signature-section">
    <div class="section-header">Authorization</div>
    
    <div class="signature-grid">
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Client Authorization</strong></div>
            <div class="signature-label">${data.client.name}</div>
            <div class="signature-label">Date: _______________</div>
        </div>
        <div class="signature-column">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Contractor Acknowledgment</strong></div>
            <div class="signature-label">${contractorName}</div>
            <div class="signature-label">Date: _______________</div>
        </div>
    </div>
</div>

</body>
</html>`;
}

templateRegistry.register({
  id: 'work-order',
  name: 'work-order',
  displayName: 'Work Order / Statement of Work',
  description: 'Detailed task-based order for specific work under a master contract',
  category: 'document',
  subcategory: 'work-authorization',
  status: 'active',
  templateVersion: '1.0',
  signatureType: 'dual',
  dataSource: 'contract',
  requiredFields: [
    'client.name',
    'client.address',
    'contractor.name',
    'project.type',
    'project.description',
    'project.location',
    'financials.total',
  ],
  optionalFields: [
    'workOrder.workOrderNumber',
    'workOrder.masterContractId',
    'workOrder.specificTasks',
    'workOrder.materialsProvided',
    'workOrder.deliverables',
    'project.startDate',
    'project.endDate',
  ],
  priority: 30,
  icon: 'ClipboardList',
  generateHTML: generateWorkOrderHTML,
});
