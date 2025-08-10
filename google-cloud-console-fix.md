# 🚨 SOLUCIÓN ESPECÍFICA: Error auth/internal-error

## Problema Identificado
- Firebase Console: ✅ Configurado correctamente
- Error: `auth/internal-error` en Google y Apple OAuth
- **Causa Real:** Configuración específica de Google Cloud Console

## 🔧 SOLUCIÓN INMEDIATA - GOOGLE CLOUD CONSOLE

### PASO 1: Acceso Directo a Google Cloud Console
**Link Directo:** [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

### PASO 2: Proyecto Correcto
- **Seleccionar proyecto:** `owl-fenc` (mismo que Firebase)
- **Verificar que estás en el proyecto correcto**

### PASO 3: Editar OAuth 2.0 Client ID
1. **Buscar:** "OAuth 2.0 Client IDs" 
2. **Hacer clic en el lápiz** (editar) del Client ID existente
3. **NO crear uno nuevo** - editar el existente

### PASO 4: Agregar Dominios ESPECÍFICOS
**En "Authorized JavaScript origins" DEBE incluir EXACTAMENTE:**
```
https://app.owlfenc.com
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
https://owl-fenc.firebaseapp.com
https://owl-fenc.web.app
```

**En "Authorized redirect URIs" DEBE incluir EXACTAMENTE:**
```
https://app.owlfenc.com/__/auth/handler
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
https://owl-fenc.web.app/__/auth/handler
```

### PASO 5: Verificar Client ID Match
1. **Copiar el Client ID** de Google Cloud Console
2. **Ir a Firebase Console** > Authentication > Sign-in method > Google
3. **Verificar que el Client ID sea EXACTAMENTE EL MISMO**

## 🍎 APPLE DEVELOPER CONSOLE - VERIFICACIÓN

### Return URLs Exactas Requeridas:
```
https://app.owlfenc.com/__/auth/handler
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
```

### Domains Exactos Requeridos:
```
app.owlfenc.com
4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
owl-fenc.firebaseapp.com
```

## ⚡ CAUSA MÁS PROBABLE

**El error `auth/internal-error` con Firebase Console configurado = Dominio no autorizado en Google Cloud Console específicamente**

La configuración de Firebase Console NO es lo mismo que Google Cloud Console. Son dos lugares diferentes que deben estar sincronizados.

## 🧪 TEST DESPUÉS DE CONFIGURAR

1. Guardar cambios en Google Cloud Console
2. Esperar 2-3 minutos 
3. Probar Google OAuth - debe resolverse `auth/internal-error`
4. Si Apple sigue fallando, verificar Apple Developer Console URLs exactas