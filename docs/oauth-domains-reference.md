# 🔐 REFERENCIA RÁPIDA: DOMINIOS OAUTH CONFIGURADOS

## 📋 CONFIGURACIÓN ACTUALIZADA - AGOSTO 2025

### 🌐 DOMINIOS DEL PROYECTO

| Ambiente | Dominio | Uso |
|----------|---------|-----|
| **Producción** | `app.owlfenc.com` | Dominio principal para deployment |
| **Desarrollo** | `4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev` | Dominio actual de Replit |
| **Firebase** | `owl-fenc.firebaseapp.com` | Dominio de Firebase Auth |
| **Firebase Web** | `owl-fenc.web.app` | Dominio alternativo de Firebase |

---

## 🟢 GOOGLE CLOUD CONSOLE - CHECKLIST

### ✅ Authorized JavaScript Origins
```
https://app.owlfenc.com
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
https://owl-fenc.firebaseapp.com
https://owl-fenc.web.app
```

### ✅ Authorized Redirect URIs
```
https://app.owlfenc.com/__/auth/handler
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
https://owl-fenc.web.app/__/auth/handler
```

---

## 🍎 APPLE DEVELOPER CONSOLE - CHECKLIST

### ✅ Domains and Subdomains
```
app.owlfenc.com
4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
owl-fenc.firebaseapp.com
```

### ✅ Return URLs
```
https://app.owlfenc.com/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
```

---

## 🔥 FIREBASE CONSOLE - CHECKLIST

### ✅ Authorized Domains
```
app.owlfenc.com
4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
owl-fenc.firebaseapp.com
owl-fenc.web.app
```

---

## 🧪 URLS DE TESTING

### Desarrollo
- **App:** `https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev`
- **Auth Handler:** `https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler`

### Producción  
- **App:** `https://app.owlfenc.com`
- **Auth Handler:** `https://app.owlfenc.com/__/auth/handler`

### Firebase
- **App:** `https://owl-fenc.firebaseapp.com`
- **App Web:** `https://owl-fenc.web.app`
- **Auth Handler:** `https://owl-fenc.firebaseapp.com/__/auth/handler`
- **Auth Handler Web:** `https://owl-fenc.web.app/__/auth/handler`

---

## ⚠️ NOTAS IMPORTANTES

1. **Propagación:** Los cambios tardan 5-10 minutos en propagarse
2. **Testing:** Siempre probar en ambos ambientes (desarrollo y producción)
3. **Popup vs Redirect:** La implementación usa exclusivamente popup para compatibilidad con navegadores modernos
4. **Firebase Project:** `owl-fenc`
5. **Last Updated:** Agosto 10, 2025

---

## 🔧 COMANDOS DE VERIFICACIÓN

### Verificar dominio actual de Replit:
```bash
echo $REPL_ID
```

### Verificar Firebase config:
```bash
echo $FIREBASE_PROJECT_ID
```

### Verificar URL actual:
```javascript
console.log(window.location.origin);
```