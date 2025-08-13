/**
 * Script de depuración para verificar configuración OAuth
 */

console.log('🔍 DEPURACIÓN OAuth - Verificando configuración');

// Verificar variables de entorno
console.log('\n=== VARIABLES DE ENTORNO ===');
console.log('GOOGLE_OAUTH_CLIENT_ID:', process.env.GOOGLE_OAUTH_CLIENT_ID ? 'presente' : 'ausente');
console.log('GOOGLE_OAUTH_CLIENT_SECRET:', process.env.GOOGLE_OAUTH_CLIENT_SECRET ? 'presente' : 'ausente');
console.log('APPLE_OAUTH_CLIENT_ID:', process.env.APPLE_OAUTH_CLIENT_ID ? 'presente' : 'ausente');
console.log('APPLE_OAUTH_CLIENT_SECRET:', process.env.APPLE_OAUTH_CLIENT_SECRET ? 'presente' : 'ausente');

if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
  console.log('Google Client ID (primeros 20 chars):', process.env.GOOGLE_OAUTH_CLIENT_ID.substring(0, 20) + '...');
}

if (process.env.APPLE_OAUTH_CLIENT_ID) {
  console.log('Apple Client ID:', process.env.APPLE_OAUTH_CLIENT_ID);
}

// Verificar endpoint OAuth
console.log('\n=== PROBANDO ENDPOINT OAUTH ===');
fetch('http://localhost:5000/api/oauth/config')
  .then(response => response.json())
  .then(data => {
    console.log('Respuesta del endpoint:', JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Error al obtener configuración OAuth:', error);
  });

console.log('\n=== ANALISIS DE CONFIGURACIÓN ===');
console.log('Los errores "auth/internal-error" pueden indicar:');
console.log('1. Client IDs no configurados en Firebase Console');
console.log('2. Dominios no autorizados en OAuth Settings');
console.log('3. Credenciales OAuth deshabilitadas en Firebase');

console.log('\n=== PRÓXIMOS PASOS SUGERIDOS ===');
console.log('1. Verificar que Google OAuth esté habilitado en Firebase Console');
console.log('2. Verificar que Apple OAuth esté habilitado en Firebase Console');
console.log('3. Confirmar que los Client IDs coincidan exactamente');
console.log('4. Verificar dominios autorizados incluyan el dominio actual');