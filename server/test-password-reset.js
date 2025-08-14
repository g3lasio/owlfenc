// Script para probar el sistema de reset de contraseña end-to-end
const { randomBytes, createHash } = require('crypto');

// Generar token como lo hace el sistema
function generateResetToken() {
  return randomBytes(32).toString('hex');
}

// Hash del token para comparar con DB
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Crear token de prueba
const testToken = generateResetToken();
const hashedToken = hashToken(testToken);

console.log('🔐 TOKEN GENERADO PARA PRUEBA:');
console.log('Token original:', testToken);
console.log('Token hasheado:', hashedToken);

// Mostrar comando curl para probar
console.log('\n📤 COMANDO PARA PROBAR CONFIRMACIÓN:');
console.log(`curl -X POST http://localhost:5000/api/password-reset/confirm \\
  -H "Content-Type: application/json" \\
  -d '{"token":"${testToken}", "newPassword":"nuevapassword123"}' \\
  -w "\\nStatus: %{http_code}\\n"`);

console.log('\n📝 SQL PARA INSERTAR TOKEN DE PRUEBA:');
console.log(`INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used) VALUES 
('test_token_${Date.now()}', 'qztot1YEy3UWz605gIH2iwwWhW53', '${hashedToken}', '${new Date(Date.now() + 15 * 60 * 1000).toISOString()}', 'false');`);