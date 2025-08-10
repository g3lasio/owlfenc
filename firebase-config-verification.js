/**
 * Firebase Configuration Verification
 * Script para verificar la configuración actual de Firebase
 */

// Configuración actual de Firebase que estamos usando
const CURRENT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBkiNyJNG-uGBO3-w4g-q5SbqDxvTdCRSk",
  authDomain: "owl-fenc.firebaseapp.com",
  projectId: "owl-fenc",
  storageBucket: "owl-fenc.firebasestorage.app",
  messagingSenderId: "610753147271",
  appId: "1:610753147271:web:b720b293ba1f4d2f456322",
  measurementId: "G-Z2PWQXHEN0"
};

console.log('🔧 CONFIGURACIÓN FIREBASE ACTUAL:');
console.log('=' .repeat(40));
console.log('Project ID:', CURRENT_FIREBASE_CONFIG.projectId);
console.log('Auth Domain:', CURRENT_FIREBASE_CONFIG.authDomain);
console.log('App ID:', CURRENT_FIREBASE_CONFIG.appId);

console.log('\n🔗 LINKS DIRECTOS PARA CONFIGURACIÓN:');
console.log('=' .repeat(40));
console.log('🟢 Google Provider:');
console.log(`https://console.firebase.google.com/project/${CURRENT_FIREBASE_CONFIG.projectId}/authentication/providers`);

console.log('🍎 Apple Provider:');
console.log(`https://console.firebase.google.com/project/${CURRENT_FIREBASE_CONFIG.projectId}/authentication/providers`);

console.log('🌐 Authorized Domains:');
console.log(`https://console.firebase.google.com/project/${CURRENT_FIREBASE_CONFIG.projectId}/authentication/settings`);

console.log('\n📋 DOMINIOS QUE DEBEN ESTAR EN AUTHORIZED DOMAINS:');
console.log('=' .repeat(50));
console.log('✓ app.owlfenc.com');
console.log('✓ 4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev');
console.log('✓ owl-fenc.firebaseapp.com');
console.log('✓ owl-fenc.web.app');

console.log('\n🚨 CAUSA PRINCIPAL DEL ERROR:');
console.log('=' .repeat(30));
console.log('auth/internal-error = Provider OAuth no configurado completamente en Firebase Console');
console.log('Verificar que AMBOS proveedores (Google + Apple) estén ENABLED con todas sus configuraciones');