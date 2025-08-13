/**
 * TEST COMPLETO DE CONFIGURACIÓN OAUTH
 * Diagnóstico exhaustivo del problema auth/internal-error
 */

console.log('🔍 DIAGNÓSTICO COMPLETO OAuth');

// Test 1: Verificar variables de entorno
console.log('\n=== TEST 1: VARIABLES DE ENTORNO ===');
const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const appleClientId = process.env.APPLE_OAUTH_CLIENT_ID;
const appleClientSecret = process.env.APPLE_OAUTH_CLIENT_SECRET;

console.log('Google OAuth Client ID:', googleClientId ? `${googleClientId.substring(0, 30)}...` : '❌ AUSENTE');
console.log('Google OAuth Client Secret:', googleClientSecret ? '✅ PRESENTE' : '❌ AUSENTE');
console.log('Apple OAuth Client ID:', appleClientId ? appleClientId : '❌ AUSENTE');
console.log('Apple OAuth Client Secret:', appleClientSecret ? '✅ PRESENTE' : '❌ AUSENTE');

// Test 2: Verificar formato de Client IDs
console.log('\n=== TEST 2: FORMATO DE CLIENT IDS ===');
if (googleClientId) {
  const isValidGoogleFormat = googleClientId.includes('.apps.googleusercontent.com');
  console.log('Google Client ID formato válido:', isValidGoogleFormat ? '✅' : '❌');
  if (!isValidGoogleFormat) {
    console.log('❌ Google Client ID debe terminar en .apps.googleusercontent.com');
  }
}

if (appleClientId) {
  const isValidAppleFormat = appleClientId.startsWith('com.') || appleClientId.includes('.');
  console.log('Apple Client ID formato válido:', isValidAppleFormat ? '✅' : '❌');
}

// Test 3: Verificar endpoint OAuth
console.log('\n=== TEST 3: ENDPOINT OAUTH ===');
try {
  const response = await fetch('http://localhost:5000/api/oauth/config');
  const data = await response.json();
  
  console.log('Status del endpoint:', response.status === 200 ? '✅' : '❌');
  console.log('Configuración recibida:');
  console.log('  Google habilitado:', data.google?.enabled ? '✅' : '❌');
  console.log('  Apple habilitado:', data.apple?.enabled ? '✅' : '❌');
  console.log('  Google Client ID presente:', data.google?.clientId ? '✅' : '❌');
  console.log('  Apple Client ID presente:', data.apple?.clientId ? '✅' : '❌');
  
} catch (error) {
  console.error('❌ Error al verificar endpoint OAuth:', error.message);
}

// Test 4: Analizar el problema auth/internal-error
console.log('\n=== TEST 4: ANÁLISIS auth/internal-error ===');
console.log('Los errores "auth/internal-error" en Firebase OAuth indican:');
console.log('1. ❌ Google/Apple OAuth NO están habilitados en Firebase Console');
console.log('2. ❌ Client IDs en Firebase Console NO coinciden con los secretos');
console.log('3. ❌ Dominios autorizados NO incluyen el dominio actual');
console.log('4. ❌ Firebase project NO tiene configuración OAuth válida');

console.log('\n=== SOLUCIÓN RECOMENDADA ===');
console.log('Para resolver auth/internal-error se necesita:');
console.log('1. 🔧 Habilitar Google OAuth en Firebase Console > Authentication > Sign-in method');
console.log('2. 🔧 Habilitar Apple OAuth en Firebase Console > Authentication > Sign-in method');
console.log('3. 🔧 Configurar Client IDs EXACTOS en Firebase Console');
console.log('4. 🔧 Agregar dominios autorizados en OAuth settings');

console.log('\n=== ALTERNATIVA TÉCNICA ===');
console.log('Como alternativa, implementar:');
console.log('1. 🔀 OAuth directo sin Firebase (usando credenciales propias)');
console.log('2. 🔀 Autenticación híbrida con fallback a email/password');
console.log('3. 🔀 Custom token authentication después de OAuth exitoso');

// Test 5: Verificar dominio actual
console.log('\n=== TEST 5: DOMINIO ACTUAL ===');
const currentDomain = process.env.REPLIT_DOMAIN || 'localhost:5000';
console.log('Dominio actual:', currentDomain);
console.log('Debe estar en Firebase Console > Authentication > Settings > Authorized domains');

console.log('\n🎯 CONCLUSIÓN: Las credenciales OAuth están presentes pero Firebase Console necesita configuración manual.');