/**
 * Diagnóstico directo del servicio PDF para emails
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PDFMONKEY_API_KEY = process.env.PDFMONKEY_API_KEY;
const baseUrl = 'https://api.pdfmonkey.io/api/v1';

// Probar conexión básica
async function testBasicConnection() {
  console.log('Probando conexión con PDF Monkey...');
  
  try {
    const response = await axios.get(`${baseUrl}/current_user`, {
      headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
    });
    
    console.log('Conexión exitosa:', response.data.current_user.email);
    return true;
  } catch (error) {
    console.error('Error de conexión:', error.response?.data || error.message);
    return false;
  }
}

// Listar templates
async function getTemplates() {
  console.log('Obteniendo templates...');
  
  try {
    const response = await axios.get(`${baseUrl}/document_templates`, {
      headers: { 'Authorization': `Bearer ${PDFMONKEY_API_KEY}` }
    });
    
    const templates = response.data.document_templates || [];
    console.log(`Templates disponibles: ${templates.length}`);
    
    templates.forEach(t => {
      console.log(`- ${t.id}: ${t.name}`);
    });
    
    return templates;
  } catch (error) {
    console.error('Error obteniendo templates:', error.response?.data || error.message);
    return [];
  }
}

// Generar PDF simple
async function generateSimplePdf() {
  console.log('Generando PDF de prueba...');
  
  const simpleHTML = `
    <html>
      <body>
        <h1>Estimado de Prueba</h1>
        <p>Fecha: ${new Date().toLocaleDateString()}</p>
        <p>Cliente: Juan Pérez</p>
        <p>Total: $1,500.00</p>
      </body>
    </html>
  `;

  try {
    const payload = {
      document: {
        document_template_id: '2E4DC55E-044E-4FD3-B511-FEBF950071FA',
        payload: {
          html_content: simpleHTML
        }
      }
    };

    const response = await axios.post(`${baseUrl}/documents`, payload, {
      headers: {
        'Authorization': `Bearer ${PDFMONKEY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('PDF creado:', response.data.document.id);
    return response.data.document.id;
  } catch (error) {
    console.error('Error generando PDF:', error.response?.data || error.message);
    return null;
  }
}

// Función principal
async function runDiagnostic() {
  console.log('=== DIAGNÓSTICO PDF MONKEY ===');
  
  if (!PDFMONKEY_API_KEY) {
    console.error('PDFMONKEY_API_KEY no configurada');
    return;
  }

  const connected = await testBasicConnection();
  if (!connected) return;

  const templates = await getTemplates();
  if (templates.length === 0) return;

  const pdfId = await generateSimplePdf();
  if (pdfId) {
    console.log('Diagnóstico completado exitosamente');
  }
}

runDiagnostic().catch(console.error);