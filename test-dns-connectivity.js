/**
 * Script para verificar conectividad DNS con CoreLogic API
 * 
 * Este script prueba si el servidor puede resolver correctamente los nombres de dominio
 * necesarios para conectar con la API de CoreLogic.
 */

import dns from 'dns';
import https from 'https';
import axios from 'axios';

const ENDPOINTS = [
  'api-sandbox.corelogic.com',
  'api.corelogic.com'
];

async function checkDNS(hostname) {
  return new Promise((resolve) => {
    console.log(`\nVerificando resolución DNS para: ${hostname}`);
    
    dns.lookup(hostname, (err, address, family) => {
      if (err) {
        console.log(`❌ ERROR: No se pudo resolver ${hostname}`);
        console.log(`   Detalles: ${err.code} - ${err.message}`);
        console.log('   Este error indica un problema de conectividad DNS.');
        resolve({ success: false, error: err });
      } else {
        console.log(`✅ ÉXITO: ${hostname} se resuelve a ${address} (IPv${family})`);
        resolve({ success: true, address });
      }
    });
  });
}

async function checkConnection(hostname) {
  return new Promise((resolve) => {
    console.log(`\nVerificando conectividad HTTPS para: ${hostname}`);
    
    const req = https.get(`https://${hostname}`, (res) => {
      console.log(`✅ ÉXITO: Conectado a ${hostname}`);
      console.log(`   Status: ${res.statusCode}`);
      res.destroy();
      resolve({ success: true, statusCode: res.statusCode });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ERROR: No se pudo conectar a ${hostname}`);
      console.log(`   Detalles: ${err.message}`);
      resolve({ success: false, error: err });
    });
    
    req.setTimeout(10000, () => {
      console.log(`⚠️ ALERTA: Timeout al conectar a ${hostname}`);
      req.destroy();
      resolve({ success: false, error: new Error('Timeout') });
    });
  });
}

async function testToken(hostname) {
  const consumerKey = process.env.CORELOGIC_CONSUMER_KEY;
  const consumerSecret = process.env.CORELOGIC_CONSUMER_SECRET;
  
  if (!consumerKey || !consumerSecret) {
    console.log('\n⚠️ ALERTA: No se encontraron credenciales de CoreLogic');
    return { success: false };
  }
  
  console.log(`\nProbando obtención de token en: ${hostname}`);
  
  try {
    const tokenUrl = `https://${hostname}/access/oauth/token`;
    console.log(`Conectando a: ${tokenUrl}`);
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', consumerKey);
    params.append('client_secret', consumerSecret);
    
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data && response.data.access_token) {
      console.log('✅ ÉXITO: Token de acceso obtenido correctamente');
      console.log(`   Tipo: ${response.data.token_type}`);
      console.log(`   Expira en: ${response.data.expires_in} segundos`);
      return { success: true, token: response.data.access_token };
    } else {
      console.log('⚠️ ALERTA: Respuesta sin token de acceso');
      console.log('   Respuesta:', JSON.stringify(response.data));
      return { success: false, data: response.data };
    }
  } catch (error) {
    console.log(`❌ ERROR: No se pudo obtener token de ${hostname}`);
    console.log(`   Mensaje: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Datos: ${JSON.stringify(error.response.data)}`);
    }
    
    return { success: false, error };
  }
}

async function main() {
  console.log('===== VERIFICACIÓN DE CONECTIVIDAD CON CORELOGIC API =====');
  console.log('Fecha:', new Date().toISOString());
  
  // Verificar variables de entorno
  console.log('\n----- VERIFICACIÓN DE CREDENCIALES -----');
  
  const consumerKey = process.env.CORELOGIC_CONSUMER_KEY;
  const consumerSecret = process.env.CORELOGIC_CONSUMER_SECRET;
  
  console.log(`CORELOGIC_CONSUMER_KEY: ${consumerKey ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`CORELOGIC_CONSUMER_SECRET: ${consumerSecret ? '✅ Configurada' : '❌ No configurada'}`);
  
  // Verificar DNS
  console.log('\n----- VERIFICACIÓN DE DNS -----');
  
  for (const endpoint of ENDPOINTS) {
    const dnsResult = await checkDNS(endpoint);
    
    if (dnsResult.success) {
      // Verificar conexión HTTPS
      await checkConnection(endpoint);
      
      // Probar obtención de token
      await testToken(endpoint);
    }
  }
  
  console.log('\n===== VERIFICACIÓN COMPLETA =====');
  
  // Sugerencias de solución
  console.log('\n----- POSIBLES SOLUCIONES -----');
  console.log('1. Si hay problemas de DNS:');
  console.log('   - Verificar conectividad a Internet');
  console.log('   - Configurar servidores DNS alternativos (8.8.8.8, 1.1.1.1)');
  console.log('   - Usar una VPN para enrutar el tráfico');
  
  console.log('\n2. Si hay problemas de token:');
  console.log('   - Verificar que las credenciales sean correctas');
  console.log('   - Revisar si la cuenta tiene acceso a la API de CoreLogic');
  console.log('   - Contactar a soporte de CoreLogic para verificar el estado de la cuenta');
}

// Ejecutar la verificación
main().catch(error => {
  console.error('Error en la verificación:', error);
});