# 🔗 URLs PARA GOOGLE OAUTH COMPLIANCE

## ✅ URLs REQUERIDOS POR GOOGLE CONSOLE

### **Application Home Page:**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/
```

### **Application Privacy Policy Link:**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/privacy-policy
```

### **Application Terms of Service Link:**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/terms-of-service
```

---

## 📋 PASOS PARA GOOGLE CLOUD CONSOLE

### **1. Acceder a Google Cloud Console**
- Ve a: [console.cloud.google.com](https://console.cloud.google.com/)
- Proyecto: **owl-fenc**
- Navega a: **APIs & Services** > **OAuth consent screen**

### **2. Configurar OAuth Consent Screen**

**En la sección "App information":**

- **Application home page:** 
  ```
  https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/
  ```

- **Application privacy policy link:**
  ```
  https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/privacy-policy
  ```

- **Application terms of service link:**
  ```
  https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/terms-of-service
  ```

### **3. Configurar Authorized Domains**

**En "Authorized domains" agregar:**
```
4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
owl-fenc.firebaseapp.com
owl-fenc.web.app
```

### **4. Configurar OAuth Client ID**

**Ve a: APIs & Services > Credentials**

**En "Authorized JavaScript origins":**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev
https://owl-fenc.firebaseapp.com
https://owl-fenc.web.app
```

**En "Authorized redirect URIs":**
```
https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev/__/auth/handler
https://owl-fenc.firebaseapp.com/__/auth/handler
https://owl-fenc.web.app/__/auth/handler
```

---

## ✅ **PÁGINAS CREADAS Y FUNCIONANDO:**

- ✅ **Home Page** - Disponible en `/`
- ✅ **Privacy Policy** - Disponible en `/privacy-policy`
- ✅ **Terms of Service** - Disponible en `/terms-of-service`

Todas las páginas están configuradas como **rutas públicas** (no requieren autenticación) y mantienen el diseño **cyberpunk** consistente con la aplicación.

---

## 🎯 **SIGUIENTE PASO:**

1. **Copia estos URLs exactos** en Google Cloud Console
2. **Guarda la configuración**
3. **Espera 5-10 minutos** para propagación
4. **Prueba Google OAuth** - debería funcionar sin errores

Los URLs están **100% funcionales** y listos para usar en Google Console.