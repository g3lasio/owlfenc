
/**
 * Servicio centralizado para gestionar los templates de la aplicación
 * Este enfoque elimina la necesidad de cargar archivos HTML externos
 */

// Almacén de templates embebidos en el código
const embeddedTemplates: Record<string, string> = {
  // Template estándar
  'standard': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Presupuesto Estándar</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .company-logo {
      max-width: 200px;
      margin-bottom: 15px;
    }
    .info-section {
      margin-bottom: 25px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
    }
    .client-info, .project-info {
      display: inline-block;
      vertical-align: top;
      width: 45%;
    }
    .company-info {
      margin-bottom: 20px;
    }
    .estimate-title {
      font-size: 24px;
      color: #0066cc;
      margin-top: 0;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #0066cc;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    .total-row {
      font-weight: bold;
      background-color: #e6f0ff;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="[COMPANY_LOGO]" alt="Logo" class="company-logo">
    <h1>Presupuesto</h1>
  </div>
  
  <div class="info-section">
    <div class="company-info">
      <h3>[COMPANY_NAME]</h3>
      <p>[COMPANY_ADDRESS]</p>
      <p>Tel: [COMPANY_PHONE] | Email: [COMPANY_EMAIL]</p>
      <p>Licencia: [COMPANY_LICENSE]</p>
    </div>
    
    <div style="display: flex; justify-content: space-between;">
      <div class="client-info">
        <h3>Cliente</h3>
        <p><strong>Nombre:</strong> [CLIENT_NAME]</p>
        <p><strong>Email:</strong> [CLIENT_EMAIL]</p>
        <p><strong>Teléfono:</strong> [CLIENT_PHONE]</p>
        <p><strong>Dirección:</strong> [CLIENT_ADDRESS]</p>
        <p><strong>Ciudad:</strong> [CLIENT_CITY_STATE_ZIP]</p>
      </div>
      
      <div class="project-info">
        <h3>Información del Proyecto</h3>
        <p><strong>Fecha:</strong> [ESTIMATE_DATE]</p>
        <p><strong>Presupuesto #:</strong> [ESTIMATE_NUMBER]</p>
        <p><strong>Tipo:</strong> [PROJECT_TYPE]</p>
        <p><strong>Dimensiones:</strong> [PROJECT_DIMENSIONS]</p>
      </div>
    </div>
  </div>
  
  <h3>Detalles del Proyecto</h3>
  <p>[PROJECT_NOTES]</p>
  
  <h3>Detalle de Costos</h3>
  <table>
    <tr>
      <th style="width: 40%;">Descripción</th>
      <th style="width: 15%;">Cantidad</th>
      <th style="width: 15%;">Unidad</th>
      <th style="width: 15%;">Precio Unitario</th>
      <th style="width: 15%;">Total</th>
    </tr>
    [COST_TABLE_ROWS]
    <tr>
      <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
      <td>[SUBTOTAL]</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align: right;"><strong>Impuesto ([TAX_RATE]):</strong></td>
      <td>[TAX_AMOUNT]</td>
    </tr>
    <tr class="total-row">
      <td colspan="4" style="text-align: right;"><strong>TOTAL:</strong></td>
      <td>[TOTAL]</td>
    </tr>
  </table>
  
  <div class="completion-info">
    <p><strong>Tiempo estimado de finalización:</strong> [COMPLETION_TIME] días</p>
  </div>
  
  <div class="footer">
    <p>Este presupuesto es válido por 30 días desde la fecha de emisión.</p>
    <p>Gracias por confiar en nosotros para su proyecto.</p>
  </div>
</body>
</html>`,

  // Template premium (utilizando el que ya tienes)
  'professional': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate Template (General Contractors - Neon Final)</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        background: #f8f9fb;
        margin: 0;
        padding: 0;
        color: #181818;
      }
      .container {
        max-width: 800px;
        margin: 40px auto;
        background: #fff;
        box-shadow: 0 4px 24px rgba(20, 240, 248, 0.12);
        border-radius: 18px;
        padding: 34px 36px 20px 36px;
        border: 2px solid #14f0f8;
      }
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 2.5px solid #14f0f8;
        padding-bottom: 18px;
        margin-bottom: 18px;
      }
      .company-details {
        line-height: 1.7;
      }
      .logo {
        max-width: 108px;
        max-height: 60px;
        margin-bottom: 6px;
        background: #f5f7fa;
        border-radius: 8px;
        border: 1px solid #d7e0ee;
        display: block;
      }
      .company-name {
        font-size: 1.22rem;
        font-weight: 700;
        color: #181818;
        margin-bottom: 2px;
        letter-spacing: 0.5px;
      }
      .company-address {
        font-size: 1rem;
        color: #222;
        margin-bottom: 2px;
      }
      .estimate-title {
        text-align: right;
        font-size: 2rem;
        color: #181818;
        font-weight: 600;
        letter-spacing: 1px;
        text-shadow: 0 2px 12px #e0fcff30;
      }
      .estimate-meta {
        text-align: right;
        font-size: 1rem;
        color: #303030;
        line-height: 1.5;
      }
      .section {
        margin-bottom: 23px;
      }
      .section-title {
        font-size: 1.13rem;
        font-weight: bold;
        color: #181818;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
        background: #e9fdff;
        padding: 4px 12px;
        border-left: 4px solid #14f0f8;
        border-radius: 6px 0 0 6px;
        display: inline-block;
        box-shadow: 0 1px 4px 0 #14f0f816;
      }
      .details-table {
        width: 100%;
        border-collapse: collapse;
        background: #e9fdff;
        border-radius: 7px;
        overflow: hidden;
        margin-bottom: 6px;
        box-shadow: 0 1.5px 6px 0 #10dbe222;
        border: 1.5px solid #14f0f8;
      }
      .details-table th,
      .details-table td {
        padding: 12px 9px;
        text-align: left;
        color: #181818;
      }
      .details-table th {
        background: #bafcff;
        color: #181818;
        font-size: 1.02rem;
        font-weight: 600;
        border-bottom: 1.5px solid #14f0f8;
      }
      .details-table td {
        border-bottom: 1px solid #e6fafd;
        font-size: 1rem;
      }
      .details-table tr:last-child td {
        border-bottom: none;
      }
      .totals-row {
        font-weight: 700;
        background: #bafcff;
        font-size: 1.09rem;
        color: #181818;
      }
      .project-details {
        font-size: 1.06rem;
        color: #233;
        margin: 16px 0 24px 0;
        padding: 18px 22px 13px 22px;
        background: #e1fbfc;
        border-radius: 8px;
        border-left: 4px solid #14f0f8;
        box-shadow: 0 2px 8px rgba(20, 240, 248, 0.07);
      }
      .client-contact a,
      .company-details a {
        display: inline-block;
        margin-right: 10px;
        padding: 4px 10px;
        color: #181818;
        background: #e6fcff;
        border-radius: 7px;
        text-decoration: none;
        font-weight: 500;
        font-size: 1.02rem;
        transition: background 0.2s;
        box-shadow: 0 0 7px 0 #10dbe225;
        border: 1px solid #14f0f8;
      }
      .client-contact a:hover,
      .company-details a:hover {
        background: #14f0f8;
        color: #181818;
      }
      .footer {
        text-align: right;
        margin-top: 16px;
        font-size: 0.89rem;
        color: #14f0f8;
        padding-top: 5px;
        border-top: 1.5px solid #bafcff;
        letter-spacing: 0.12px;
        font-family: "Segoe UI", Arial, sans-serif;
        text-shadow: 0 0 8px #10dbe233;
      }
      /* Responsive design mejorado */
      @media (max-width: 768px) {
        .container {
          padding: 20px 15px;
          margin: 10px;
          max-width: calc(100vw - 20px);
        }
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .estimate-title {
          text-align: left;
          font-size: 1.5rem;
          margin-top: 15px;
        }
        .estimate-meta {
          text-align: left;
          margin-top: 10px;
        }
        .company-details {
          width: 100%;
        }
        .logo {
          margin-bottom: 12px;
        }
        
        /* Scrolling horizontal para tablas */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 15px;
          border-radius: 7px;
          box-shadow: 0 2px 8px rgba(20, 240, 248, 0.1);
        }
        
        .details-table {
          min-width: 600px;
          margin-bottom: 0;
        }
        
        .details-table th,
        .details-table td {
          padding: 8px 6px;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        
        .section-title {
          font-size: 1rem;
          padding: 6px 10px;
        }
        
        .project-details {
          padding: 15px;
          font-size: 1rem;
        }
        
        .footer {
          text-align: center;
          font-size: 0.8rem;
        }
      }
      
      /* Tablet adjustments */
      @media (min-width: 769px) and (max-width: 1024px) {
        .container {
          max-width: 90%;
          padding: 30px;
        }
        
        .details-table th,
        .details-table td {
          padding: 10px 8px;
        }
      }
      
      /* Scrolling suave y optimizado */
      .table-wrapper {
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #14f0f8 #e9fdff;
      }
      
      .table-wrapper::-webkit-scrollbar {
        height: 8px;
      }
      
      .table-wrapper::-webkit-scrollbar-track {
        background: #e9fdff;
        border-radius: 4px;
      }
      
      .table-wrapper::-webkit-scrollbar-thumb {
        background: #14f0f8;
        border-radius: 4px;
      }
      
      .table-wrapper::-webkit-scrollbar-thumb:hover {
        background: #0bc5cc;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="company-details">
          <img src="[COMPANY_LOGO_URL]" alt="Company Logo" class="logo" />
          <div class="company-name">[Company Name]</div>
          <div class="company-address">[Company Address, City, State, ZIP]</div>
          <div>
            <a href="mailto:[COMPANY_EMAIL]">[COMPANY_EMAIL]</a>
            <a href="tel:[COMPANY_PHONE]">[COMPANY_PHONE]</a>
          </div>
        </div>
        <div>
          <div class="estimate-title">ESTIMATE</div>
          <div class="estimate-meta">
            <div><strong>Date:</strong> [Estimate Date]</div>
            <div><strong>Estimate #:</strong> [Estimate Number]</div>
            <div><strong>Valid Until:</strong> [Estimate Valid Until]</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Client</div>
        <div class="table-wrapper">
          <table class="details-table">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
            </tr>
            <tr>
              <td>[Client Name]</td>
              <td><a href="mailto:[Client Email]">[Client Email]</a></td>
              <td><a href="tel:[Client Phone]">[Client Phone]</a></td>
              <td>[Client Address]</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Estimate Details</div>
        <div class="table-wrapper">
          <table class="details-table">
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
            <!-- Repeat this row for each item -->
            <tr>
              <td>[Item Name]</td>
              <td>[Item Description]</td>
              <td>[Qty]</td>
              <td>[Unit Price]</td>
              <td>[Total]</td>
            </tr>
            <tr class="totals-row">
              <td colspan="4" style="text-align: right">Total</td>
              <td>[Grand Total]</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section project-details">
        <b>Scope:</b> [Scope of Work]<br />
        <b>Timeline:</b> [Estimated Completion Timeframe]<br />
        <b>Process:</b> [Work Process/Steps]<br />
        <b>Includes:</b> [Included Services or Materials]<br />
        <b>Excludes:</b> [Excluded Services or Materials]
      </div>

      <div class="section">
        <div class="section-title">Terms & Conditions</div>
        <div class="terms">
          <ul style="margin: 0 0 0 1.4em; padding: 0; color: #181818">
            <li>
              This estimate is valid for 30 days from the issue date. Prices may
              change after this period due to fluctuations in materials, labor,
              or market conditions.
            </li>
            <li>
              Project execution, specific terms, and additional conditions will
              be detailed in the formal contract to be signed by both parties.
            </li>
            <li>For questions, please contact us directly.</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        &copy; [YEAR] [Your Company Name]. All Rights Reserved.
      </div>
    </div>
  </body>
</html>`,

  // Puedes añadir aquí más templates según sea necesario
  'luxury': `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimado Premium</title>
  <style>
    /* Estilos globales */
    body {
      font-family: 'Montserrat', 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background-color: #f7f7f7;
    }
    
    .estimate-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 40px;
      background-color: white;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }
    
    .estimate-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 8px;
      background: linear-gradient(90deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%);
    }
    
    /* Cabecera */
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 25px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .company-info {
      flex: 2;
    }
    
    .company-info h1 {
      margin: 0 0 8px 0;
      color: #1a365d;
      font-weight: 700;
      font-size: 2rem;
    }
    
    .company-info p {
      margin: 0 0 4px 0;
      color: #4a5568;
      font-size: 0.95rem;
    }
    
    .logo img {
      max-width: 150px;
      height: auto;
    }
    
    .estimate-meta {
      flex: 1;
      text-align: right;
      padding: 15px;
      background-color: #f8fafc;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    
    .estimate-meta h2 {
      margin: 0 0 15px 0;
      font-size: 1.6rem;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
    }
    
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.92rem;
    }
    
    .meta-label {
      font-weight: 600;
      color: #4a5568;
    }
    
    /* Información del cliente */
    .client-section {
      display: flex;
      margin-bottom: 40px;
      gap: 30px;
    }
    
    .client-info, .project-info {
      flex: 1;
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    
    .section-title {
      margin: 0 0 15px 0;
      color: #1a365d;
      font-size: 1.2rem;
      font-weight: 600;
      padding-bottom: 8px;
      border-bottom: 3px solid #bee3f8;
    }
    
    .client-info p, .project-info p {
      margin: 0 0 8px 0;
      font-size: 0.95rem;
    }
    
    /* Tabla de desglose */
    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 35px;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    
    .items-table th {
      background-color: #ebf8ff;
      padding: 15px 20px;
      text-align: left;
      font-weight: 600;
      color: #2c5282;
      font-size: 0.95rem;
      border-bottom: 2px solid #90cdf4;
    }
    
    .items-table td {
      padding: 15px 20px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.95rem;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .items-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    /* Resumen de precios */
    .summary-table {
      width: 400px;
      margin-left: auto;
      margin-bottom: 40px;
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 0.95rem;
    }
    
    .summary-row.subtotal {
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      padding-top: 15px;
      padding-bottom: 15px;
    }
    
    .summary-row.total {
      font-weight: 700;
      font-size: 1.2rem;
      color: #2c5282;
      padding-top: 15px;
    }
    
    /* Términos y notas */
    .terms-section {
      margin-bottom: 40px;
      padding: 25px;
      background-color: #f8fafc;
      border-radius: 6px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    
    .terms-title {
      margin: 0 0 20px 0;
      color: #1a365d;
      font-size: 1.2rem;
      font-weight: 600;
      padding-bottom: 8px;
      border-bottom: 3px solid #bee3f8;
    }
    
    .terms-list {
      margin: 0;
      padding-left: 20px;
    }
    
    .terms-list li {
      margin-bottom: 10px;
      font-size: 0.95rem;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #718096;
      font-size: 0.85rem;
    }
    
    .cta {
      text-align: center;
      margin: 40px 0;
      padding: 25px;
      background-color: #ebf8ff;
      border-radius: 6px;
    }
    
    .cta-message {
      font-size: 1.2rem;
      color: #2c5282;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .signature {
      margin-top: 50px;
      padding-top: 25px;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-line {
      width: 45%;
      border-top: 1px solid #a0aec0;
      padding-top: 12px;
      font-size: 0.95rem;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="estimate-container">
    <!-- Cabecera con logo e información -->
    <div class="header">
      <div class="company-info">
        <h1>{{companyName}}</h1>
        <p>{{companyAddress}}</p>
        <p>{{companyPhone}} | {{companyEmail}}</p>
        <p>Licencia: {{companyLicense}}</p>
      </div>
      <div class="logo">
        <img src="{{logoUrl}}" alt="Logo">
      </div>
      <div class="estimate-meta">
        <h2>Estimado</h2>
        <div class="meta-row">
          <span class="meta-label">Fecha:</span>
          <span>{{currentDate}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Estimado #:</span>
          <span>{{estimateNumber}}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Válido por:</span>
          <span>30 días</span>
        </div>
      </div>
    </div>
    
    <!-- Información del cliente y proyecto -->
    <div class="client-section">
      <div class="client-info">
        <h3 class="section-title">Información del Cliente</h3>
        <p><strong>Nombre:</strong> {{clientName}}</p>
        <p><strong>Email:</strong> {{clientEmail}}</p>
        <p><strong>Teléfono:</strong> {{clientPhone}}</p>
        <p><strong>Dirección:</strong> {{clientAddress}}</p>
        <p><strong>Ciudad:</strong> {{clientCity}}, {{clientState}} {{clientZip}}</p>
      </div>
      <div class="project-info">
        <h3 class="section-title">Detalles del Proyecto</h3>
        <p><strong>Tipo:</strong> {{projectType}}</p>
        <p><strong>Subtipo:</strong> {{projectSubtype}}</p>
        <p><strong>Dirección:</strong> {{projectAddress}}</p>
        <p><strong>Dimensiones:</strong> {{projectDimensions}}</p>
        <p><strong>Características adicionales:</strong> {{additionalFeatures}}</p>
      </div>
    </div>
    
    <!-- Tabla de items -->
    <h3 class="section-title">Materiales y Servicios</h3>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 45%;">Descripción</th>
          <th style="width: 15%;">Cantidad</th>
          <th style="width: 20%;">Precio</th>
          <th style="width: 20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#items}}
        <tr>
          <td>{{description}}</td>
          <td>{{quantity}} {{unit}}</td>
          <td>${{unitPrice}}</td>
          <td>${{totalPrice}}</td>
        </tr>
        {{/items}}
      </tbody>
    </table>
    
    <!-- Resumen de costos -->
    <div class="summary-table">
      <div class="summary-row subtotal">
        <span>Subtotal</span>
        <span>${{subtotal}}</span>
      </div>
      {{#tax}}
      <div class="summary-row">
        <span>Impuesto ({{taxRate}}%)</span>
        <span>${{taxAmount}}</span>
      </div>
      {{/tax}}
      {{#discount}}
      <div class="summary-row">
        <span>Descuento ({{discountRate}}%)</span>
        <span>-${{discountAmount}}</span>
      </div>
      {{/discount}}
      <div class="summary-row total">
        <span>Total</span>
        <span>${{total}}</span>
      </div>
    </div>
    
    <!-- Términos y condiciones -->
    <div class="terms-section">
      <h3 class="terms-title">Términos y Condiciones</h3>
      <ul class="terms-list">
        <li>Este estimado tiene validez por 30 días a partir de la fecha de emisión.</li>
        <li>Se requiere un depósito del 50% para iniciar el trabajo.</li>
        <li>El balance restante se pagará al completar el trabajo a satisfacción del cliente.</li>
        <li>Los cambios en el ámbito del proyecto pueden afectar al costo final del mismo.</li>
        <li>Todos los materiales tienen garantía del fabricante. Nuestra garantía de instalación es de 2 años.</li>
        <li>Los tiempos de entrega pueden variar según la disponibilidad de materiales y condiciones climáticas.</li>
        <li>Incluye servicios de limpieza y remoción de escombros al finalizar el proyecto.</li>
      </ul>
    </div>
    
    <!-- Llamada a la acción -->
    <div class="cta">
      <p class="cta-message">¡Gracias por confiar en nuestros servicios de calidad premium!</p>
      <p>Para aprobar este estimado o si tiene alguna pregunta, por favor contáctenos al {{companyPhone}}.</p>
    </div>
    
    <!-- Área de firma -->
    <div class="signature">
      <div class="signature-line">
        Firma del Cliente
      </div>
      <div class="signature-line">
        Fecha
      </div>
    </div>
    
    <!-- Pie de página -->
    <div class="footer">
      <p>{{companyName}} | {{companyAddress}} | {{companyPhone}}</p>
      <p>Email: {{companyEmail}} | Web: {{companyWebsite}}</p>
    </div>
  </div>
</body>
</html>`
};

/**
 * Obtiene el HTML de un template por su estilo
 * @param templateStyle - Estilo del template a obtener ('standard', 'professional', 'luxury')
 * @returns El HTML del template solicitado
 */
export function getTemplateHTML(templateStyle: string = 'standard'): string {
  console.log(`Obteniendo template para el estilo: ${templateStyle}`);
  
  // Verificar si el template existe en nuestro almacén
  if (embeddedTemplates[templateStyle]) {
    console.log(`✅ Template "${templateStyle}" encontrado en el almacén de templates embebidos`);
    return embeddedTemplates[templateStyle];
  }
  
  // Si no existe, usar el template estándar como respaldo
  console.log(`⚠️ Template "${templateStyle}" no encontrado, usando template estándar como respaldo`);
  return embeddedTemplates['standard'];
}

/**
 * Agrega un nuevo template al almacén
 * @param name - Nombre/identificador del template
 * @param html - Contenido HTML del template
 */
export function addTemplate(name: string, html: string): void {
  embeddedTemplates[name] = html;
  console.log(`✅ Template "${name}" agregado al almacén`);
}
