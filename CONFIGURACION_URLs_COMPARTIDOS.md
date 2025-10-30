# 🦉 Configuración de URLs Compartidos - Owl Fence Platform

## 📋 Problema Identificado y Solucionado

Los URLs compartidos de estimados y contratos no mostraban contenido en producción porque el dominio estaba hardcodeado incorrectamente.

**Solución implementada:**
- ✅ El sistema ahora usa `app.owlfenc.com` como dominio por defecto en producción
- ✅ URLs compartidos funcionan correctamente en el dominio verificado
- ✅ Separación clara: `owlfenc.com` (marketing) vs `app.owlfenc.com` (aplicación)

## ✅ Solución Implementada

He modificado el sistema de generación de URLs (`server/utils/url-builder.ts`) para usar una configuración flexible basada en variables de entorno:

### Orden de Prioridad para URLs Compartidos:

1. **`PUBLIC_SHARE_DOMAIN`** (variable de entorno) - Dominio específico para URLs compartidos
2. **`BACKEND_URL`** (variable de entorno) - Extrae el dominio de la URL del backend
3. **Host actual** (fallback seguro) - Usa el dominio donde llegó la petición

## 🚀 Configuración Actual de Producción

### ✅ Configuración Automática (Ya Implementada)

El sistema está configurado para usar automáticamente `app.owlfenc.com` en producción:

**Sin necesidad de variables de entorno adicionales**, el sistema detecta automáticamente:
- 🔧 **Desarrollo**: Usa el host local (localhost o replit.dev)
- 🦉 **Producción**: Usa `app.owlfenc.com` como dominio por defecto

### 🔧 Configuración Opcional Avanzada

Si necesitas override manual, puedes usar variables de entorno:

```bash
# Opción 1: Dominio específico para URLs compartidos
PUBLIC_SHARE_DOMAIN=app.owlfenc.com

# Opción 2: URL completa del backend (extraerá el dominio)
BACKEND_URL=https://app.owlfenc.com
```

Pero **no es necesario** - el sistema ya tiene el default correcto.

## 🔍 Verificación

Para verificar que está funcionando correctamente:

1. **Revisa los logs** cuando se genere un URL compartido:
   ```
   🦉 [URL-BUILDER] ESTIMADO - Producción detectada, usando dominio Owl Fence: app.owlfenc.com
   ```

2. **Prueba un link compartido** en producción:
   - Genera un estimado y comparte el link
   - Verifica que el URL use: `https://app.owlfenc.com/shared-estimate/...`
   - Abre el link en una ventana de incógnito para confirmar que carga correctamente

3. **Verifica en consola del navegador** que no haya errores de red al cargar `/api/estimates/shared/:id`

## 📝 URLs Afectados

Esta configuración aplica para:

- ✅ URLs de estimados compartidos: `/shared-estimate/:shareId`
- ✅ URLs de contratos para firma: `/sign/:contractId/:party`
- ✅ Otros URLs públicos que necesitan acceso al API

## 🦉 Arquitectura Owl Fence

Setup actual de dominios:
- **Dominio de marketing**: `owlfenc.com` (sitio de marketing)
- **Dominio de aplicación**: `app.owlfenc.com` (servidor Express con API)

**URLs generados automáticamente:**
- Estimados compartidos: `https://app.owlfenc.com/shared-estimate/:id`
- Contratos para firma: `https://app.owlfenc.com/sign/:id/:party`
- Todo sobre el dominio verificado de Owl Fence ✅

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
