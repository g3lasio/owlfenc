# Guía de Generación de PDFs - Owl Fenc App

## 📋 Tabla de Contenidos

1. [Regla de Oro](#regla-de-oro)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Proceso Correcto](#proceso-correcto)
4. [Campos Requeridos vs Opcionales](#campos-requeridos-vs-opcionales)
5. [Marca de Agua Permitida](#marca-de-agua-permitida)
6. [Ejemplos de Código](#ejemplos-de-código)
7. [Manejo de Errores](#manejo-de-errores)
8. [Testing Checklist](#testing-checklist)

---

## Regla de Oro

**NUNCA usar datos hardcodeados o fallbacks genéricos en templates de PDF.**

❌ **INCORRECTO:**
```typescript
const companyName = data.contractor?.companyName || 'Your Company';
const phone = data.contractor?.phone || '(555) 123-4567';
const logo = data.contractor?.logo || '/owl-logo.png';
```

✅ **CORRECTO:**
```typescript
// Validar perfil ANTES de generar documento
const profileValidation = await ContractorDataService.validateProfile(firebaseUid);
if (!profileValidation.valid) {
  return res.status(400).json({
    error: 'INCOMPLETE_PROFILE',
    message: 'Please complete your company profile',
    missingFields: profileValidation.missingFields
  });
}

const contractorData = profileValidation.profile!;
const companyName = contractorData.companyName; // Siempre existe después de validación
const phone = contractorData.phone; // Siempre existe después de validación
const logo = contractorData.logo || ''; // Opcional, vacío si no existe
```

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario Autenticado                       │
│                    (Firebase UID)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CompanyProfileService (Firebase)                │
│  - Almacena información del contratista                      │
│  - Campos: companyName, address, phone, email, etc.          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ContractorDataService (Nuevo)                   │
│  - Obtiene datos del perfil                                  │
│  - Valida campos requeridos                                  │
│  - Convierte a formatos legacy si es necesario               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Rutas de Generación de PDF                         │
│  - /api/estimates/calculate                                  │
│  - /api/contracts/generate-hybrid                            │
│  - /api/invoices/generate                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Servicios de Generación                         │
│  - estimatorService                                          │
│  - hybridContractGenerator                                   │
│  - invoiceService                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Templates HTML/CSS                         │
│  - invoiceTemplate.ts                                        │
│  - universal-estimate-template.html                          │
│  - change-order.ts, lien-waiver.ts, etc.                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Proceso Correcto

### 1. En las Rutas (Backend)

```typescript
import { ContractorDataService } from '../services/contractorDataService';

router.post('/api/estimates/calculate', verifyFirebaseAuth, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    
    // PASO 1: Validar perfil
    const profileValidation = await ContractorDataService.validateProfile(firebaseUid);
    if (!profileValidation.valid) {
      return res.status(400).json({
        error: 'INCOMPLETE_PROFILE',
        message: 'Please complete your company profile before generating estimates',
        missingFields: profileValidation.missingFields,
        redirectTo: '/profile-setup'
      });
    }
    
    // PASO 2: Obtener datos validados
    const contractorData = profileValidation.profile!;
    
    // PASO 3: Pasar datos reales al servicio
    const estimateInput = {
      ...req.body,
      contractorName: contractorData.ownerName || contractorData.companyName,
      contractorCompany: contractorData.companyName,
      contractorAddress: contractorData.address,
      contractorPhone: contractorData.phone,
      contractorEmail: contractorData.email,
      contractorLicense: contractorData.license || "",
      contractorLogo: contractorData.logo || "",
    };
    
    // PASO 4: Generar documento
    const result = await estimatorService.generateEstimate(estimateInput);
    
    res.json(result);
  } catch (error) {
    // Manejo de errores...
  }
});
```

### 2. En los Servicios

```typescript
// ❌ ANTES (con fallbacks genéricos)
const companyName = data.contractor?.companyName || 'Your Company';

// ✅ DESPUÉS (sin fallbacks, datos ya validados)
const companyName = data.contractor.companyName; // Garantizado por validación previa
```

### 3. En el Frontend

```typescript
import { validateProfileBeforeGeneration } from '@/utils/profileValidation';

async function handleGenerateEstimate() {
  // Validar perfil antes de hacer la petición
  const isValid = await validateProfileBeforeGeneration((result) => {
    // Mostrar notificación al usuario
    toast.error(
      `Please complete your profile before generating estimates. Missing: ${result.missingFields.join(', ')}`,
      {
        action: {
          label: 'Go to Profile',
          onClick: () => navigate('/profile-setup')
        }
      }
    );
  });
  
  if (!isValid) {
    return;
  }
  
  // Proceder con la generación
  const response = await fetch('/api/estimates/calculate', {
    method: 'POST',
    body: JSON.stringify(estimateData)
  });
  
  // Manejar respuesta...
}
```

---

## Campos Requeridos vs Opcionales

### Campos REQUERIDOS (deben existir siempre)

| Campo | Descripción | Validación |
|-------|-------------|------------|
| `companyName` | Nombre de la compañía | Validado en ContractorDataService |
| `address` | Dirección completa | Validado en ContractorDataService |
| `phone` | Teléfono de contacto | Validado en ContractorDataService |
| `email` | Email de contacto | Validado en ContractorDataService |

### Campos OPCIONALES (mostrar solo si existen)

| Campo | Descripción | Manejo en Template |
|-------|-------------|-------------------|
| `ownerName` | Nombre del dueño | `${data.ownerName || ''}` |
| `license` | Número de licencia | `${data.license ? \`License: ${data.license}\` : ''}` |
| `logo` | Logo de la compañía | `${data.logo ? \`<img src="${data.logo}">\` : ''}` |
| `website` | Sitio web | `${data.website ? \`Website: ${data.website}\` : ''}` |

### Ejemplo de Manejo en Templates

```typescript
// ✅ CORRECTO: Mostrar solo si existe
${data.contractorLicense ? `
  <div class="license-info">
    <strong>License:</strong> ${data.contractorLicense}
  </div>
` : ''}

${data.contractorWebsite ? `
  <div class="website-info">
    <strong>Website:</strong> ${data.contractorWebsite}
  </div>
` : ''}

${data.contractorLogo ? `
  <img src="${data.contractorLogo}" alt="Company Logo" class="logo">
` : ''}

// ❌ INCORRECTO: Mostrar con fallback genérico
<p>License: ${data.contractorLicense || 'N/A'}</p>
<p>Website: ${data.contractorWebsite || 'Not provided'}</p>
```

---

## Marca de Agua Permitida

### ✅ Permitido: "Powered by Chyrris Technologies"

```html
<!-- Footer discreto en contratos e invoices -->
<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
    <p style="font-size: 9px; color: #999;">Powered by Chyrris Technologies</p>
</div>
```

### ❌ NO Permitido: Branding de Owl Fenc

```html
<!-- ❌ NO USAR -->
<p>Powered by Owl Fenc Platform</p>
<img src="/owl-logo.png" alt="Owl Fenc">
<p>Generated by Owl Fenc App</p>
```

### Ubicación por Tipo de Documento

| Tipo de Documento | Marca de Agua | Ubicación |
|-------------------|---------------|-----------|
| **Estimates** | Sin marca de agua | N/A |
| **Invoices** | ✅ "Powered by Chyrris Technologies" | Footer discreto |
| **Contracts** | ✅ "Powered by Chyrris Technologies" | Footer discreto |
| **Permit Reports** | Sin marca de agua | N/A |

---

## Ejemplos de Código

### Ejemplo 1: Integrar ContractorDataService en una Ruta Nueva

```typescript
import express from 'express';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { ContractorDataService } from '../services/contractorDataService';

const router = express.Router();

router.post('/api/new-document/generate', verifyFirebaseAuth, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    
    // 1. Validar perfil
    const profileValidation = await ContractorDataService.validateProfile(firebaseUid);
    if (!profileValidation.valid) {
      return res.status(400).json({
        error: 'INCOMPLETE_PROFILE',
        message: 'Please complete your company profile',
        missingFields: profileValidation.missingFields,
        redirectTo: '/profile-setup'
      });
    }
    
    // 2. Obtener datos validados
    const contractorData = profileValidation.profile!;
    
    // 3. Usar datos en el documento
    const documentData = {
      contractor: {
        name: contractorData.companyName,
        address: contractorData.address,
        phone: contractorData.phone,
        email: contractorData.email,
        license: contractorData.license || '',
        logo: contractorData.logo || '',
      },
      client: req.body.clientInfo,
      project: req.body.projectInfo,
    };
    
    // 4. Generar documento
    const result = await generateDocument(documentData);
    
    res.json({ success: true, document: result });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Ejemplo 2: Validación en Frontend con React

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateProfileBeforeGeneration } from '@/utils/profileValidation';
import { toast } from 'sonner';

function DocumentGeneratorPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  async function handleGenerate() {
    setLoading(true);
    
    // Validar perfil primero
    const isValid = await validateProfileBeforeGeneration((result) => {
      toast.error(
        `Please complete your profile: ${result.missingFields.join(', ')}`,
        {
          action: {
            label: 'Complete Profile',
            onClick: () => navigate('/profile-setup')
          }
        }
      );
    });
    
    if (!isValid) {
      setLoading(false);
      return;
    }
    
    try {
      // Generar documento
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        if (error.error === 'INCOMPLETE_PROFILE') {
          toast.error(error.message, {
            action: {
              label: 'Complete Profile',
              onClick: () => navigate('/profile-setup')
            }
          });
          return;
        }
        
        throw new Error(error.message);
      }
      
      const result = await response.json();
      toast.success('Document generated successfully!');
      
    } catch (error) {
      toast.error('Failed to generate document');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <button onClick={handleGenerate} disabled={loading}>
      {loading ? 'Generating...' : 'Generate Document'}
    </button>
  );
}
```

---

## Manejo de Errores

### Errores Comunes y Soluciones

#### 1. Error: PROFILE_NOT_FOUND

```json
{
  "error": "INCOMPLETE_PROFILE",
  "message": "Please complete your company profile before generating documents",
  "missingFields": ["all"],
  "redirectTo": "/profile-setup"
}
```

**Solución:** Redirigir al usuario a la página de configuración de perfil.

#### 2. Error: INCOMPLETE_PROFILE

```json
{
  "error": "INCOMPLETE_PROFILE",
  "message": "Please complete your company profile",
  "missingFields": ["companyName", "phone"],
  "redirectTo": "/profile-setup"
}
```

**Solución:** Mostrar notificación con campos faltantes y redirigir a perfil.

#### 3. Error: CONTRACTOR_NAME_REQUIRED

```json
{
  "error": "CONTRACTOR_NAME_REQUIRED",
  "message": "Contractor name is required for contract generation"
}
```

**Solución:** Este error indica un problema en la validación previa. Verificar que se esté llamando a `validateProfile` antes de generar el documento.

---

## Testing Checklist

### Antes de Hacer Commit

- [ ] **Test 1:** Generar estimate con perfil completo
  - ✅ Debe usar datos del perfil
  - ✅ No debe mostrar datos genéricos

- [ ] **Test 2:** Intentar generar estimate sin perfil
  - ❌ Debe retornar error INCOMPLETE_PROFILE
  - ❌ Debe indicar campos faltantes

- [ ] **Test 3:** Generar estimate con perfil incompleto (falta phone)
  - ❌ Debe retornar error con campo específico faltante

- [ ] **Test 4:** Generar invoice con perfil completo
  - ✅ Debe usar datos del perfil
  - ✅ Footer debe mostrar "Powered by Chyrris Technologies"

- [ ] **Test 5:** Generar contrato con perfil completo
  - ✅ Debe usar datos del perfil
  - ✅ Footer debe mostrar "Powered by Chyrris Technologies"

- [ ] **Test 6:** Verificar que NO aparezca "Owl Fenc" en ningún documento
  - ✅ Buscar en todos los PDFs generados

- [ ] **Test 7:** Verificar que logo de Owl Fenc NO aparezca como fallback
  - ✅ Generar documento sin logo en perfil
  - ✅ Verificar que no aparezca `/owl-logo.png`

- [ ] **Test 8:** Verificar campos opcionales
  - ✅ License: solo aparece si existe en perfil
  - ✅ Website: solo aparece si existe en perfil
  - ✅ Logo: solo aparece si existe en perfil

### Comandos de Testing

```bash
# Verificar que no haya datos hardcodeados
grep -r "Your Company\|555-1234\|owl-logo" server/services/ server/templates/

# Verificar marca de agua correcta
grep -r "Powered by" server/templates/ | grep -v "Chyrris Technologies"

# Verificar imports de ContractorDataService
grep -r "ContractorDataService" server/routes/
```

---

## Recursos Adicionales

- **CompanyProfileService:** `server/services/CompanyProfileService.ts`
- **ContractorDataService:** `server/services/contractorDataService.ts`
- **Profile Validation Utility:** `client/src/utils/profileValidation.ts`
- **Migration Script:** `server/scripts/migrate-user-data-to-profiles.ts`

---

## Preguntas Frecuentes

### ¿Qué hago si necesito agregar un nuevo campo al perfil?

1. Agregar el campo a `CompanyProfile` en `CompanyProfileService.ts`
2. Agregar el campo a `ContractorData` en `contractorDataService.ts`
3. Actualizar el método `getContractorData` para incluir el nuevo campo
4. Si es requerido, agregarlo a la validación en `validateProfile`

### ¿Cómo manejo documentos que no requieren perfil completo?

Si un documento solo necesita algunos campos (ej: solo email), puedes crear una validación específica:

```typescript
const profileValidation = await ContractorDataService.validateProfile(firebaseUid);
if (!profileValidation.profile?.email) {
  return res.status(400).json({
    error: 'EMAIL_REQUIRED',
    message: 'Email is required for this document'
  });
}
```

### ¿Puedo usar datos del cliente sin validación?

Sí, los datos del cliente vienen del formulario y no necesitan validación de perfil. Solo los datos del contratista deben obtenerse del perfil.

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0  
**Mantenedor:** Owl Fenc Development Team
