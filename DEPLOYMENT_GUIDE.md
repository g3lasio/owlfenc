# Guía Rápida de Deployment - Owl Fenc Fixes
## 🚀 Implementación de Correcciones

---

## ✅ Checklist Pre-Deployment

Antes de hacer deployment, verificar:

- [ ] Todos los archivos modificados están guardados
- [ ] Los cambios están documentados
- [ ] Se ha hecho backup del código actual

---

## 📝 Paso a Paso

### 1. Commit y Push a GitHub

```bash
cd /home/ubuntu/owlfenc

# Ver archivos modificados
git status

# Agregar todos los cambios
git add .

# Hacer commit
git commit -m "Fix: Corregidos 4 problemas críticos en producción

- PDF generation: usar ruta correcta /api/estimate-puppeteer-pdf
- AI search: mejorado manejo de errores
- Creación contactos: mejorado logging
- Envío email: no bloquear si falla Firebase
- Agregado script diagnóstico de API keys"

# Push a GitHub
git push origin main
```

### 2. Verificar API Keys en Replit

**CRÍTICO:** Ir a Replit → Secrets y verificar:

```
✅ ANTHROPIC_API_KEY=sk-ant-api03-...
✅ OPENAI_API_KEY=sk-...
✅ RESEND_API_KEY=re_...
✅ FIREBASE_ADMIN_CREDENTIALS={"type":"service_account",...}
```

**Si `ANTHROPIC_API_KEY` no está configurada, los botones de AI seguirán fallando.**

### 3. Pull en Replit

En Replit Shell:

```bash
cd /home/ubuntu/owlfenc
git pull origin main
```

### 4. Reinstalar Dependencias (si es necesario)

```bash
npm install
```

### 5. Reiniciar Servidor

En Replit:
1. Hacer clic en "Stop" (botón rojo)
2. Hacer clic en "Run" (botón verde)
3. Esperar a que el servidor inicie completamente

### 6. Verificar API Keys

```bash
cd /home/ubuntu/owlfenc
npx ts-node server/check-api-keys.ts
```

**Resultado esperado:**
```
✅ Anthropic (Claude)     ✅ VÁLIDA
✅ OpenAI (GPT)          ✅ VÁLIDA
✅ Resend (Email)        ✅ CONFIGURADA
✅ Firebase Admin        ✅ VÁLIDA
```

---

## 🧪 Testing Post-Deployment

### Test 1: Crear Nuevo Cliente ✅

1. Ir a https://owlfenc.replit.app/clientes
2. Hacer clic en "Nuevo Cliente"
3. Llenar formulario
4. Hacer clic en "Guardar"

**Resultado esperado:**
- ✅ Cliente se crea correctamente
- ✅ Si hay error, mensaje detallado (no solo "Error 400")

### Test 2: AI Search - Only Materials ✅

1. Ir a Estimates → Nuevo Estimado
2. Paso 3: Agregar materiales con AI
3. Hacer clic en "Only Materials"
4. Ingresar descripción del proyecto
5. Hacer clic en "Search"

**Resultado esperado:**
- ✅ Materiales se generan correctamente
- ✅ Si hay error, mensaje específico:
  - "Error de configuración de API de IA" → Falta API key
  - "La búsqueda tardó demasiado" → Timeout
  - "Se alcanzó el límite" → Rate limit

### Test 3: AI Search - Labor Costs ✅

1. En el mismo paso 3
2. Hacer clic en "Labor Costs"
3. Ingresar descripción
4. Hacer clic en "Search"

**Resultado esperado:**
- ✅ Costos de labor se generan correctamente
- ✅ Si hay error, mensaje específico

### Test 4: AI Search - Full Costs ✅

1. En el mismo paso 3
2. Hacer clic en "Full Costs"
3. Ingresar descripción
4. Hacer clic en "Search"

**Resultado esperado:**
- ✅ Materiales + Labor se generan correctamente
- ✅ Si hay error, mensaje específico

### Test 5: Download PDF ✅

1. Completar estimado hasta paso 4
2. Hacer clic en "Download PDF"

**Resultado esperado:**
- ✅ PDF se descarga correctamente
- ✅ PDF contiene todos los datos del estimado
- ✅ Logo y datos del contractor aparecen

### Test 6: Enviar Email ✅

1. En paso 4, hacer clic en "Send Email"
2. Ingresar email del cliente
3. Agregar mensaje
4. Hacer clic en "Send"

