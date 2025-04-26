// Script para poblar la tabla de materiales con materiales de techado
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';

// Configurar WebSocket
neonConfig.webSocketConstructor = ws;

dotenv.config();

// Lista de materiales de techado con sus precios (en centavos)
const roofingMaterials = [
  { category: 'roofing', name: 'asphalt_standard', description: 'Tejas de asfalto estándar', unit: 'sq ft', price: 450, supplier: 'Home Depot', sku: 'ROOF-ASP-STD' },
  { category: 'roofing', name: 'asphalt_premium', description: 'Tejas de asfalto premium', unit: 'sq ft', price: 650, supplier: 'Home Depot', sku: 'ROOF-ASP-PRE' },
  { category: 'roofing', name: 'metal_standard', description: 'Techo de metal estándar', unit: 'sq ft', price: 750, supplier: 'Lowe\'s', sku: 'ROOF-MTL-STD' },
  { category: 'roofing', name: 'metal_premium', description: 'Techo de metal premium', unit: 'sq ft', price: 950, supplier: 'Lowe\'s', sku: 'ROOF-MTL-PRE' },
  { category: 'roofing', name: 'clay_standard', description: 'Tejas de arcilla estándar', unit: 'sq ft', price: 900, supplier: 'Home Depot', sku: 'ROOF-CLY-STD' },
  { category: 'roofing', name: 'clay_premium', description: 'Tejas de arcilla premium', unit: 'sq ft', price: 1200, supplier: 'Home Depot', sku: 'ROOF-CLY-PRE' },
  { category: 'roofing', name: 'slate', description: 'Techo de pizarra', unit: 'sq ft', price: 1400, supplier: 'Specialty Roofing', sku: 'ROOF-SLT' },
  { category: 'roofing', name: 'flat_membrane', description: 'Membrana para techo plano', unit: 'sq ft', price: 600, supplier: 'Lowe\'s', sku: 'ROOF-FLT-MEM' },
  { category: 'roofing', name: 'underlayment', description: 'Membrana bajo-techo', unit: 'sq ft', price: 100, supplier: 'Home Depot', sku: 'ROOF-UNDLY' },
  { category: 'roofing', name: 'flashing', description: 'Tapajuntas para techo', unit: 'roll', price: 1500, supplier: 'Home Depot', sku: 'ROOF-FLASH' },
  { category: 'roofing', name: 'sealant', description: 'Sellador para techo', unit: 'gallon', price: 2500, supplier: 'Home Depot', sku: 'ROOF-SEAL' },
  { category: 'roofing', name: 'nails', description: 'Clavos para techo', unit: 'box', price: 1200, supplier: 'Home Depot', sku: 'ROOF-NAILS' },
  { category: 'roofing', name: 'vent', description: 'Ventilación para techo', unit: 'unit', price: 3500, supplier: 'Lowe\'s', sku: 'ROOF-VENT' },
  { category: 'roofing', name: 'insulation', description: 'Aislamiento para techo', unit: 'sq ft', price: 200, supplier: 'Home Depot', sku: 'ROOF-INSUL' }
];

async function seedRoofingMaterials() {
  // Conexión a la base de datos
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Conectando a la base de datos...');
    
    // Insertar los nuevos materiales
    console.log('Insertando materiales de techado...');
    for (const material of roofingMaterials) {
      const { category, name, description, unit, price, supplier, sku } = material;
      
      // Verificar si ya existe este material
      const checkResult = await pool.query(
        'SELECT id FROM materials WHERE name = $1 AND category = $2',
        [name, category]
      );
      
      if (checkResult.rows.length > 0) {
        // Actualizar si existe
        await pool.query(
          'UPDATE materials SET description = $1, unit = $2, price = $3, supplier = $4, sku = $5 WHERE name = $6 AND category = $7',
          [description, unit, price, supplier, sku, name, category]
        );
        console.log(`Material actualizado: ${category} - ${name}`);
      } else {
        // Insertar si no existe
        await pool.query(
          'INSERT INTO materials (category, name, description, unit, price, supplier, sku) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [category, name, description, unit, price, supplier, sku]
        );
        console.log(`Material insertado: ${category} - ${name}`);
      }
    }
    
    console.log('¡Datos de materiales de techado insertados correctamente!');
  } catch (error) {
    console.error('Error al insertar materiales de techado:', error);
  } finally {
    await pool.end();
    console.log('Conexión a la base de datos cerrada.');
  }
}

// Ejecutar la función
seedRoofingMaterials();