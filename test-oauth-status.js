/**
 * OAuth Status Complete Test
 * Diagnóstico completo del estado actual de OAuth
 */

async function completeOAuthDiagnosis() {
  console.log('🔧 DIAGNÓSTICO COMPLETO OAUTH SYSTEM');
  console.log('='.repeat(50));
  
  // 1. Verificar estado de Firebase
  console.log('1. FIREBASE SETUP:');
  try {
    const app = window.firebase.app();
    console.log('✅ Project ID:', app.options.projectId);
    console.log('✅ Auth Domain:', app.options.authDomain);
    console.log('✅ API Key format:', app.options.apiKey.substring(0, 10) + '...');
    
    const auth = window.firebase.auth();
    console.log('✅ Auth instance active');
    console.log('✅ Current user:', auth.currentUser?.email || 'None');
  } catch (error) {
    console.log('❌ Firebase error:', error.message);
  }
  
  // 2. Test específico de configuración
  console.log('\n2. DOMAIN CONFIGURATION:');
  console.log('Current domain:', window.location.hostname);
  console.log('Current origin:', window.location.origin);
  console.log('Expected in Google Console: ✅ (confirmed by user)');
  
  // 3. Test de network/CORS
  console.log('\n3. NETWORK TEST:');
  try {
    const response = await fetch('https://accounts.google.com/o/oauth2/v2/auth', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log('✅ Google OAuth endpoint reachable');
  } catch (error) {
    console.log('❌ Network/CORS issue:', error.message);
  }
  
  // 4. Test de popup permissions
  console.log('\n4. POPUP PERMISSIONS:');
  try {
    const testPopup = window.open('', 'test', 'width=1,height=1');
    if (testPopup) {
      console.log('✅ Popup permissions OK');
      testPopup.close();
    } else {
      console.log('❌ Popup blocked');
    }
  } catch (error) {
    console.log('❌ Popup error:', error.message);
  }
  
  // 5. Test directo de Google OAuth sin Firebase wrapper
  console.log('\n5. DIRECT GOOGLE API TEST:');
  try {
    // Test directo con gapi si está disponible
    if (window.gapi) {
      console.log('✅ Google API (gapi) available');
    } else {
      console.log('⚠️ Google API (gapi) not loaded');
    }
  } catch (error) {
    console.log('❌ GAPI error:', error.message);
  }
  
  // 6. Firebase Auth detailed error
  console.log('\n6. DETAILED FIREBASE AUTH TEST:');
  try {
    const auth = window.firebase.auth();
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    
    console.log('✅ Provider created successfully');
    console.log('🔧 Attempting auth...');
    
    // Intentar pero capturar error específico
    const result = await auth.signInWithPopup(provider);
    console.log('🎉 SUCCESS - OAuth working!');
    return result;
    
  } catch (error) {
    console.log('❌ Detailed Firebase error:');
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Stack:', error.stack?.substring(0, 200));
    
    // Análisis específico del error
    if (error.code === 'auth/internal-error') {
      console.log('\n🔧 INTERNAL ERROR ANALYSIS:');
      console.log('- Google Console: ✅ Configured (user confirmed)');
      console.log('- Firebase Console: ✅ Configured (user confirmed)');
      console.log('- Possible causes:');
      console.log('  1. Browser blocking third-party cookies');
      console.log('  2. Firebase SDK version compatibility');
      console.log('  3. Timing/propagation issue');
      console.log('  4. Replit-specific networking restrictions');
    }
    
    return error;
  }
}

// Workaround test - usar autenticación directa sin Firebase wrapper
async function testDirectGoogleAuth() {
  console.log('\n🧪 TESTING DIRECT GOOGLE AUTH (NO FIREBASE)');
  console.log('='.repeat(40));
  
  try {
    // Cargar Google API directamente
    if (!window.gapi) {
      console.log('🔧 Loading Google API...');
      await loadGoogleAPI();
    }
    
    await gapi.load('auth2', async () => {
      console.log('✅ Google Auth2 loaded');
      
      const authInstance = gapi.auth2.init({
        client_id: '610753147271-o5ki6kqvf1as7kc2umraov7o9cbjq6hn.apps.googleusercontent.com'
      });
      
      console.log('✅ Google Auth2 initialized');
      
      const result = await authInstance.signIn();
      console.log('🎉 DIRECT GOOGLE AUTH SUCCESS!');
      console.log('User:', result.getBasicProfile().getEmail());
      
      return result;
    });
    
  } catch (error) {
    console.log('❌ Direct Google Auth failed:', error.message);
  }
}

function loadGoogleAPI() {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve(window.gapi);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve(window.gapi);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Hacer funciones disponibles globalmente
window.completeOAuthDiagnosis = completeOAuthDiagnosis;
window.testDirectGoogleAuth = testDirectGoogleAuth;

console.log('🔧 OAuth Diagnosis loaded. Run:');
console.log('completeOAuthDiagnosis() - Full diagnosis');
console.log('testDirectGoogleAuth() - Direct Google API test');