**Resultado esperado:**
- ✅ Email se envía correctamente
- ✅ Si falla guardado en Firebase, se muestra warning pero email se envía
- ✅ Cliente recibe el email

---

## 🔍 Troubleshooting

### Problema: AI Search sigue fallando

**Solución:**

```bash
# Verificar API key
npx ts-node server/check-api-keys.ts

# Si dice "NO CONFIGURADA":
# 1. Ir a Replit → Secrets
# 2. Agregar ANTHROPIC_API_KEY
# 3. Reiniciar servidor

# Si dice "INVÁLIDA":
# 1. Obtener nueva key de https://console.anthropic.com/
# 2. Actualizar en Replit Secrets
# 3. Reiniciar servidor
```

### Problema: PDF no se descarga

**Verificar en logs del servidor:**

```bash
# Buscar en console de Replit:
# "🎯 [ESTIMATE-PDF] Professional PDF generation started"
# "✅ Estimate PDF generated"

# Si aparece error de autenticación:
# - Verificar que el usuario esté logueado
# - Verificar que Firebase esté configurado

# Si aparece error de perfil:
# - Ir a Settings → Profile
# - Completar Company Name y Email
```

### Problema: Email no se envía

**Verificar:**

1. **RESEND_API_KEY configurada:**
   ```bash
   npx ts-node server/check-api-keys.ts
   ```

2. **Email del cliente válido:**
   - Debe ser un email real
   - En modo test de Resend, solo se puede enviar a emails autorizados

3. **Logs del servidor:**
   - Buscar "📧 Enviando estimado"
   - Buscar errores de Resend

### Problema: Error al crear cliente

**Verificar en logs:**

```bash
# Buscar en console:
# "❌ [FIREBASE-CLIENTS] Create error:"

# El error ahora incluye:
# - Código de error
# - Mensaje detallado
# - User ID
# - Timestamp

# Causas comunes:
# - Usuario no autenticado (401)
# - Permisos de Firebase (403)
# - Datos inválidos (400)
```

---

## 📊 Monitoreo Post-Deployment

### Logs a Revisar

En Replit Console, buscar:

**✅ Señales de éxito:**
```
✅ [ESTIMATE-PDF] PDF generated
✅ [MATERIALS-ONLY] Search completed
✅ [FIREBASE-CLIENTS] Client created
📧 Estimado enviado con éxito
```

**❌ Señales de error:**
```
❌ [ESTIMATE-PDF] Error generating PDF
❌ [MATERIALS-ONLY] Error: API key
❌ [FIREBASE-CLIENTS] Create error
❌ Error sending HTML estimate email
```

### Métricas a Monitorear

- **Tasa de éxito de AI search:** Debería aumentar después del fix
- **Tasa de éxito de PDF:** Debería ser 100% si el usuario está autenticado
- **Tasa de éxito de emails:** Depende de configuración de Resend
- **Tasa de éxito de creación de clientes:** Debería ser alta

---

## 🆘 Rollback (Si algo sale mal)

Si después del deployment algo no funciona:

```bash
cd /home/ubuntu/owlfenc

# Ver commits recientes
git log --oneline -5

# Rollback al commit anterior
git revert HEAD

# Push del rollback
git push origin main

# En Replit: Stop → Run
```

---

## 📞 Contacto de Soporte

Si los problemas persisten después de seguir esta guía:

1. **Revisar logs completos** en Replit Console
2. **Ejecutar diagnóstico:**
   ```bash
   npx ts-node server/check-api-keys.ts
   ```
3. **Documentar el error:**
   - Qué funcionalidad falla
   - Mensaje de error exacto
   - Logs del servidor
   - Resultado del diagnóstico de API keys

---

## ✅ Checklist Post-Deployment

Después del deployment, verificar:

- [ ] Servidor reiniciado correctamente
- [ ] API keys verificadas con script de diagnóstico
- [ ] Test 1: Crear cliente ✅
- [ ] Test 2: AI Search - Only Materials ✅
- [ ] Test 3: AI Search - Labor Costs ✅
- [ ] Test 4: AI Search - Full Costs ✅
- [ ] Test 5: Download PDF ✅
- [ ] Test 6: Enviar Email ✅
- [ ] Logs del servidor sin errores críticos
- [ ] Usuarios pueden usar la aplicación normalmente

---

**Última actualización:** 6 de enero de 2026  
**Versión:** 1.0  
**Preparado por:** Manus AI
