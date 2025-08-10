/**
 * Simple OAuth Test - Bypass complex logic
 * Test directo para identificar si es problema de configuración externa
 */

// Test simplificado de Google OAuth
async function testGoogleOAuthSimple() {
  console.log('🧪 TEST SIMPLE GOOGLE OAUTH');
  console.log('='.repeat(30));
  
  try {
    // Verificar que Firebase esté disponible
    if (!window.firebase) {
      console.log('❌ Firebase no disponible');
      return;
    }
    
    const auth = window.firebase.auth();
    console.log('✅ Firebase Auth disponible');
    console.log('✅ Auth Domain:', auth.app.options.authDomain);
    console.log('✅ Project ID:', auth.app.options.projectId);
    
    // Crear provider simple
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    console.log('✅ Google Provider creado');
    console.log('🔧 Intentando signInWithPopup...');
    
    // Test directo sin lógica adicional
    const result = await auth.signInWithPopup(provider);
    
    console.log('🎉 SUCCESS! Google OAuth funcionando');
    console.log('✅ Usuario:', result.user.email);
    console.log('✅ UID:', result.user.uid);
    
    return result.user;
    
  } catch (error) {
    console.log('❌ ERROR en test simple:', error.code);
    console.log('❌ Mensaje:', error.message);
    
    // Diagnosis específica del error
    if (error.code === 'auth/internal-error') {
      console.log('🔧 DIAGNOSIS: auth/internal-error = Google Cloud Console no configurado');
      console.log('🔧 SOLUCIÓN: Verificar Authorized JavaScript origins en Google Cloud Console');
      console.log('🔧 REQUERIDO: https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev');
    } else if (error.code === 'auth/popup-blocked') {
      console.log('🔧 DIAGNOSIS: Popup bloqueado por navegador');
    } else if (error.code === 'auth/unauthorized-domain') {
      console.log('🔧 DIAGNOSIS: Dominio no autorizado');
    }
    
    return null;
  }
}

// Test simplificado de Apple OAuth
async function testAppleOAuthSimple() {
  console.log('\n🧪 TEST SIMPLE APPLE OAUTH');
  console.log('='.repeat(30));
  
  try {
    if (!window.firebase) {
      console.log('❌ Firebase no disponible');
      return;
    }
    
    const auth = window.firebase.auth();
    console.log('✅ Firebase Auth disponible');
    
    // Crear provider simple
    const provider = new window.firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    console.log('✅ Apple Provider creado');
    console.log('🔧 Intentando signInWithPopup...');
    
    // Test directo
    const result = await auth.signInWithPopup(provider);
    
    console.log('🎉 SUCCESS! Apple OAuth funcionando');
    console.log('✅ Usuario:', result.user.email);
    console.log('✅ UID:', result.user.uid);
    
    return result.user;
    
  } catch (error) {
    console.log('❌ ERROR en test Apple:', error.code);
    console.log('❌ Mensaje:', error.message);
    
    if (error.code === 'auth/internal-error') {
      console.log('🔧 DIAGNOSIS: Apple Developer Console no configurado correctamente');
      console.log('🔧 SOLUCIÓN: Verificar Service ID y Return URLs en Apple Developer');
    }
    
    return null;
  }
}

// Test de configuración actual
function testCurrentConfig() {
  console.log('🔍 CONFIGURACIÓN ACTUAL');
  console.log('='.repeat(25));
  console.log('Domain:', window.location.hostname);
  console.log('Origin:', window.location.origin);
  console.log('Protocol:', window.location.protocol);
  console.log('Firebase Available:', !!window.firebase);
  
  if (window.firebase) {
    const app = window.firebase.app();
    console.log('Project ID:', app.options.projectId);
    console.log('Auth Domain:', app.options.authDomain);
    console.log('API Key Present:', !!app.options.apiKey);
  }
}

// Hacer funciones disponibles globalmente
window.testGoogleOAuthSimple = testGoogleOAuthSimple;
window.testAppleOAuthSimple = testAppleOAuthSimple;
window.testCurrentConfig = testCurrentConfig;

console.log('🧪 OAuth Tests cargados. Ejecuta:');
console.log('testCurrentConfig() - Ver configuración');
console.log('testGoogleOAuthSimple() - Test Google OAuth directo');
console.log('testAppleOAuthSimple() - Test Apple OAuth directo');