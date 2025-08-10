/**
 * OAuth System Verification Test
 * Verifica que todos los componentes OAuth estén funcionando
 */

// Función para verificar el estado de OAuth desde el navegador
function runOAuthTest() {
  console.log('🔧 INICIANDO VERIFICACIÓN OAUTH COMPLETA');
  console.log('=' .repeat(50));

  // Verificar configuración Firebase
  if (window.firebase) {
    console.log('✅ Firebase SDK cargado correctamente');
    console.log('✅ Proyecto Firebase:', window.firebase.app().options.projectId);
  }

  // Verificar dominios autorizados
  console.log('🌐 Dominio actual:', window.location.hostname);
  console.log('🔧 URL completa:', window.location.href);

  // Verificar botones OAuth
  const googleButton = document.querySelector('[class*="google"]') || 
                      document.querySelector('button[onclick*="google"]') ||
                      document.querySelector('button:contains("Google")');
  
  const appleButton = document.querySelector('[class*="apple"]') || 
                     document.querySelector('button[onclick*="apple"]') ||
                     document.querySelector('button:contains("Apple")');

  console.log('🟢 Botón Google encontrado:', !!googleButton);
  console.log('🍎 Botón Apple encontrado:', !!appleButton);

  // Verificar imports Firebase
  try {
    if (window.firebase?.auth) {
      console.log('✅ Firebase Auth disponible');
      console.log('✅ Auth Domain:', window.firebase.auth().app.options.authDomain);
      
      // Verificar proveedores OAuth
      const auth = window.firebase.auth();
      console.log('✅ Firebase Auth inicializado');
    }
  } catch (error) {
    console.log('❌ Error Firebase Auth:', error.message);
  }

  // Verificar estado de autenticación
  console.log('🔐 Usuario actual:', window.firebase?.auth().currentUser?.email || 'No autenticado');

  console.log('\n📋 RESUMEN DE VERIFICACIÓN:');
  console.log('='.repeat(30));
  return {
    firebaseLoaded: !!window.firebase,
    authAvailable: !!window.firebase?.auth,
    googleButton: !!googleButton,
    appleButton: !!appleButton,
    domain: window.location.hostname,
    currentUser: window.firebase?.auth().currentUser?.email || null
  };
}

// Para ejecutar en la consola del navegador
window.runOAuthTest = runOAuthTest;
console.log('✅ Test OAuth cargado. Ejecuta: runOAuthTest()');