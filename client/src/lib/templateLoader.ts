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
    // Mapear el estilo al nombre de archivo
    const templateFileName = templateStyle === 'standard' ? 'basictemplateestimate.html' : 
                             templateStyle === 'professional' ? 'Premiumtemplateestimate.html' : 
                             'luxurytemplate.html';
    
    console.log(`Cargando plantilla: ${templateFileName}`);
    
    // Construir la URL para la plantilla - intentar diferentes rutas
    const templateUrls = [
      `/templates/${templateFileName}`,
      `/static/templates/${templateFileName}`,
      `/public/templates/${templateFileName}`,
      `/public/static/templates/${templateFileName}`
    ];
    
    console.log(`Intentando cargar plantilla desde múltiples rutas posibles`);
    
    // Intentar cargar desde varias rutas
    let response;
    let loaded = false;
    
    for (const url of templateUrls) {
      try {
        console.log(`Intentando cargar plantilla desde: ${url}`);
        response = await fetch(url);
        
        if (response.ok) {
          console.log(`✅ Plantilla cargada exitosamente desde: ${url}`);
          loaded = true;
          break;
        } else {
          console.log(`❌ Fallo cargando desde ${url}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.error(`Error intentando cargar desde ${url}:`, err);
      }
    }
    
    if (!loaded) {
      console.error('No se pudo cargar la plantilla desde ninguna ruta');
      response = new Response(null, { status: 404, statusText: 'No se encontró ninguna plantilla' });
    }
    
    if (!response.ok) {
      console.error(`Error cargando plantilla ${templateFileName}:`, response.statusText);
      
      // Intentar cargar la plantilla básica como respaldo
      if (templateFileName !== 'basictemplateestimate.html') {
        console.log('Intentando cargar plantilla básica como respaldo');
        return loadTemplateHTML('standard');
      }
      
      throw new Error(`No se pudo cargar la plantilla: ${response.statusText}`);
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error al cargar la plantilla:', error);
    
    // Template de emergencia si todo lo demás falla
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Presupuesto</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .company-info { margin-bottom: 20px; }
    .client-info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    .footer { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="company-info">
    <h1>[COMPANY_NAME]</h1>
    <p>[COMPANY_ADDRESS]</p>
    <p>Tel: [COMPANY_PHONE] | Email: [COMPANY_EMAIL]</p>
    <p>Licencia: [COMPANY_LICENSE]</p>
  </div>
  
  <div class="estimate-header">
    <h2>Presupuesto #[ESTIMATE_NUMBER]</h2>
    <p>Fecha: [ESTIMATE_DATE]</p>
  </div>
  
  <div class="client-info">
    <h3>Cliente:</h3>
    <p>[CLIENT_NAME]</p>
    <p>[CLIENT_ADDRESS]</p>
    <p>[CLIENT_CITY_STATE_ZIP]</p>
    <p>Tel: [CLIENT_PHONE] | Email: [CLIENT_EMAIL]</p>
  </div>
  
  <div class="project-info">
    <h3>Proyecto:</h3>
    <p>Tipo: [PROJECT_TYPE]</p>
    <p>Dirección: [PROJECT_ADDRESS]</p>
    <p>Dimensiones: [PROJECT_DIMENSIONS]</p>
    <p>Notas: [PROJECT_NOTES]</p>
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