# 🚨 DIAGNÓSTICO ERROR OAUTH: auth/internal-error

## Error Identificado
**Código:** `auth/internal-error`  
**Proveedores Afectados:** Google OAuth y Apple OAuth  
**Causa Principal:** Configuración incompleta en Firebase Console

## 🔧 SOLUCIONES ESPECÍFICAS REQUERIDAS

### 📍 VERIFICAR FIREBASE CONSOLE

**Ir a:** [Firebase Console](https://console.firebase.google.com/project/owl-fenc/authentication/providers)

### 🟢 GOOGLE PROVIDER - VERIFICACIONES

1. **Authentication > Sign-in method > Google**
   - ✅ Debe estar **ENABLED**
   - ✅ **Web SDK configuration** debe mostrar:
     - Client ID: Debe coincidir con Google Cloud Console
     - Client Secret: Debe estar configurado
   
2. **Authorized domains** debe incluir:
   ```
   app.owlfenc.com
   4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
   owl-fenc.firebaseapp.com
   owl-fenc.web.app
   ```

### 🍎 APPLE PROVIDER - VERIFICACIONES

1. **Authentication > Sign-in method > Apple**
   - ✅ Debe estar **ENABLED**
   - ✅ **Services ID** debe estar configurado
   - ✅ **Apple Team ID** debe estar configurado
   - ✅ **Private Key** (.p8 file) debe estar subido
   - ✅ **Key ID** debe estar configurado

## 🔧 PASOS ESPECÍFICOS PARA RESOLVER

### PASO 1: Verificar Google Provider
```
1. Firebase Console > owl-fenc > Authentication > Sign-in method
2. Click "Google" provider
3. Verificar que esté ENABLED
4. Verificar Web SDK configuration
5. Si falta algo, agregar Client ID y Client Secret de Google Cloud Console
```

### PASO 2: Verificar Apple Provider
```
1. Click "Apple" provider
2. Verificar que esté ENABLED
3. Verificar Services ID (com.owlfence.webapp)
4. Verificar Apple Team ID (10 caracteres)
5. Verificar Private Key está subido
6. Verificar Key ID está configurado
```

### PASO 3: Verificar Dominios Autorizados
```
1. En la parte inferior de "Sign-in method"
2. Sección "Authorized domains"
3. Agregar todos los dominios listados arriba
```

## ⚠️ ERROR MÁS COMÚN

**El error `auth/internal-error` generalmente significa:**
- ❌ Provider no está habilitado en Firebase Console
- ❌ Falta Client Secret en Google Provider
- ❌ Falta Private Key en Apple Provider
- ❌ Services ID o Team ID incorrectos en Apple

## 🧪 VERIFICACIÓN POST-CONFIGURACIÓN

Después de configurar Firebase Console:
1. Esperar 2-3 minutos para propagación
2. Probar Google OAuth nuevamente
3. Probar Apple OAuth nuevamente
4. Los errores `auth/internal-error` deben resolverse

## 📋 CHECKLIST CRÍTICO

- [ ] Google Provider enabled en Firebase
- [ ] Google Client ID y Secret configurados
- [ ] Apple Provider enabled en Firebase  
- [ ] Apple Services ID configurado
- [ ] Apple Team ID configurado
- [ ] Apple Private Key subido
- [ ] Apple Key ID configurado
- [ ] Todos los dominios en Authorized domains
- [ ] Esperado 2-3 minutos después de cambios