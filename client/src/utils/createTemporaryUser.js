// 🔧 SCRIPT PARA CREAR USUARIO TEMPORAL
// Copia y pega en la consola del navegador (F12) para crear acceso inmediato

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase.ts';

// Función para crear usuario temporal
const createTemporaryUser = async () => {
  try {
    const email = 'admin@owlfence.dev';
    const password = 'TempAccess2025!';
    
    console.log('🔧 Creando usuario temporal...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    console.log('✅ Usuario temporal creado exitosamente!');
    console.log('📧 Email:', userCredential.user.email);
    console.log('🔑 Password: TempAccess2025!');
    console.log('🚀 Ahora puedes iniciar sesión con estas credenciales');
    
    return userCredential.user;
  } catch (error) {
    console.error('❌ Error creando usuario temporal:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ El usuario temporal ya existe. Puedes usar:');
      console.log('📧 Email: admin@owlfence.dev');
      console.log('🔑 Password: TempAccess2025!');
    } else if (error.code === 'auth/weak-password') {
      console.log('❌ Password muy débil. Intenta con: TempAccess2025!Strong');
    } else if (error.code === 'auth/operation-not-allowed') {
      console.log('❌ Email/Password auth no está habilitado en Firebase Console');
      console.log('🔧 Ve a: Firebase Console > Authentication > Sign-in method > Habilitar Email/password');
    }
    
    throw error;
  }
};

// Llamar la función
createTemporaryUser();

// INSTRUCCIONES DE USO:
// 1. Abre la consola del navegador (F12)
// 2. Ve a la pestaña Console
// 3. Copia y pega este código completo
// 4. Presiona Enter
// 5. Usa: admin@owlfence.dev / TempAccess2025!