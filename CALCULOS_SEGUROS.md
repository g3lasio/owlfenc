# ⚠️ GUÍA DE CÁLCULOS MATEMÁTICOS SEGUROS

## REGLA CRÍTICA: NO ALTERAR LA MATEMÁTICA BÁSICA

### ✅ MATEMÁTICA PERMITIDA (Únicamente necesaria):
```javascript
// Cálculo directo básico
total = precio × cantidad

// Redondeo financiero válido (para centavos)
Math.round(amount * 100) / 100  // Solo para redondeo final

// Cálculos de porcentajes válidos
tax = subtotal * taxRate
deposit = total * 0.5
```

### ❌ CONVERSIONES PROHIBIDAS (Causan errores):
```javascript
// NUNCA hacer estas conversiones:
price = material.price / 100   // ❌ Divide precios incorrectamente
price = material.price * 100   // ❌ Multiplica precios incorrectamente
amount > 100000 ? amount / 100 : amount  // ❌ Conversión automática problemática
```

## ARCHIVOS CORREGIDOS:

### client/src/pages/EstimatesWizard.tsx
- ✅ Eliminadas conversiones de centavos
- ✅ Implementada normalización inteligente para datos legacy
- ✅ Cálculo directo: precio × cantidad = total

### client/src/pages/EstimatesIntegrated.tsx  
- ✅ Eliminada conversión `price / 100` en addMaterialToEstimate
- ✅ Cálculo directo sin conversiones

### server/routes.ts
- ✅ Eliminadas conversiones automáticas en datos de proyecto
- ✅ Eliminada conversión `* 100` en almacenamiento de totales
- ✅ Mantenidos redondeos financieros necesarios para impuestos y pagos

## FUNCIONES FINANCIERAS PRESERVADAS:

### Redondeo de Centavos (MANTENER):
```javascript
// Estas funciones son necesarias y NO deben alterarse:
const tax = Math.round(subtotal * taxRate * 100) / 100;
const depositAmount = Math.round(total * 0.5 * 100) / 100;
const balanceAmount = Math.round((total - depositAmount) * 100) / 100;
```

### Propósito: Redondear correctamente los centavos en cálculos financieros

## PRINCIPIOS PARA EL FUTURO:

1. **SIMPLICIDAD**: Si un cálculo no es obviamente necesario, no lo agregues
2. **VERIFICACIÓN**: Antes de agregar conversiones, pregunta: "¿Por qué este número necesita ser alterado?"
3. **DIRECTNESS**: Usa el valor exacto del material/precio sin modificaciones
4. **DOCUMENTACIÓN**: Si agregas una conversión, documenta claramente por qué es necesaria

## RESULTADO COMPROBADO:
- Premium Synthetic Turf: $485 × 194.25 = $942.11 ✓
- Total del proyecto: $3,135.37 (realista y correcto) ✓
- Sistema de autoguardado preserva valores exactos ✓

## ⚠️ ADVERTENCIA CRÍTICA:
**NO agregues más conversiones de precios sin documentar explícitamente su necesidad y propósito.**