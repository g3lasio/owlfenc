/**
 * Script para verificar el estado de las API keys críticas
 * Ejecutar con: npx ts-node server/check-api-keys.ts
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

interface APIKeyStatus {
  service: string;
  configured: boolean;
  valid?: boolean;
  error?: string;
  details?: string;
}

async function checkAPIKeys(): Promise<void> {
  console.log('🔍 Verificando API Keys...\n');
  
  const results: APIKeyStatus[] = [];
  
  // 1. Check ANTHROPIC_API_KEY
  console.log('1️⃣ Verificando ANTHROPIC_API_KEY...');
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicKey) {
    results.push({
      service: 'Anthropic (Claude)',
      configured: false,
      error: 'Variable ANTHROPIC_API_KEY no encontrada'
    });
    console.log('   ❌ NO CONFIGURADA\n');
  } else {
    console.log(`   ✅ Configurada (longitud: ${anthropicKey.length})`);
    
    // Test the key
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      
      // Hacer una llamada simple para verificar
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hi'
        }]
      });
      
      results.push({
        service: 'Anthropic (Claude)',
        configured: true,
        valid: true,
        details: `Modelo: ${response.model}, Tokens: ${response.usage.input_tokens + response.usage.output_tokens}`
      });
      console.log('   ✅ VÁLIDA - Conexión exitosa\n');
      
    } catch (error: any) {
      results.push({
        service: 'Anthropic (Claude)',
        configured: true,
        valid: false,
        error: error.message
      });
      console.log(`   ❌ INVÁLIDA - Error: ${error.message}\n`);
    }
  }
  
  // 2. Check OPENAI_API_KEY
  console.log('2️⃣ Verificando OPENAI_API_KEY...');
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    results.push({
      service: 'OpenAI (GPT)',
      configured: false,
      error: 'Variable OPENAI_API_KEY no encontrada'
    });
    console.log('   ❌ NO CONFIGURADA\n');
  } else {
    console.log(`   ✅ Configurada (longitud: ${openaiKey.length})`);
    
    // Test the key
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      });
      
      results.push({
        service: 'OpenAI (GPT)',
        configured: true,
        valid: true,
        details: `Modelo: ${response.model}, Tokens: ${response.usage?.total_tokens}`
      });
      console.log('   ✅ VÁLIDA - Conexión exitosa\n');
      
    } catch (error: any) {
      results.push({
        service: 'OpenAI (GPT)',
        configured: true,
        valid: false,
        error: error.message
      });
      console.log(`   ❌ INVÁLIDA - Error: ${error.message}\n`);
    }
  }
  
  // 3. Check RESEND_API_KEY
  console.log('3️⃣ Verificando RESEND_API_KEY...');
  const resendKey = process.env.RESEND_API_KEY;
  
  if (!resendKey) {
    results.push({
      service: 'Resend (Email)',
      configured: false,
      error: 'Variable RESEND_API_KEY no encontrada'
    });
    console.log('   ❌ NO CONFIGURADA\n');
  } else {
    console.log(`   ✅ Configurada (longitud: ${resendKey.length})\n`);
    results.push({
      service: 'Resend (Email)',
      configured: true,
      details: 'No se puede verificar sin enviar email real'
    });
  }
  
  // 4. Check FIREBASE_ADMIN_CREDENTIALS
  console.log('4️⃣ Verificando FIREBASE_ADMIN_CREDENTIALS...');
  const firebaseKey = process.env.FIREBASE_ADMIN_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!firebaseKey) {
    results.push({
      service: 'Firebase Admin',
      configured: false,
      error: 'Variable FIREBASE_ADMIN_CREDENTIALS no encontrada'
    });
    console.log('   ❌ NO CONFIGURADA\n');
  } else {
    try {
      const credentials = JSON.parse(firebaseKey);
      results.push({
        service: 'Firebase Admin',
        configured: true,
        valid: true,
        details: `Project: ${credentials.project_id}`
      });
      console.log(`   ✅ Configurada - Project: ${credentials.project_id}\n`);
    } catch (error: any) {
      results.push({
        service: 'Firebase Admin',
        configured: true,
        valid: false,
        error: 'JSON inválido'
      });
      console.log('   ❌ JSON INVÁLIDO\n');
    }
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE API KEYS');
  console.log('='.repeat(60) + '\n');
  
  results.forEach(result => {
    const status = result.configured 
      ? (result.valid === false ? '❌ INVÁLIDA' : result.valid === true ? '✅ VÁLIDA' : '⚠️  CONFIGURADA')
      : '❌ NO CONFIGURADA';
    
    console.log(`${result.service.padEnd(25)} ${status}`);
    if (result.error) {
      console.log(`  └─ Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`  └─ ${result.details}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  // Verificar servicios críticos
  const criticalServices = ['Anthropic (Claude)', 'Firebase Admin'];
  const criticalIssues = results.filter(r => 
    criticalServices.includes(r.service) && (!r.configured || r.valid === false)
  );
  
  if (criticalIssues.length > 0) {
    console.log('\n⚠️  ADVERTENCIA: Servicios críticos con problemas:');
    criticalIssues.forEach(issue => {
      console.log(`   - ${issue.service}: ${issue.error || 'No válida'}`);
    });
    console.log('\n🔧 Acción requerida: Configurar las API keys faltantes en Replit Secrets\n');
  } else {
    console.log('\n✅ Todos los servicios críticos están configurados correctamente\n');
  }
}

// Ejecutar verificación
checkAPIKeys().catch(error => {
  console.error('❌ Error ejecutando verificación:', error);
  process.exit(1);
});
