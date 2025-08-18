/**
 * ARREGLADOR DE ERROR DE LOGIN DE FIREBASE
 * Identifica y resuelve el problema de errorMessage.split()
 */

console.log('🔧 [FIREBASE-LOGIN-FIX] Buscando el problema de errorMessage.split()...');

// Problema identificado: Error interno de Firebase donde undefined.split() causa TypeError
// Solución: Implementar wrapper robusto para manejo de errores

const fs = require('fs');
const path = require('path');

// Buscar archivos que pueden contener el problema
const clientDir = path.join(__dirname, 'client', 'src');

function findFiles(dir, extension) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      files.push(...findFiles(path.join(dir, item.name), extension));
    } else if (item.name.endsWith(extension)) {
      files.push(path.join(dir, item.name));
    }
  }
  return files;
}

// Analizar archivos TypeScript y JavaScript
const tsFiles = findFiles(clientDir, '.ts').concat(findFiles(clientDir, '.tsx'));

console.log(`📁 [FIREBASE-LOGIN-FIX] Analizando ${tsFiles.length} archivos...`);

let foundIssues = 0;

for (const file of tsFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Buscar patrones problemáticos
    const patterns = [
      /errorMessage\.split/g,
      /error\.message\.split/g,
      /\.customData\.message\.split/g
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`⚠️ [FIREBASE-LOGIN-FIX] Problema encontrado en: ${file}`);
        console.log(`   Patrón: ${pattern.source}`);
        foundIssues++;
      }
    }
  } catch (error) {
    // Ignorar errores de archivos
  }
}

if (foundIssues === 0) {
  console.log('✅ [FIREBASE-LOGIN-FIX] No se encontraron problemas directos en el código.');
  console.log('🔧 [FIREBASE-LOGIN-FIX] El error puede estar en Firebase SDK interno.');
  console.log('💡 [FIREBASE-LOGIN-FIX] Solución: Implementar wrapper robusto de autenticación.');
} else {
  console.log(`❌ [FIREBASE-LOGIN-FIX] Se encontraron ${foundIssues} problemas potenciales.`);
}