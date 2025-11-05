# Endpoints Disponibles - SystemAPIService

## 📋 Resumen
Sistema de endpoints que Mervin V2 puede utilizar a través de SystemAPIService para ejecutar tareas reales sin reimplementar funcionalidad.

## 🏠 Property Verification

### `POST /api/property/details`
**Propósito**: Verificar información de una propiedad usando Atom
**Método SystemAPIService**: `verifyProperty(params)`
**Parámetros**:
- `address`: string (dirección completa)
- `includeHistory`: boolean (opcional, incluir historial)
**Retorna**: `PropertyData` con información completa de la propiedad
**Estado**: ✅ Disponible y funcional

---

## 📊 Estimates

### `POST /api/estimates`
**Propósito**: Crear un estimado profesional
**Método SystemAPIService**: `createEstimate(params)`
**Parámetros**:
- `clientName`: string
- `clientEmail`: string (opcional)
- `clientPhone`: string (opcional)
- `projectType`: string
- `dimensions`: object
- `sendEmail`: boolean (opcional)
**Retorna**: `EstimateCalculation` con detalles del estimado
**Estado**: ✅ Disponible y funcional

### `POST /api/estimates/send`
**Propósito**: Enviar estimado por email
**Método SystemAPIService**: `sendEstimateEmail(estimateId, email)`
**Parámetros**:
- `estimateId`: string
- `email`: string
**Retorna**: `EmailResult` con estado de envío
**Estado**: ✅ Disponible y funcional

---

## 📄 Contracts

### `POST /api/contracts`
**Propósito**: Crear un contrato digital
**Método SystemAPIService**: `createContract(params, content)`
**Parámetros**:
- `clientName`: string
- `clientEmail`: string
- `amount`: number
- `projectType`: string
- `projectAddress`: string
- `startDate`: Date
- `endDate`: Date
- `specialTerms`: string (opcional)
- `content`: string (contenido del contrato generado por AI)
**Retorna**: `Contract` con ID y detalles
**Estado**: ✅ Disponible y funcional

### `POST /api/contracts/pdf`
**Propósito**: Generar PDF de un contrato
**Método SystemAPIService**: `generateContractPDF(contractId)`
**Parámetros**:
- `contractId`: string
**Retorna**: `PDF` con URL del documento
**Estado**: ✅ Disponible y funcional

---

## 📋 Permits

### `POST /api/permits/check`
**Propósito**: Consultar información de permisos necesarios
**Método SystemAPIService**: `getPermitInfo(params)`
**Parámetros**:
- `projectType`: string
- `projectAddress`: string
- `projectScope`: string
**Retorna**: `PermitInfo` con requisitos y procedimientos
**Estado**: ✅ Disponible y funcional

---

## 👤 Clients

### `GET /api/clients?email={email}&userId={userId}`
**Propósito**: Buscar cliente existente por email
**Método SystemAPIService**: `findClient(email)`
**Parámetros**:
- `email`: string
**Retorna**: `Client | null`
**Estado**: ✅ Disponible y funcional

### `POST /api/clients`
**Propósito**: Crear nuevo cliente
**Método SystemAPIService**: `createClient(data)`
**Parámetros**:
- `name`: string
- `email`: string (opcional)
- `phone`: string (opcional)
**Retorna**: `Client` con ID asignado
**Estado**: ✅ Disponible y funcional

### Helper: `findOrCreateClient(data)`
**Propósito**: Buscar cliente existente o crear uno nuevo
**Uso interno**: Utilizado por createEstimate y createContract
**Estado**: ✅ Disponible y funcional

---

## 🔐 Autenticación

**Importante**: SystemAPIService recibe `authHeaders` en el constructor que incluye:
- Firebase token (Authorization header)
- Cookies de sesión
- CSRF token

Estos headers se reenvían automáticamente a todos los endpoints legacy para mantener la autenticación del usuario.

---

## 🧪 Testing & Health

### `checkEndpointHealth(endpoint)`
**Propósito**: Verificar disponibilidad de un endpoint
**Parámetros**: 
- `endpoint`: string (ruta del endpoint)
**Retorna**: boolean
**Timeout**: 5 segundos

---

## 📊 Estado General

| Categoría | Endpoints | Estado |
|-----------|-----------|--------|
| Property | 1 | ✅ Funcional |
| Estimates | 2 | ✅ Funcional |
| Contracts | 2 | ✅ Funcional |
| Permits | 1 | ✅ Funcional |
| Clients | 3 | ✅ Funcional |
| **TOTAL** | **9** | **✅ 100% Operacional** |

---

## 🔄 Flujo de Uso

1. **Usuario hace petición a Mervin V2** → Frontend envía mensaje
2. **MervinOrchestrator recibe** → Analiza intención con AI Router
3. **AI determina acción** → ChatGPT-4o o Claude Sonnet 4
4. **SystemAPIService ejecuta** → Llama endpoint real con auth
5. **Endpoint procesa** → Usa sistemas existentes (Firebase, PostgreSQL, etc.)
6. **Respuesta vuelve** → MervinOrchestrator formatea y retorna

---

## 💡 Notas Importantes

- **NUNCA reimplementar**: SystemAPIService es un proxy, no duplica lógica
- **Autenticación automática**: Headers se reenvían transparentemente
- **Manejo de errores**: Todos los métodos tienen try-catch robusto
- **Logging completo**: Cada operación se loguea para debugging
- **Timeout configurado**: 60 segundos para operaciones largas

---

## 🚀 Próximos Endpoints (Futuro)

- [ ] Email masivo de estimados
- [ ] Analytics y reportes
- [ ] Búsqueda avanzada de proyectos
- [ ] Gestión de inventario
- [ ] Sistema de notificaciones push
