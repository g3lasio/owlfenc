# 🔧 Configuración de URLs Compartidos - Solución de Deployment

## 📋 Problema Identificado

Los URLs compartidos de estimados y contratos (ej: `https://chyrris.com/shared-estimate/...`) no mostraban contenido en producción porque:

1. **El dominio hardcodeado era incorrecto**: El código estaba configurado para usar `chyrris.com` para todos los URLs compartidos en producción
2. **Separación de dominios**: `chyrris.com` probablemente es tu dominio de marketing/landing page, pero el servidor Express/API está corriendo en otro dominio (ej: `app.chyrris.com`)
3. **Falla de API**: Cuando un usuario visitaba el link compartido en `chyrris.com`, la página se cargaba pero los fetch a `/api/estimates/shared/:id` fallaban porque ese dominio no tiene el servidor API

## ✅ Solución Implementada

He modificado el sistema de generación de URLs (`server/utils/url-builder.ts`) para usar una configuración flexible basada en variables de entorno:

### Orden de Prioridad para URLs Compartidos:

1. **`PUBLIC_SHARE_DOMAIN`** (variable de entorno) - Dominio específico para URLs compartidos
2. **`BACKEND_URL`** (variable de entorno) - Extrae el dominio de la URL del backend
3. **Host actual** (fallback seguro) - Usa el dominio donde llegó la petición

## 🚀 Configuración en Producción

### Opción 1: Variable de entorno `PUBLIC_SHARE_DOMAIN` (Recomendada)

Agrega esta variable de entorno en tu deployment de producción:

```bash
PUBLIC_SHARE_DOMAIN=app.chyrris.com
```

O el dominio donde está corriendo tu servidor Express/API.

### Opción 2: Variable de entorno `BACKEND_URL`

Si ya tienes configurada la URL completa del backend:

```bash
BACKEND_URL=https://app.chyrris.com
```

El sistema extraerá automáticamente `app.chyrris.com`.

### Opción 3: Sin configuración (Fallback automático)

Si no configuras ninguna variable, el sistema usará automáticamente el dominio donde llegó la petición. Esto funciona bien si:
- Tu aplicación está en un solo dominio
- No tienes separación entre marketing y aplicación

## 🔍 Verificación

Para verificar que está funcionando correctamente:

1. **Revisa los logs** cuando se genere un URL compartido:
   ```
   🌐 [URL-BUILDER] ESTIMADO - Usando dominio configurado: app.chyrris.com
   📍 [URL-BUILDER] Fuente: PUBLIC_SHARE_DOMAIN
   ```

2. **Prueba un link compartido** en producción:
   - Genera un estimado y comparte el link
   - Verifica que el URL use el dominio correcto (ej: `https://app.chyrris.com/shared-estimate/...`)
   - Abre el link en una ventana de incógnito para confirmar que carga correctamente

3. **Verifica en consola del navegador** que no haya errores de red al cargar `/api/estimates/shared/:id`

## 📝 URLs Afectados

Esta configuración aplica para:

- ✅ URLs de estimados compartidos: `/shared-estimate/:shareId`
- ✅ URLs de contratos para firma: `/sign/:contractId/:party`
- ✅ Otros URLs públicos que necesitan acceso al API

## 🎯 Ejemplo de Configuración Completa

Si tu setup es:
- **Dominio de marketing**: `chyrris.com` (sitio estático, sin API)
- **Dominio de aplicación**: `app.chyrris.com` (servidor Express con API)

Configuración recomendada en producción:
```bash
PUBLIC_SHARE_DOMAIN=app.chyrris.com
```

## 🔐 Seguridad

El sistema siempre usa HTTPS en producción automáticamente, no necesitas configurarlo.

## 🐛 Debugging

Si los links compartidos aún no funcionan:

1. **Verifica los logs del servidor** al generar un URL compartido
2. **Confirma que el dominio configurado** tiene el servidor Express corriendo
3. **Prueba acceder directamente** a `https://[tu-dominio]/api/health` para confirmar que el API responde
4. **Revisa la consola del navegador** para errores de CORS o red

## 📞 Soporte

Si necesitas ayuda adicional, revisa:
- Logs del servidor al generar URLs compartidos
- Configuración de DNS/routing de tu dominio
- Configuración de tu hosting/deployment platform
