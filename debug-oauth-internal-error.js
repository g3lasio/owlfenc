/**
 * Debug OAuth Internal Error
 * Diagnóstico específico para auth/internal-error cuando Firebase Console está configurado
 */

// Verificaciones específicas para auth/internal-error
function debugOAuthInternalError() {
  console.log('🔧 DIAGNÓSTICO ESPECÍFICO: auth/internal-error');
  console.log('='.repeat(50));
  
  // 1. Verificar inicialización de Firebase
  console.log('1. VERIFICACIÓN FIREBASE INITIALIZATION:');
  try {
    const app = window.firebase.app();
    console.log('✅ Firebase app inicializada:', app.name);
    console.log('✅ Project ID:', app.options.projectId);
    console.log('✅ Auth Domain:', app.options.authDomain);
    console.log('✅ API Key presente:', !!app.options.apiKey);
  } catch (error) {
    console.log('❌ Error Firebase init:', error.message);
  }

  // 2. Verificar Auth instance
  console.log('\n2. VERIFICACIÓN FIREBASE AUTH:');
  try {
    const auth = window.firebase.auth();
    console.log('✅ Auth instance:', !!auth);
    console.log('✅ Current user:', auth.currentUser?.email || 'No user');
    console.log('✅ Auth domain:', auth.app.options.authDomain);
  } catch (error) {
    console.log('❌ Error Auth instance:', error.message);
  }

  // 3. Verificar configuración de dominio vs authDomain
  console.log('\n3. VERIFICACIÓN DOMAIN MISMATCH:');
  const currentDomain = window.location.hostname;
  const authDomain = 'owl-fenc.firebaseapp.com';
  console.log('Current domain:', currentDomain);
  console.log('Firebase authDomain:', authDomain);
  console.log('Domain match:', currentDomain === authDomain ? '✅' : '⚠️  Different (normal for development)');

  // 4. Verificar configuración específica de Google Provider
  console.log('\n4. VERIFICACIÓN GOOGLE PROVIDER:');
  try {
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });
    console.log('✅ Google provider creado correctamente');
    console.log('✅ Scopes configurados: email, profile');
  } catch (error) {
    console.log('❌ Error Google provider:', error.message);
  }

  // 5. Verificar configuración específica de Apple Provider
  console.log('\n5. VERIFICACIÓN APPLE PROVIDER:');
  try {
    const provider = new window.firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    console.log('✅ Apple provider creado correctamente');
    console.log('✅ Scopes configurados: email, name');
  } catch (error) {
    console.log('❌ Error Apple provider:', error.message);
  }

  // 6. Verificar CORS y headers
  console.log('\n6. VERIFICACIÓN CORS Y HEADERS:');
  console.log('User-Agent:', navigator.userAgent);
  console.log('Origin:', window.location.origin);
  console.log('Referer:', document.referrer || 'None');

  // 7. Test específico de API Key validity
  console.log('\n7. VERIFICACIÓN API KEY VALIDITY:');
  const apiKey = 'AIzaSyBkiNyJNG-uGBO3-w4g-q5SbqDxvTdCRSk';
  console.log('API Key format:', apiKey.startsWith('AIza') ? '✅' : '❌');
  console.log('API Key length:', apiKey.length, apiKey.length === 39 ? '✅' : '❌');

  return {
    domain: currentDomain,
    authDomain: authDomain,
    apiKey: apiKey.substring(0, 10) + '...',
    timestamp: new Date().toISOString()
  };
}

// Función específica para test popup en ambiente controlado
function testPopupPermissions() {
  console.log('\n🧪 TEST POPUP PERMISSIONS:');
  
  try {
    // Test básico de popup
    const testPopup = window.open('', 'test', 'width=1,height=1');
    if (testPopup) {
      console.log('✅ Popup básico permitido');
      testPopup.close();
    } else {
      console.log('❌ Popup bloqueado por navegador');
    }
  } catch (error) {
    console.log('❌ Error popup test:', error.message);
  }

  // Test específico Firebase popup
  try {
    console.log('🔧 Iniciando test Firebase popup...');
    const auth = window.firebase.auth();
    const provider = new window.firebase.auth.GoogleAuthProvider();
    
    // Solo crear el popup, no completar auth
    console.log('✅ Provider creado, popup debería ser posible');
  } catch (error) {
    console.log('❌ Error Firebase popup setup:', error.message);
  }
}

// Hacer funciones disponibles globalmente
window.debugOAuthInternalError = debugOAuthInternalError;
window.testPopupPermissions = testPopupPermissions;

console.log('🔧 Debug OAuth cargado. Ejecuta:');
console.log('debugOAuthInternalError() - Diagnóstico completo');
console.log('testPopupPermissions() - Test popup específico');