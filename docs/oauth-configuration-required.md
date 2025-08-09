# 🔧 CONFIGURACIÓN OAUTH REQUERIDA - PASOS ESPECÍFICOS

## ❌ PROBLEMA ACTUAL
Los botones Google y Apple muestran "refuse to connect" porque falta configuración en las consolas externas.

## ✅ SOLUCIÓN COMPLETA

### 📍 INFORMACIÓN CLAVE DEL PROYECTO

**Dominio Replit actual:**
```
4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
```

**Firebase Project ID:**
```
owl-fenc
```

---

## 🟢 PASO 1: GOOGLE CLOUD CONSOLE

### 1.1 Acceder a Google Cloud Console
1. Ve a: [console.cloud.google.com](https://console.cloud.google.com/)
2. Selecciona proyecto: **owl-fenc**
3. Ve a: **APIs & Services** > **Credentials**

### 1.2 Configurar OAuth Client ID
1. Busca tu **OAuth 2.0 Client ID** (tipo: Web application)
2. Haz clic en **Edit** (icono de lápiz)

### 1.3 Agregar Dominios Autorizados

**En "Authorized JavaScript origins" agregar:**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
https://owl-fenc.firebaseapp.com
https://owl-fenc.web.app
```

**En "Authorized redirect URIs" agregar:**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
https://owl-fenc.web.app/__/auth/handler
```

### 1.4 Guardar configuración
1. Haz clic **SAVE**
2. Espera 5-10 minutos para que los cambios se propaguen

---

## 🍎 PASO 2: APPLE DEVELOPER CONSOLE

### 2.1 Acceder a Apple Developer
1. Ve a: [developer.apple.com](https://developer.apple.com/)
2. Inicia sesión con tu cuenta Apple Developer
3. Ve a: **Certificates, Identifiers & Profiles**

### 2.2 Crear Service ID (si no existe)
1. Ve a **Identifiers** > **+** (agregar nuevo)
2. Selecciona **Services IDs**
3. **Description:** Owl Fence Web App
4. **Identifier:** com.owlfence.webapp (o similar)
5. Marca **Sign In with Apple**

### 2.3 Configurar Service ID
1. Haz clic en **Configure** junto a "Sign In with Apple"
2. **Primary App ID:** Selecciona tu app principal
3. **Domains and Subdomains:**
   ```
   4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
   owl-fenc.firebaseapp.com
   ```
4. **Return URLs:**
   ```
   https://owl-fenc.firebaseapp.com/__/auth/handler
   ```

### 2.4 Crear Private Key (si no existe)
1. Ve a **Keys** > **+** (agregar nuevo)
2. **Key Name:** Apple Sign In Web Key
3. Marca **Sign In with Apple**
4. **Configure:** Selecciona tu Primary App ID
5. **Download** la key (.p8 file) - ¡GUÁRDALA!

---

## 🔥 PASO 3: FIREBASE CONSOLE

### 3.1 Acceder a Firebase Console
1. Ve a: [console.firebase.google.com](https://console.firebase.google.com/)
2. Selecciona proyecto: **owl-fenc**
3. Ve a **Authentication** > **Sign-in method**

### 3.2 Configurar Google Provider
1. Haz clic en **Google**
2. Verifica que esté **Enabled**
3. **Web SDK configuration** debe mostrar tu Client ID
4. En **Authorized domains** agregar:
   ```
   4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
   ```

### 3.3 Configurar Apple Provider
1. Haz clic en **Apple**
2. **Enable** el provider
3. **Service ID:** com.owlfence.webapp (tu Service ID)
4. **Apple team ID:** (tu Team ID de 10 caracteres)
5. **Private key:** Sube tu archivo .p8
6. **Key ID:** (tu Key ID de Apple Developer)

---

## 🧪 PASO 4: PROBAR LA CONFIGURACIÓN

### 4.1 Probar Google
1. Recarga la página: `https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev`
2. Haz clic **Sign in with Google**
3. Debe abrir popup de Google (no redirect)
4. Completar autenticación

### 4.2 Probar Apple
1. Haz clic **Sign in with Apple**
2. Debe abrir popup de Apple
3. Completar autenticación

---

## 🔍 VERIFICACIÓN DE ERRORES

### Si Google falla:
- **Error:** "unauthorized domain"
- **Solución:** Verifica que el dominio Replit esté en Google Cloud Console

### Si Apple falla:
- **Error:** "invalid_request"
- **Solución:** Verifica Service ID y Return URLs en Apple Developer

### Logs útiles:
- Abre **Developer Tools** > **Console**
- Busca logs que empiecen con `🔧 [GOOGLE-` o `🍎 [APPLE-`

---

## 📋 CHECKLIST FINAL

- [ ] Google Cloud Console configurado
- [ ] Apple Developer Console configurado  
- [ ] Firebase Console configurado
- [ ] Esperado 5-10 minutos para propagación
- [ ] Probado Google OAuth
- [ ] Probado Apple OAuth
- [ ] Sin errores "unauthorized domain"
- [ ] Sin errores "refuse to connect"

---

## 🚨 IMPORTANTE

**Los cambios en Google Cloud Console y Apple Developer Console tardan 5-10 minutos en propagarse.**

Si sigues viendo errores después de configurar todo, espera unos minutos y prueba nuevamente.