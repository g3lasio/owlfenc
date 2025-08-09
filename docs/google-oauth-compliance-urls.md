# 🔗 URLs PARA GOOGLE OAUTH COMPLIANCE - PRODUCCIÓN

## ✅ URLs DEFINITIVOS PARA GOOGLE CONSOLE (app.owlfenc.com)

### **Application Home Page:**
```
https://app.owlfenc.com/
```

### **Application Privacy Policy Link:**
```
https://app.owlfenc.com/privacy-policy
```

### **Application Terms of Service Link:**
```
https://app.owlfenc.com/terms-of-service
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
  https://app.owlfenc.com/
  ```

- **Application privacy policy link:**
  ```
  https://app.owlfenc.com/privacy-policy
  ```

- **Application terms of service link:**
  ```
  https://app.owlfenc.com/terms-of-service
  ```

### **3. Configurar Authorized Domains**

**En "Authorized domains" agregar:**
```
owlfenc.com
owl-fenc.firebaseapp.com
owl-fenc.web.app
```

### **4. Configurar OAuth Client ID**

**Ve a: APIs & Services > Credentials**

**En "Authorized JavaScript origins":**
```
https://app.owlfenc.com
https://owl-fenc.firebaseapp.com
https://owl-fenc.web.app
```

**En "Authorized redirect URIs":**
```
https://app.owlfenc.com/__/auth/handler
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