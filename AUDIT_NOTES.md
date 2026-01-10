# 🔍 AUDITORÍA DEL SISTEMA DE PERFIL - OWL FENC APP

**Fecha**: Enero 10, 2026
**Estado**: CORREGIDO ✅

---

## PROBLEMAS ENCONTRADOS Y CORREGIDOS

### ✅ PROBLEMA #1: Frontend no enviaba `x-firebase-uid` header

**Ubicación**: `SimpleContractGenerator.tsx` líneas 6567, 6663, 6748

**Antes**:
```typescript
...(token ? { 'Authorization': `Bearer ${token}` } : {}),
```

**Después**:
```typescript
...(token ? { 'Authorization': `Bearer ${token}` } : { 'x-firebase-uid': currentUser?.uid || '' }),
```

---

### ✅ PROBLEMA #2: Backend leía de PostgreSQL en lugar de Firebase

**Archivos corregidos**:
- `contractorDataHelpers.ts` - Ahora usa `CompanyProfileService` (Firebase)
- `routes.ts` endpoint `/api/estimate-pdf` - Ahora usa Firebase
- `routes.ts` endpoint `/api/invoice-pdf` - Ahora usa Firebase

---

### ✅ PROBLEMA #3: Código muerto eliminado

**Archivo eliminado**: `UnifiedProfileService.ts` (no se usaba en ningún lugar)

---

### ✅ PROBLEMA #4: Campo `state` faltaba en branding

**Archivo**: `routes.ts` endpoint `/api/generate-pdf`

**Antes**: branding no incluía `state`
**Después**: branding incluye `state` y `logo`

---

## ARQUITECTURA ACTUAL (SINGLE SOURCE OF TRUTH)

```
🔥 FIREBASE FIRESTORE (userProfiles collection)
          │
          ├─── Frontend (use-profile.ts)
          │         └─── getUserProfile() / saveUserProfile()
          │
          ├─── Backend Services
          │         ├─── CompanyProfileService.ts (PRINCIPAL)
          │         ├─── contractorDataService.ts (usa CompanyProfileService)
          │         └─── contractorDataHelpers.ts (usa CompanyProfileService)
          │
          └─── PDF Generation
                    ├─── /api/generate-pdf
                    ├─── /api/estimate-pdf
                    ├─── /api/invoice-pdf
                    └─── /api/legal-defense/templates/*/generate-document
```

---

## CAMPOS CRÍTICOS DEL PERFIL

| Campo | Firebase Key | Uso |
|-------|-------------|-----|
| Nombre de compañía | `companyName` | Todos los documentos |
| Licencia | `license` | Contratos, Certificados |
| Estado | `state` | Certificados, Compliance |
| Dirección | `address` | Todos los documentos |
| Teléfono | `phone` | Todos los documentos |
| Email | `email` | Todos los documentos |
| Logo | `logo` | Branding en PDFs |
| Website | `website` | Opcional en PDFs |

---

## NOTAS PARA DESARROLLADORES

1. **NUNCA leer datos de perfil de PostgreSQL** - Solo usar Firebase
2. **SIEMPRE enviar `x-firebase-uid` header** en requests al backend
3. **El campo `company` del frontend se mapea a `companyName` en Firebase**
4. **El autoguardado tiene debounce de 1.5 segundos**

