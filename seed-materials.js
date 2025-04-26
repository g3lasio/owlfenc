// Script para poblar la tabla de materiales
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';

// Configurar WebSocket
neonConfig.webSocketConstructor = ws;

dotenv.config();

// Materiales a insertar
const materials = [
  // Madera - Postes
  { category: 'wood', name: '4x4x8', description: 'Poste de presión tratada 4x4 de 8 pies', unit: 'pieza', price: 1495, supplier: 'Home Depot', sku: 'PT-4X4-8' },
  { category: 'wood', name: '4x4x10', description: 'Poste de presión tratada 4x4 de 10 pies', unit: 'pieza', price: 2349, supplier: 'Home Depot', sku: 'PT-4X4-10' },
  { category: 'wood', name: '6x6x8', description: 'Poste de presión tratada 6x6 de 8 pies', unit: 'pieza', price: 2999, supplier: 'Home Depot', sku: 'PT-6X6-8' },
  { category: 'wood', name: '6x6x10', description: 'Poste de presión tratada 6x6 de 10 pies', unit: 'pieza', price: 3895, supplier: 'Home Depot', sku: 'PT-6X6-10' },
  
  // Madera - Rieles
  { category: 'wood', name: '2x4x8', description: 'Riel de presión tratada 2x4 de 8 pies', unit: 'pieza', price: 888, supplier: 'Home Depot', sku: 'PT-2X4-8' },
  { category: 'wood', name: '2x4x10', description: 'Riel de presión tratada 2x4 de 10 pies', unit: 'pieza', price: 1149, supplier: 'Home Depot', sku: 'PT-2X4-10' },
  { category: 'wood', name: '2x4x12', description: 'Riel de presión tratada 2x4 de 12 pies', unit: 'pieza', price: 1399, supplier: 'Home Depot', sku: 'PT-2X4-12' },
  
  // Madera - Tablas
  { category: 'wood', name: 'picket', description: 'Tabla de cedro para cerca 1x6x6', unit: 'pieza', price: 758, supplier: 'Home Depot', sku: 'CED-1X6-6' },
  { category: 'wood', name: 'picket-alt', description: 'Tabla de pino tratado para cerca 1x6x6', unit: 'pieza', price: 645, supplier: 'Lowe\'s', sku: 'PINE-1X6-6' },
  { category: 'wood', name: 'lattice', description: 'Enrejado de presión tratada 4x8', unit: 'panel', price: 4299, supplier: 'Home Depot', sku: 'LATT-4X8' },
  
  // Concreto
  { category: 'concrete', name: '60lb', description: 'Concreto de secado rápido 60 lb', unit: 'bolsa', price: 789, supplier: 'Home Depot', sku: 'CONC-60' },
  { category: 'concrete', name: '80lb', description: 'Concreto de secado rápido 80 lb', unit: 'bolsa', price: 962, supplier: 'Home Depot', sku: 'CONC-80' },
  
  // Hardware
  { category: 'hardware', name: 'hanger', description: 'Soporte para viga 2x4', unit: 'pieza', price: 312, supplier: 'Home Depot', sku: 'HW-HANG-1' },
  { category: 'hardware', name: 'screws', description: 'Tornillos para madera exterior 3.5" (1 lb)', unit: 'caja', price: 1600, supplier: 'Home Depot', sku: 'HW-SCRW-1' },
  { category: 'hardware', name: 'hinges', description: 'Bisagra T para puerta', unit: 'par', price: 895, supplier: 'Home Depot', sku: 'HW-HINGE-1' },
  { category: 'hardware', name: 'latch', description: 'Seguro para puerta', unit: 'pieza', price: 1245, supplier: 'Home Depot', sku: 'HW-LATCH-1' },
  
  // Vinyl Fence
  { category: 'vinyl', name: 'vinyl-post', description: 'Poste de vinilo 4x4x84"', unit: 'pieza', price: 3995, supplier: 'Lowe\'s', sku: 'VNL-POST-1' },
  { category: 'vinyl', name: 'vinyl-rail', description: 'Riel de vinilo 2x6x72"', unit: 'pieza', price: 2495, supplier: 'Lowe\'s', sku: 'VNL-RAIL-1' },
  { category: 'vinyl', name: 'vinyl-panel', description: 'Panel de vinilo 6x8', unit: 'panel', price: 13999, supplier: 'Lowe\'s', sku: 'VNL-PNL-1' },
  
  // Chain Link
  { category: 'chain-link', name: 'cl-post', description: 'Poste terminal galvanizado 2-3/8" x 8\'', unit: 'pieza', price: 2795, supplier: 'Home Depot', sku: 'CL-POST-1' },
  { category: 'chain-link', name: 'cl-fabric', description: 'Malla ciclónica 11.5ga 4\'x50\'', unit: 'rollo', price: 13999, supplier: 'Home Depot', sku: 'CL-MESH-1' },
  { category: 'chain-link', name: 'cl-toprail', description: 'Riel superior 1-3/8" x 10.5\'', unit: 'pieza', price: 1895, supplier: 'Home Depot', sku: 'CL-RAIL-1' },
  
  // Pintura y acabados
  { category: 'finish', name: 'stain-1gal', description: 'Tinte protector para madera exterior 1 galón', unit: 'galón', price: 3499, supplier: 'Home Depot', sku: 'FIN-STN-1' },
  { category: 'finish', name: 'paint-1gal', description: 'Pintura para exterior 1 galón', unit: 'galón', price: 4299, supplier: 'Home Depot', sku: 'FIN-PNT-1' },
  { category: 'finish', name: 'sealer-1gal', description: 'Sellador para madera 1 galón', unit: 'galón', price: 2899, supplier: 'Home Depot', sku: 'FIN-SEAL-1' }
];

async function seedMaterials() {
  // Conexión a la base de datos
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Conectando a la base de datos...');
    
    // Eliminar materiales existentes para evitar duplicados
    console.log('Eliminando materiales existentes...');
    await pool.query('TRUNCATE TABLE materials RESTART IDENTITY CASCADE');
    
    // Insertar los nuevos materiales
    console.log('Insertando materiales...');
    for (const material of materials) {
      const { category, name, description, unit, price, supplier, sku } = material;
      
      await pool.query(
        'INSERT INTO materials (category, name, description, unit, price, supplier, sku) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [category, name, description, unit, price, supplier, sku]
      );
      
      console.log(`Material insertado: ${category} - ${name}`);
    }
    
    console.log('¡Datos de materiales insertados correctamente!');
  } catch (error) {
    console.error('Error al insertar materiales:', error);
  } finally {
    await pool.end();
    console.log('Conexión a la base de datos cerrada.');
  }
}

// Ejecutar la función
seedMaterials();