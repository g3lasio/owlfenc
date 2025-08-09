# 🚨 ACCESO TEMPORAL - SOLUCIÓN INMEDIATA

## PROBLEMA ACTUAL
- OAuth Google/Apple fallan con `auth/internal-error`
- Necesitas acceso inmediato al sistema
- Los errores son causados por falta de configuración externa

## ✅ SOLUCIÓN EN 3 PASOS (5 MINUTOS)

### **PASO 1: Habilitar Email/Password en Firebase**
1. Ve a: [Firebase Console](https://console.firebase.google.com/)
2. Proyecto: **owl-fenc**
3. **Authentication** → **Sign-in method**
4. Busca **Email/password** y haz clic **Enable**
5. Activa **Email/password** (primer toggle)
6. Guarda cambios

### **PASO 2: Crear Usuario Temporal**

**Opción A - Firebase Console (Recomendado):**
1. Ve a **Authentication** → **Users**
2. Clic **Add user**
3. **Email:** `admin@owlfence.dev`
4. **Password:** `TempAccess2025!`
5. Clic **Add user**

**Opción B - Consola del Navegador:**
1. Abre la app en el navegador
2. Presiona **F12** → **Console**
3. Copia y pega este código:
```javascript
import('./lib/firebase.js').then(async (firebase) => {
  const { createUserWithEmailAndPassword, auth } = firebase;
  try {
    const user = await createUserWithEmailAndPassword(auth, 'admin@owlfence.dev', 'TempAccess2025!');
    console.log('✅ Usuario creado:', user.user.email);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Usuario ya existe, usa las credenciales');
    } else {
      console.error('Error:', error.message);
    }
  }
});
```

### **PASO 3: Iniciar Sesión**
1. Ve a la página de login de la app
2. Usa **Email/Password** (no OAuth)
3. **Email:** `admin@owlfence.dev`
4. **Password:** `TempAccess2025!`

## 🎯 RESULTADO ESPERADO
- ✅ Acceso inmediato al sistema completo
- ✅ Todas las funcionalidades disponibles
- ✅ Proyectos, contratos, estimaciones, etc.

## 🔧 DESPUÉS DEL ACCESO
Una vez dentro del sistema:
1. Configura OAuth cuando tengas tiempo libre
2. Usa las URLs de compliance que creé para Google Console
3. Elimina el usuario temporal cuando OAuth funcione

## 📋 URLs PARA GOOGLE CONSOLE
```
Home Page: https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/
Privacy Policy: https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/privacy-policy
Terms of Service: https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/terms-of-service
```

## ⚠️ IMPORTANTE
Este es un acceso temporal. Una vez que OAuth funcione:
1. Configura Google Cloud Console y Apple Developer Console
2. Prueba que OAuth funcione correctamente
3. Elimina el usuario temporal desde Firebase Console

**¡En 5 minutos tendrás acceso completo al sistema!**