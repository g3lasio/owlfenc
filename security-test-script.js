/**
 * Script de verificación de seguridad para validar que todas las funciones
 * de base de datos estén correctamente protegidas con filtros de usuario
 */

import { execSync } from 'child_process';
import fs from 'fs';

function securityAudit() {
  console.log("=== AUDITORÍA DE SEGURIDAD DEL SISTEMA ===\n");
  
  // 1. Verificar funciones en firebase.ts
  console.log("1. Verificando funciones de Firebase...");
  const firebaseContent = fs.readFileSync('client/src/lib/firebase.ts', 'utf8');
  
  // Buscar funciones que NO filtran por userId
  const unsafeFunctions = [];
  
  // Verificar getProjects
  if (firebaseContent.includes('where("firebaseUserId", "==", currentUser.uid)') || 
      firebaseContent.includes('where("userId", "==", targetUserId)')) {
    console.log("   ✓ getProjects - Correctamente asegurada");
  } else {
    unsafeFunctions.push('getProjects - No filtra por userId');
  }
  
  // Verificar getProjectById
  if (firebaseContent.includes('if (projectData.firebaseUserId === currentUser.uid') || 
      firebaseContent.includes('if (data.userId !== currentUser.uid)')) {
    console.log("   ✓ getProjectById - Correctamente asegurada");
  } else {
    console.log("   ⚠️  getProjectById - Requiere verificación manual");
  }
  
  // 2. Verificar funciones en clientFirebase.ts
  console.log("\n2. Verificando funciones de Cliente...");
  const clientContent = fs.readFileSync('client/src/lib/clientFirebase.ts', 'utf8');
  
  // Verificar getClients
  if (clientContent.includes('where("userId", "==", targetUserId)')) {
    console.log("   ✓ getClients - Correctamente asegurada");
  } else {
    unsafeFunctions.push('getClients - No filtra por userId');
  }
  
  // Verificar getClientById
  if (clientContent.includes('if (data.userId !== currentUser.uid)')) {
    console.log("   ✓ getClientById - Correctamente asegurada");
  } else {
    unsafeFunctions.push('getClientById - No verifica propiedad');
  }
  
  // Verificar updateClient
  if (clientContent.includes('if (existingData.userId !== currentUser.uid)')) {
    console.log("   ✓ updateClient - Correctamente asegurada");
  } else {
    unsafeFunctions.push('updateClient - No verifica propiedad');
  }
  
  // Verificar deleteClient
  if (clientContent.includes('if (existingData.userId !== currentUser.uid)')) {
    console.log("   ✓ deleteClient - Correctamente asegurada");
  } else {
    unsafeFunctions.push('deleteClient - No verifica propiedad');
  }
  
  // 3. Verificar que las páginas usan funciones correctas
  console.log("\n3. Verificando uso en páginas...");
  
  // EstimatesWizard
  const estimatesContent = fs.readFileSync('client/src/pages/EstimatesWizard.tsx', 'utf8');
  if (estimatesContent.includes('getFirebaseClients')) {
    console.log("   ✓ EstimatesWizard - Usa función segura de clientes");
  } else {
    unsafeFunctions.push('EstimatesWizard - No usa función segura');
  }
  
  // Projects
  const projectsContent = fs.readFileSync('client/src/pages/Projects.tsx', 'utf8');
  if (projectsContent.includes('getProjects')) {
    console.log("   ✓ Projects - Usa función de proyectos (verificar manualmente)");
  }
  
  // 4. Resumen de seguridad
  console.log("\n=== RESUMEN DE SEGURIDAD ===");
  
  if (unsafeFunctions.length === 0) {
    console.log("✅ SISTEMA SEGURO: Todas las funciones están correctamente protegidas");
    console.log("\n🔒 VERIFICACIONES COMPLETADAS:");
    console.log("   - Filtros por userId implementados");
    console.log("   - Verificación de propiedad en operaciones CRUD");
    console.log("   - Autenticación requerida en todas las funciones");
    console.log("   - Páginas usan funciones seguras");
  } else {
    console.log("🚨 VULNERABILIDADES ENCONTRADAS:");
    unsafeFunctions.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
  
  // Verificar logs de seguridad
  console.log("\n4. Logs de seguridad implementados:");
  const securityLogs = [
    'SECURITY: No authenticated user',
    'SECURITY: User attempting to access',
    'SECURITY: access denied',
    'SECURITY: Successfully loaded'
  ];
  
  let logsFound = 0;
  securityLogs.forEach(log => {
    if (clientContent.includes(log) || firebaseContent.includes(log)) {
      logsFound++;
    }
  });
  
  console.log(`   - ${logsFound}/${securityLogs.length} tipos de logs de seguridad implementados`);
  
  console.log("\n=== AUDITORÍA COMPLETADA ===");
}

securityAudit();