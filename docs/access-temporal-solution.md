# 🔧 SOLUCIÓN DE ACCESO TEMPORAL

## ❌ PROBLEMA ACTUAL
- OAuth Google/Apple fallan con `auth/internal-error`
- Falta configuración externa de Google Cloud Console y Apple Developer Console
- El usuario necesita acceso inmediato para continuar trabajando

## ✅ SOLUCIÓN TEMPORAL IMPLEMENTADA

### **1. Habilitar Email/Password Authentication**

**Pasos en Firebase Console:**
1. Ve a: [console.firebase.google.com](https://console.firebase.google.com/)
2. Proyecto: **owl-fenc**
3. **Authentication** > **Sign-in method**
4. Habilita **Email/password** si no está habilitado
5. Habilita **Email link (passwordless sign-in)**

### **2. Crear Usuario Temporal**

**Opción A: Crear desde Firebase Console**
1. Ve a **Authentication** > **Users**
2. **Add user**
3. Email: `admin@owlfence.dev`
4. Password: `TempAccess2025!`

**Opción B: Crear desde código (recomendado)**
```javascript
// En la consola del navegador (F12):
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './src/lib/firebase';

createUserWithEmailAndPassword(auth, 'admin@owlfence.dev', 'TempAccess2025!')
  .then(user => console.log('Usuario temporal creado:', user.user.email))
  .catch(error => console.error('Error:', error));
```

### **3. Credenciales de Acceso Temporal**

**Email:** `admin@owlfence.dev`
**Password:** `TempAccess2025!`

### **4. Una vez que OAuth funcione:**

1. **Configura Google Cloud Console** (5-10 minutos)
2. **Configura Apple Developer Console** (10-15 minutos)
3. **Prueba OAuth Google y Apple**
4. **Elimina usuario temporal** desde Firebase Console

## 🎯 **PRÓXIMOS PASOS INMEDIATOS**

### **Para el Usuario:**
1. **Habilita Email/Password** en Firebase Console
2. **Crea usuario temporal** con las credenciales arriba
3. **Inicia sesión** para continuar trabajando
4. **Configura OAuth** cuando tengas tiempo

### **URLs para Google Console:**
- **Home Page:** `https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/`
- **Privacy Policy:** `https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/privacy-policy`
- **Terms of Service:** `https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/terms-of-service`

## ⚡ **ACCESO INMEDIATO EN 2 PASOS**

1. **Firebase Console** → Authentication → Sign-in method → Habilitar "Email/password"
2. **Crear usuario** → Email: `admin@owlfence.dev` → Password: `TempAccess2025!`

**¡Listo! Podrás acceder inmediatamente mientras configuras OAuth.**