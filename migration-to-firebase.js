#!/usr/bin/env node

/**
 * 🔥 MIGRACIÓN COMPLETA: PostgreSQL → Firebase
 * Migra todos los datos de PostgreSQL a Firebase Firestore
 * Firebase UID: qztot1YEy3UWz605gIH2iwwWhW53
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch, getDoc, getDocs } from 'firebase/firestore';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('🔥 INICIANDO MIGRACIÓN POSTGRESQL → FIREBASE');
console.log('👤 Usuario:', 'truthbackpack@gmail.com');
console.log('🆔 Firebase UID:', 'qztot1YEy3UWz605gIH2iwwWhW53');

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Conectar a PostgreSQL
const sql = neon(process.env.DATABASE_URL);

const USER_FIREBASE_UID = 'qztot1YEy3UWz605gIH2iwwWhW53';
const USER_POSTGRES_ID = 1;

async function migrateUserData() {
  try {
    console.log('\n📊 1. MIGRANDO DATOS DE USUARIO...');
    
    // Obtener datos del usuario de PostgreSQL
    const userResult = await sql`
      SELECT firebase_uid, email, created_at
      FROM users 
      WHERE firebase_uid = ${USER_FIREBASE_UID}
    `;
    
    if (userResult.length === 0) {
      throw new Error('Usuario no encontrado en PostgreSQL');
    }
    
    const userData = userResult[0];
    
    // Migrar a Firebase
    const userDocRef = doc(db, 'users', USER_FIREBASE_UID);
    await setDoc(userDocRef, {
      firebaseUid: userData.firebase_uid,
      email: userData.email,
      createdAt: userData.created_at,
      updatedAt: userData.created_at,
      migratedFrom: 'postgresql',
      migratedAt: new Date().toISOString()
    });
    
    console.log('✅ Usuario migrado a Firebase');
    return userData;
    
  } catch (error) {
    console.error('❌ Error migrando usuario:', error);
    throw error;
  }
}

async function migrateClients() {
  try {
    console.log('\n📋 2. MIGRANDO CLIENTES...');
    
    // Obtener todos los clientes de PostgreSQL
    const clientsResult = await sql`
      SELECT id, client_id, name, email, phone, address, city, state, zip_code, notes, created_at, updated_at
      FROM clients 
      WHERE user_id = ${USER_POSTGRES_ID}
      ORDER BY created_at ASC
    `;
    
    console.log(`📊 Total clientes a migrar: ${clientsResult.length}`);
    
    if (clientsResult.length === 0) {
      console.log('⚠️ No hay clientes para migrar');
      return;
    }
    
    // Migrar en lotes de 500 (límite de Firestore)
    const batchSize = 500;
    let migratedCount = 0;
    
    for (let i = 0; i < clientsResult.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchClients = clientsResult.slice(i, i + batchSize);
      
      console.log(`🔄 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(clientsResult.length/batchSize)} (${batchClients.length} clientes)...`);
      
      for (const client of batchClients) {
        // Usar client_id como documento ID en Firebase
        const clientDocRef = doc(db, 'users', USER_FIREBASE_UID, 'clients', client.client_id);
        
        batch.set(clientDocRef, {
          id: client.id,
          clientId: client.client_id,
          name: client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zipCode: client.zip_code || '',
          notes: client.notes || '',
          createdAt: client.created_at,
          updatedAt: client.updated_at || client.created_at,
          migratedFrom: 'postgresql',
          migratedAt: new Date().toISOString()
        });
      }
      
      await batch.commit();
      migratedCount += batchClients.length;
      console.log(`✅ Lote completado. Progreso: ${migratedCount}/${clientsResult.length}`);
    }
    
    console.log(`🎉 TODOS LOS CLIENTES MIGRADOS: ${migratedCount}`);
    return migratedCount;
    
  } catch (error) {
    console.error('❌ Error migrando clientes:', error);
    throw error;
  }
}

async function migrateSubscriptionData() {
  try {
    console.log('\n💳 3. MIGRANDO DATOS DE SUSCRIPCIÓN...');
    
    // Obtener datos de suscripción de PostgreSQL
    const subscriptionResult = await sql`
      SELECT plan_id, trial_used, trial_end_date, usage_basic_estimates, created_at, updated_at
      FROM user_subscriptions 
      WHERE user_id = ${USER_POSTGRES_ID}
    `;
    
    if (subscriptionResult.length > 0) {
      const subData = subscriptionResult[0];
      
      const subDocRef = doc(db, 'users', USER_FIREBASE_UID, 'subscription', 'current');
      await setDoc(subDocRef, {
        planId: subData.plan_id,
        trialUsed: subData.trial_used || false,
        trialEndDate: subData.trial_end_date,
        usage: {
          basicEstimates: subData.usage_basic_estimates || 0
        },
        createdAt: subData.created_at,
        updatedAt: subData.updated_at || subData.created_at,
        migratedFrom: 'postgresql',
        migratedAt: new Date().toISOString()
      });
      
      console.log('✅ Datos de suscripción migrados');
    } else {
      console.log('⚠️ No hay datos de suscripción para migrar');
    }
    
  } catch (error) {
    console.error('❌ Error migrando suscripción:', error);
    throw error;
  }
}

async function verifyMigration() {
  try {
    console.log('\n🔍 4. VERIFICANDO MIGRACIÓN...');
    
    // Verificar usuario
    const userDoc = await getDoc(doc(db, 'users', USER_FIREBASE_UID));
    if (!userDoc.exists()) {
      throw new Error('Usuario no encontrado en Firebase');
    }
    
    // Contar clientes en Firebase
    const clientsSnapshot = await getDocs(collection(db, 'users', USER_FIREBASE_UID, 'clients'));
    const firebaseClientCount = clientsSnapshot.size;
    
    // Contar clientes en PostgreSQL
    const postgresCount = await sql`SELECT COUNT(*) as count FROM clients WHERE user_id = ${USER_POSTGRES_ID}`;
    const postgresClientCount = parseInt(postgresCount[0].count);
    
    console.log(`📊 Clientes en PostgreSQL: ${postgresClientCount}`);
    console.log(`📊 Clientes en Firebase: ${firebaseClientCount}`);
    
    if (firebaseClientCount === postgresClientCount) {
      console.log('✅ MIGRACIÓN VERIFICADA: Todos los datos coinciden');
      return true;
    } else {
      console.log('❌ MIGRACIÓN INCOMPLETA: Los números no coinciden');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verificando migración:', error);
    return false;
  }
}

// Función principal
async function runMigration() {
  try {
    console.log('🚀 INICIANDO PROCESO DE MIGRACIÓN COMPLETA...\n');
    
    // 1. Migrar datos de usuario
    await migrateUserData();
    
    // 2. Migrar clientes
    const clientCount = await migrateClients();
    
    // 3. Migrar datos de suscripción
    await migrateSubscriptionData();
    
    // 4. Verificar migración
    const isValid = await verifyMigration();
    
    if (isValid) {
      console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
      console.log(`✅ ${clientCount} clientes migrados de PostgreSQL a Firebase`);
      console.log('✅ Usuario y suscripción migrados');
      console.log('🔥 Sistema ahora usa solo Firebase');
    } else {
      console.log('\n⚠️ MIGRACIÓN COMPLETADA CON ADVERTENCIAS');
      console.log('Revisar logs para detalles');
    }
    
  } catch (error) {
    console.error('\n💥 ERROR EN LA MIGRACIÓN:', error);
    process.exit(1);
  }
}

// Ejecutar migración
runMigration();