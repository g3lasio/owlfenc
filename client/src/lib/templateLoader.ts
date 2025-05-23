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
    
    // Si no se puede cargar la plantilla, usar versiones integradas como respaldo
    // SOLUCIÓN RADICAL: Retornar plantillas predefinidas directamente
    if (templateStyle === 'standard') {
      console.log('Usando plantilla ESTÁNDAR INTEGRADA (basictemplateestimate.html)');
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
    else if (templateStyle === 'professional') {
      console.log('Usando plantilla PROFESIONAL INTEGRADA (Premiumtemplateestimate.html)');
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Presupuesto Profesional</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .container {
      background-color: #fff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
      color: #2c3e50;
      margin-top: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3498db;
    }
    .company-logo {
      max-width: 200px;
      margin-bottom: 15px;
    }
    .estimate-meta {
      text-align: right;
    }
    .estimate-meta h2 {
      color: #3498db;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .client-info, .project-info {
      width: 48%;
      padding: 20px;
      background-color: #f5f9fd;
      border-radius: 5px;
      border-left: 4px solid #3498db;
    }
    .section-title {
      color: #3498db;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      border-radius: 5px;
      overflow: hidden;
    }
    th, td {
      padding: 15px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      text-transform: uppercase;
      font-size: 14px;
      letter-spacing: 1px;
    }
    tr:nth-child(even) {
      background-color: #f2f7fb;
    }
    tr:hover {
      background-color: #e6f2ff;
    }
    .total-section {
      width: 50%;
      margin-left: auto;
      margin-top: 20px;
      margin-bottom: 30px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid #e0e0e0;
    }
    .total-row.final {
      font-weight: bold;
      font-size: 18px;
      color: #3498db;
      border-bottom: none;
      background-color: #f5f9fd;
      border-radius: 5px;
      margin-top: 10px;
    }
    .notes {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 0.9em;
      color: #7f8c8d;
      text-align: center;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .signature-line {
      width: 45%;
      border-top: 1px solid #e0e0e0;
      padding-top: 10px;
      text-align: center;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <img src="[COMPANY_LOGO]" alt="Logo" class="company-logo">
        <h3>[COMPANY_NAME]</h3>
        <p>[COMPANY_ADDRESS]</p>
        <p>Tel: [COMPANY_PHONE] | Email: [COMPANY_EMAIL]</p>
        <p>Licencia: [COMPANY_LICENSE]</p>
      </div>
      
      <div class="estimate-meta">
        <h2>PRESUPUESTO</h2>
        <p><strong>Fecha:</strong> [ESTIMATE_DATE]</p>
        <p><strong>Presupuesto #:</strong> [ESTIMATE_NUMBER]</p>
        <p><strong>Válido hasta:</strong> 30 días</p>
      </div>
    </div>
    
    <div class="info-section">
      <div class="client-info">
        <h3 class="section-title">Cliente</h3>
        <p><strong>Nombre:</strong> [CLIENT_NAME]</p>
        <p><strong>Email:</strong> [CLIENT_EMAIL]</p>
        <p><strong>Teléfono:</strong> [CLIENT_PHONE]</p>
        <p><strong>Dirección:</strong> [CLIENT_ADDRESS]</p>
        <p><strong>Ciudad/Estado:</strong> [CLIENT_CITY_STATE_ZIP]</p>
      </div>
      
      <div class="project-info">
        <h3 class="section-title">Detalles del Proyecto</h3>
        <p><strong>Tipo:</strong> [PROJECT_TYPE]</p>
        <p><strong>Dirección:</strong> [PROJECT_ADDRESS]</p>
        <p><strong>Dimensiones:</strong> [PROJECT_DIMENSIONS]</p>
        <p><strong>Tiempo est. finalización:</strong> [COMPLETION_TIME] días</p>
      </div>
    </div>
    
    <div class="notes">
      <h3 class="section-title">Descripción del Proyecto</h3>
      <p>[PROJECT_NOTES]</p>
    </div>
    
    <h3 class="section-title">Detalle de Costos</h3>
    <table>
      <tr>
        <th style="width: 40%;">Descripción</th>
        <th style="width: 15%;">Cantidad</th>
        <th style="width: 15%;">Unidad</th>
        <th style="width: 15%;">Precio</th>
        <th style="width: 15%;">Total</th>
      </tr>
      [COST_TABLE_ROWS]
    </table>
    
    <div class="total-section">
      <div class="total-row">
        <span>Subtotal</span>
        <span>[SUBTOTAL]</span>
      </div>
      <div class="total-row">
        <span>Impuesto ([TAX_RATE])</span>
        <span>[TAX_AMOUNT]</span>
      </div>
      <div class="total-row final">
        <span>TOTAL</span>
        <span>[TOTAL]</span>
      </div>
    </div>
    
    <div class="terms">
      <h3 class="section-title">Términos y Condiciones</h3>
      <ul>
        <li>Este presupuesto es válido por 30 días desde la fecha de emisión.</li>
        <li>Se requiere un depósito del 50% para iniciar el trabajo.</li>
        <li>El balance restante se pagará al completar el trabajo a satisfacción del cliente.</li>
        <li>Los cambios en el ámbito del proyecto pueden afectar al costo final del mismo.</li>
        <li>Todos los materiales tienen garantía del fabricante. Nuestra garantía de instalación es de 1 año.</li>
      </ul>
    </div>
    
    <div class="signature-section">
      <div class="signature-line">
        <p>Firma del Cliente</p>
      </div>
      <div class="signature-line">
        <p>Fecha</p>
      </div>
    </div>
    
    <div class="footer">
      <p>¡Gracias por su confianza! Estamos comprometidos a brindarle un servicio de calidad.</p>
      <p>[COMPANY_NAME] | [COMPANY_ADDRESS] | [COMPANY_PHONE]</p>
    </div>
  </div>
</body>
</html>`;
    } 
    else { // Luxury template
      console.log('Usando plantilla PREMIUM DE LUJO INTEGRADA (luxurytemplate.html)');
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Presupuesto Premium</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;600&display=swap');
    
    body {
      font-family: 'Montserrat', sans-serif;
      line-height: 1.6;
      color: #2c3e50;
      max-width: 850px;
      margin: 0 auto;
      padding: 0;
      background-color: #f9f9f9;
    }
    
    .container {
      background-color: white;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      position: relative;
    }
    
    .gold-accent {
      height: 10px;
      background: linear-gradient(to right, #d4af37, #f9f095, #d4af37);
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }
    
    h1, h2, h3 {
      font-family: 'Playfair Display', serif;
      color: #2c3e50;
    }
    
    h1 {
      font-size: 36px;
      margin: 0;
    }
    
    h2 {
      font-size: 28px;
      margin-top: 0;
      color: #d4af37;
    }
    
    h3 {
      font-size: 22px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #d4af37;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #eaeaea;
    }
    
    .company-logo {
      max-width: 200px;
      margin-bottom: 15px;
    }
    
    .estimate-meta {
      text-align: right;
      padding: 20px;
      background-color: #f8f9fa;
      border-left: 3px solid #d4af37;
    }
    
    .elegant-title {
      text-align: center;
      margin: 20px 0 40px;
    }
    
    .elegant-title h2 {
      display: inline-block;
      padding: 0 40px;
      position: relative;
    }
    
    .elegant-title h2:before, .elegant-title h2:after {
      content: "";
      position: absolute;
      top: 50%;
      width: 80px;
      height: 1px;
      background: #d4af37;
    }
    
    .elegant-title h2:before {
      left: -40px;
    }
    
    .elegant-title h2:after {
      right: -40px;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .client-info, .project-info {
      width: 48%;
      padding: 25px;
      background-color: #f8f9fa;
      box-shadow: 0 3px 10px rgba(0,0,0,0.05);
    }
    
    .project-description {
      margin-bottom: 40px;
      padding: 25px;
      background-color: #f8f9fa;
      border-left: 3px solid #d4af37;
      line-height: 1.8;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      box-shadow: 0 3px 15px rgba(0,0,0,0.05);
    }
    
    th, td {
      padding: 18px 15px;
      text-align: left;
    }
    
    th {
      background-color: #2c3e50;
      color: white;
      font-weight: 600;
      letter-spacing: 1px;
    }
    
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    .total-section {
      width: 60%;
      margin-left: auto;
      padding: 20px;
      background-color: #f8f9fa;
      box-shadow: 0 3px 10px rgba(0,0,0,0.05);
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eaeaea;
    }
    
    .total-row.final {
      font-weight: 600;
      font-size: 20px;
      color: #d4af37;
      border-bottom: none;
      padding-top: 20px;
    }
    
    .terms {
      margin: 40px 0;
      padding: 25px;
      background-color: #f8f9fa;
      border: 1px solid #eaeaea;
    }
    
    .terms ul {
      padding-left: 20px;
    }
    
    .terms li {
      margin-bottom: 10px;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    
    .signature-line {
      width: 45%;
      border-top: 1px solid #2c3e50;
      padding-top: 10px;
      text-align: center;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eaeaea;
      text-align: center;
      font-size: 0.9em;
      color: #7f8c8d;
    }
    
    .thank-you {
      text-align: center;
      margin: 40px 0;
      font-size: 22px;
      color: #d4af37;
      font-family: 'Playfair Display', serif;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="gold-accent"></div>
    
    <div class="header">
      <div>
        <img src="[COMPANY_LOGO]" alt="Logo" class="company-logo">
        <h1>[COMPANY_NAME]</h1>
        <p style="color: #7f8c8d;">[COMPANY_ADDRESS]</p>
        <p style="color: #7f8c8d;">Tel: [COMPANY_PHONE] | Email: [COMPANY_EMAIL]</p>
        <p style="color: #7f8c8d;">Licencia: [COMPANY_LICENSE]</p>
      </div>
      
      <div class="estimate-meta">
        <h2>PRESUPUESTO</h2>
        <p><strong>Fecha:</strong> [ESTIMATE_DATE]</p>
        <p><strong>Presupuesto #:</strong> [ESTIMATE_NUMBER]</p>
        <p><strong>Válido hasta:</strong> 30 días</p>
      </div>
    </div>
    
    <div class="elegant-title">
      <h2>Propuesta de Servicios</h2>
    </div>
    
    <div class="info-section">
      <div class="client-info">
        <h3>Información del Cliente</h3>
        <p><strong>Nombre:</strong> [CLIENT_NAME]</p>
        <p><strong>Email:</strong> [CLIENT_EMAIL]</p>
        <p><strong>Teléfono:</strong> [CLIENT_PHONE]</p>
        <p><strong>Dirección:</strong> [CLIENT_ADDRESS]</p>
        <p><strong>Ciudad/Estado:</strong> [CLIENT_CITY_STATE_ZIP]</p>
      </div>
      
      <div class="project-info">
        <h3>Detalles del Proyecto</h3>
        <p><strong>Tipo de Proyecto:</strong> [PROJECT_TYPE]</p>
        <p><strong>Dirección del Proyecto:</strong> [PROJECT_ADDRESS]</p>
        <p><strong>Dimensiones:</strong> [PROJECT_DIMENSIONS]</p>
        <p><strong>Tiempo estimado de finalización:</strong> [COMPLETION_TIME] días</p>
      </div>
    </div>
    
    <div class="project-description">
      <h3>Descripción del Proyecto</h3>
      <p>[PROJECT_NOTES]</p>
    </div>
    
    <h3>Inversión Detallada</h3>
    <table>
      <tr>
        <th style="width: 40%;">Descripción</th>
        <th style="width: 15%;">Cantidad</th>
        <th style="width: 15%;">Unidad</th>
        <th style="width: 15%;">Precio</th>
        <th style="width: 15%;">Total</th>
      </tr>
      [COST_TABLE_ROWS]
    </table>
    
    <div class="total-section">
      <div class="total-row">
        <span>Subtotal</span>
        <span>[SUBTOTAL]</span>
      </div>
      <div class="total-row">
        <span>Impuesto ([TAX_RATE])</span>
        <span>[TAX_AMOUNT]</span>
      </div>
      <div class="total-row final">
        <span>INVERSIÓN TOTAL</span>
        <span>[TOTAL]</span>
      </div>
    </div>
    
    <div class="terms">
      <h3>Términos y Condiciones</h3>
      <ul>
        <li>Este presupuesto tiene validez por 30 días a partir de la fecha de emisión.</li>
        <li>Se requiere un depósito inicial del 50% para programar y comenzar el trabajo.</li>
        <li>El saldo restante se pagará al completar el trabajo a satisfacción del cliente.</li>
        <li>Cualquier modificación al alcance original del proyecto puede afectar el costo y el tiempo de finalización.</li>
        <li>Todos los materiales incluidos tienen garantía del fabricante. Nuestra garantía de mano de obra es de 2 años.</li>
        <li>Nos comprometemos a utilizar materiales de la más alta calidad y a proporcionar un servicio excepcional.</li>
      </ul>
    </div>
    
    <div class="thank-you">
      <p>Gracias por considerar nuestros servicios para su proyecto</p>
    </div>
    
    <div class="signature-section">
      <div class="signature-line">
        <p>Firma del Cliente</p>
      </div>
      <div class="signature-line">
        <p>Fecha</p>
      </div>
    </div>
    
    <div class="footer">
      <p>[COMPANY_NAME] | [COMPANY_ADDRESS] | [COMPANY_PHONE]</p>
      <p>www.sucompania.com | Email: [COMPANY_EMAIL]</p>
    </div>
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