/**
 * Utilidad para cargar plantillas HTML desde el servidor
 */

/**
 * Carga una plantilla HTML basada en el estilo seleccionado
 * @param templateStyle - Estilo de la plantilla a cargar ('standard', 'professional', 'luxury')
 * @returns Contenido HTML de la plantilla
 */
export async function loadTemplateHTML(templateStyle: string = 'standard'): Promise<string> {
  try {
    console.log(`Cargando plantilla para el estilo: ${templateStyle}`);
    
    // Intentar cargar la plantilla desde la ruta pública primero
    const templateMap: Record<string, string> = {
      'standard': '/templates/basictemplateestimate.html',
      'professional': '/templates/Premiumtemplateestimate.html',
      'luxury': '/templates/luxurytemplate.html'
    };
    
    const templatePath = templateMap[templateStyle] || templateMap['standard'];
    console.log(`Intentando cargar desde ruta: ${templatePath}`);
    
    try {
      // Intentar cargar el archivo utilizando fetch con cache: 'no-store' para evitar problemas de caché
      const response = await fetch(templatePath, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const templateContent = await response.text();
        console.log(`Plantilla cargada exitosamente desde: ${templatePath}, tamaño: ${templateContent.length} bytes`);
        return templateContent;
      } else {
        console.warn(`No se pudo cargar la plantilla desde ${templatePath}, código: ${response.status}. Intentando ruta alternativa.`);
        
        // Intentar con ruta alternativa
        const altPath = `/static/templates/${templatePath.split('/').pop()}`;
        console.log(`Intentando con ruta alternativa: ${altPath}`);
        
        const altResponse = await fetch(altPath, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (altResponse.ok) {
          const altContent = await altResponse.text();
          console.log(`Plantilla cargada exitosamente desde ruta alternativa: ${altPath}`);
          return altContent;
        } else {
          console.warn(`No se pudo cargar la plantilla desde ruta alternativa: ${altPath}, utilizando plantilla integrada.`);
        }
      }
    } catch (fetchError) {
      console.warn(`Error fetching plantilla desde ${templatePath}:`, fetchError);
    }
    
    try {
      // Intentar cargar la plantilla directamente desde los componentes internos
      console.log('Intentando cargar plantilla de respaldo desde los componentes internos...');
      
      // Importando directamente el archivo de la plantilla desde src/components/templates
      const fs = require('fs');
      let templatePath = '';
      
      if (templateStyle === 'standard') {
        templatePath = './src/components/templates/basictemplateestimate.html';
      } else if (templateStyle === 'professional') {
        templatePath = './src/components/templates/Premiumtemplateestimate.html';
      } else { // luxury
        templatePath = './src/components/templates/luxurytemplate.html';
      }
      
      // Verificar si el archivo existe en las rutas relativas
      let templateContent = '';
      try {
        // Intentar cargar desde el directorio actual
        templateContent = fs.readFileSync(templatePath, 'utf8');
        console.log(`✅ Éxito al cargar plantilla de respaldo desde: ${templatePath}`);
        return templateContent;
      } catch (e) {
        console.log(`Error al cargar desde ruta relativa ${templatePath}: ${e.message}`);
        
        // Si no funciona, probar con ruta absoluta, cambiando el prefijo
        const paths = [
          `./client/src/components/templates/${templatePath.split('/').pop()}`,
          `../client/src/components/templates/${templatePath.split('/').pop()}`,
          `../../client/src/components/templates/${templatePath.split('/').pop()}`,
          `/app/client/src/components/templates/${templatePath.split('/').pop()}`
        ];
        
        for (const path of paths) {
          try {
            templateContent = fs.readFileSync(path, 'utf8');
            console.log(`✅ Éxito al cargar plantilla de respaldo desde: ${path}`);
            return templateContent;
          } catch (innerE) {
            console.log(`Error en ruta alternativa ${path}: ${innerE.message}`);
          }
        }
      }
    } catch (fsError) {
      console.error('Error al intentar cargar las plantillas desde fs:', fsError);
    }
    
    // Plantilla de emergencia si todo lo demás falla
    console.log(`⚠️ USANDO PLANTILLA DE EMERGENCIA PARA ${templateStyle.toUpperCase()}`);
    
    // Para professional, devolver versión simple pero más estilizada que la de respaldo
    if (templateStyle === 'professional' || templateStyle === 'luxury') {
      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate Template (Profesional)</title>
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
          <div class="company-name">[COMPANY_NAME]</div>
          <div class="company-address">[COMPANY_ADDRESS]</div>
          <div>
            <a href="mailto:[COMPANY_EMAIL]">[COMPANY_EMAIL]</a>
            <a href="tel:[COMPANY_PHONE]">[COMPANY_PHONE]</a>
          </div>
        </div>
        <div>
          <div class="estimate-title">ESTIMATE</div>
          <div class="estimate-meta">
            <div><strong>Date:</strong> [ESTIMATE_DATE]</div>
            <div><strong>Estimate #:</strong> [ESTIMATE_NUMBER]</div>
            <div><strong>Valid Until:</strong> [ESTIMATE_VALID_UNTIL]</div>
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
              <td>[CLIENT_NAME]</td>
              <td><a href="mailto:[CLIENT_EMAIL]">[CLIENT_EMAIL]</a></td>
              <td><a href="tel:[CLIENT_PHONE]">[CLIENT_PHONE]</a></td>
              <td>[CLIENT_ADDRESS]</td>
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
              <td>[ITEM_NAME]</td>
              <td>[ITEM_DESCRIPTION]</td>
              <td>[QTY]</td>
              <td>[UNIT_PRICE]</td>
              <td>[TOTAL]</td>
            </tr>
            <tr class="totals-row">
              <td colspan="4" style="text-align: right">Total</td>
              <td>[GRAND_TOTAL]</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section project-details">
        <b>Scope:</b> [SCOPE_OF_WORK]<br />
        <b>Timeline:</b> [ESTIMATED_COMPLETION_TIMEFRAME]<br />
        <b>Process:</b> [WORK_PROCESS_STEPS]<br />
        <b>Includes:</b> [INCLUDED_SERVICES_OR_MATERIALS]<br />
        <b>Excludes:</b> [EXCLUDED_SERVICES_OR_MATERIALS]
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
        &copy; [YEAR] [COMPANY_NAME]. All Rights Reserved.
      </div>
    </div>
  </body>
</html>`;
    } else {
      // Plantilla básica para 'standard'
      return `<!DOCTYPE html>
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
</html>`;
    }
  } catch (error) {
    console.error('Error al cargar la plantilla:', error);
    
    // En caso de cualquier error, usar plantilla básica pero visual
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Presupuesto Básico</title>
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
      margin-bottom: 30px;
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
    .footer {
      margin-top: 40px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>[COMPANY_NAME]</h1>
    <p>[COMPANY_ADDRESS]</p>
    <p>Tel: [COMPANY_PHONE] | Email: [COMPANY_EMAIL]</p>
    <p>Licencia: [COMPANY_LICENSE]</p>
    <h2>Presupuesto #[ESTIMATE_NUMBER]</h2>
    <p>Fecha: [ESTIMATE_DATE]</p>
  </div>
  
  <div class="client-info">
    <h3>Cliente:</h3>
    <p><strong>Nombre:</strong> [CLIENT_NAME]</p>
    <p><strong>Email:</strong> [CLIENT_EMAIL]</p>
    <p><strong>Teléfono:</strong> [CLIENT_PHONE]</p>
    <p><strong>Dirección:</strong> [CLIENT_ADDRESS]</p>
    <p><strong>Ciudad/Estado:</strong> [CLIENT_CITY_STATE_ZIP]</p>
  </div>
  
  <div class="project-info">
    <h3>Proyecto:</h3>
    <p><strong>Tipo:</strong> [PROJECT_TYPE]</p>
    <p><strong>Dirección:</strong> [PROJECT_ADDRESS]</p>
    <p><strong>Dimensiones:</strong> [PROJECT_DIMENSIONS]</p>
    <p><strong>Notas:</strong> [PROJECT_NOTES]</p>
  </div>
  
  <h3>Detalle de Costos:</h3>
  <table>
    <tr>
      <th>Descripción</th>
      <th>Cantidad</th>
      <th>Unidad</th>
      <th>Precio Unitario</th>
      <th>Total</th>
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
    <tr>
      <td colspan="4" style="text-align: right;"><strong>TOTAL:</strong></td>
      <td>[TOTAL]</td>
    </tr>
  </table>
  
  <div class="completion-info">
    <p><strong>Tiempo estimado de finalización:</strong> [COMPLETION_TIME] días</p>
  </div>
  
  <div class="footer">
    <p>Este presupuesto es válido por 30 días desde la fecha de emisión.</p>
  </div>
</body>
</html>`;
  }
}