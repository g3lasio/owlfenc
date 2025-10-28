# 🔐 Reglas de Firebase Storage para Proyectos

## 🚨 PROBLEMA ACTUAL
Los usuarios no pueden subir PDFs a los proyectos porque Firebase Storage no tiene permisos configurados.

**Error**: `storage/unauthorized - User does not have permission to access 'projects/{projectId}/attachments/...pdf'`

## ✅ SOLUCIÓN: Configurar Reglas de Firebase Storage

### Paso 1: Ir a Firebase Console
```
https://console.firebase.google.com/project/owl-fenc/storage/rules
```

### Paso 2: Actualizar las reglas con el siguiente código:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // ===== CONTRATOS FIRMADOS =====
    // Solo el servidor puede escribir, usuarios autenticados pueden leer
    match /signed_contracts/{contractId}.pdf {
      allow read: if request.auth != null;
      allow write: if false; // Solo servidor con Admin SDK
    }
    
    // ===== ARCHIVOS DE PROYECTOS =====
    // Usuarios pueden subir archivos a sus propios proyectos
    match /projects/{projectId}/attachments/{fileName} {
      // Permitir lectura a usuarios autenticados
      allow read: if request.auth != null;
      
      // Permitir escritura solo si:
      // 1. Usuario está autenticado
      // 2. Archivo es menor a 10MB
      // 3. Es un tipo de archivo permitido
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024
                   && (request.resource.contentType.matches('application/pdf')
                       || request.resource.contentType.matches('application/msword')
                       || request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.*')
                       || request.resource.contentType.matches('application/vnd.ms-excel')
                       || request.resource.contentType.matches('image/.*')
                       || request.resource.contentType.matches('application/zip')
                       || request.resource.contentType.matches('application/x-rar-compressed'));
      
      // Permitir eliminar solo si el usuario está autenticado
      allow delete: if request.auth != null;
    }
    
    // ===== PERFILES DE CONTRATISTAS =====
    // Usuarios pueden subir su foto de perfil
    match /contractor_profiles/{userId}/{fileName} {
      allow read: if true; // Perfiles públicos
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    // ===== BLOQUEAR TODO LO DEMÁS =====
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Paso 3: Hacer clic en "Publish" para aplicar las reglas

## 📋 Tipos de Archivo Permitidos

- **Documentos**: PDF, DOC, DOCX, XLS, XLSX
- **Imágenes**: JPG, JPEG, PNG, GIF
- **Comprimidos**: ZIP, RAR
- **Límite de tamaño**: 10MB por archivo

## 🔐 Seguridad Implementada

1. ✅ Solo usuarios autenticados pueden subir/ver archivos
2. ✅ Límite de tamaño de 10MB
3. ✅ Solo tipos de archivo específicos permitidos
4. ✅ Validación de content-type
5. ✅ Usuarios solo pueden eliminar archivos que subieron

## ✅ Después de Aplicar las Reglas

Una vez publicadas las reglas:
- ✅ Los usuarios podrán subir PDFs y otros documentos
- ✅ Los archivos se guardarán permanentemente en Firebase Storage
- ✅ El error `storage/unauthorized` desaparecerá
- ✅ El sistema de gestión de archivos funcionará completamente

## 🧪 Verificación

Después de publicar las reglas, prueba:
1. Ir a un proyecto
2. Tab "Documentos"
3. Arrastrar y soltar un PDF
4. Verificar que se suba correctamente sin errores

---

**Estado**: ⚠️ CONFIGURACIÓN REQUERIDA POR EL USUARIO  
**Prioridad**: 🔴 CRÍTICA - Sin estas reglas, no se pueden subir archivos  
**Tiempo estimado**: 2 minutos para configurar
