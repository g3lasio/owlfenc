/**
 * Material Inventory Service
 * 
 * Servicio para gestionar el inventario automático de materiales
 * desde DeepSearch hacia Firebase
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from '@/hooks/use-toast';

export interface MaterialInventoryItem {
  name: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  supplier?: string;
  supplierLink?: string;
  sku?: string;
  stock?: number;
  minStock?: number;
  source: 'deepsearch' | 'manual' | 'import';
  tags?: string[];
}

export class MaterialInventoryService {
  
  /**
   * CÁLCULOS SEGUROS: Normaliza precios inflados que pueden venir de datos legacy
   */
  static normalizePriceValue(price: any): number {
    const numericPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
    // Si el precio es > 1000, probablemente está en centavos, convertir a dólares
    return numericPrice > 1000 ? Number((numericPrice / 100).toFixed(2)) : numericPrice;
  }

  /**
   * CÁLCULOS SEGUROS: Corrige materiales existentes con precios inflados
   */
  static async fixInflatedPricesInDatabase(userId: string): Promise<{ corrected: number; errors: string[] }> {
    const results = { corrected: 0, errors: [] as string[] };
    
    try {
      console.log('🔧 STARTING PRICE CORRECTION: Fixing inflated prices for user:', userId);
      
      const materialsRef = collection(db, 'materials');
      const userMaterialsQuery = query(materialsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(userMaterialsQuery);
      
      for (const docSnapshot of querySnapshot.docs) {
        const material = docSnapshot.data();
        const originalPrice = material.price;
        
        if (originalPrice > 1000) {
          const correctedPrice = this.normalizePriceValue(originalPrice);
          
          try {
            await docSnapshot.ref.update({
              price: correctedPrice,
              updatedAt: serverTimestamp(),
              priceCorrection: `Auto-corrected from ${originalPrice} to ${correctedPrice}`
            });
            
            console.log(`✅ PRICE CORRECTED: ${material.name} - ${originalPrice} → ${correctedPrice}`);
            results.corrected++;
          } catch (error) {
            console.error(`❌ Error correcting price for ${material.name}:`, error);
            results.errors.push(`Failed to correct ${material.name}`);
          }
        }
      }
      
      if (results.corrected > 0) {
        console.log(`🎯 CORRECTION COMPLETE: Fixed ${results.corrected} inflated prices`);
        toast({
          title: "Precios Corregidos",
          description: `Se corrigieron ${results.corrected} precios inflados automáticamente`,
        });
      }
      
    } catch (error) {
      console.error('❌ Error during price correction:', error);
      results.errors.push('Failed to access database');
    }
    
    return results;
  }

  /**
   * Agrega materiales automáticamente al inventario desde DeepSearch
   */
  static async addMaterialsFromDeepSearch(
    materials: any[], 
    userId: string, 
    projectDescription?: string
  ): Promise<{ added: number; skipped: number; errors: string[] }> {
    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[]
    };

    if (!materials || materials.length === 0) {
      return results;
    }

    console.log('🔄 AUTO-SAVE STARTING: Saving materials to inventory:', materials.length);
    console.log('🔍 Materials to save:', materials);
    console.log('👤 User ID:', userId);

    try {
      // Verificar materiales existentes para evitar duplicados
      console.log('📋 Checking existing materials...');
      const existingMaterials = await this.getExistingMaterials(userId);
      console.log('📊 Found existing materials:', existingMaterials.length);
      const existingNames = new Set(existingMaterials.map(m => m.name.toLowerCase().trim()));

      for (const material of materials) {
        try {
          // Validar datos del material
          if (!material.name || !material.unit) {
            results.errors.push(`Material incomplete: ${material.name || 'Unknown'}`);
            continue;
          }

          // Verificar si ya existe
          const materialName = material.name.toLowerCase().trim();
          if (existingNames.has(materialName)) {
            console.log(`⏭️ Material already exists: ${material.name}`);
            results.skipped++;
            continue;
          }

          // CÁLCULOS SEGUROS: Normalizar precios para evitar valores inflados
          const rawPrice = typeof material.price === 'number' ? material.price : 
                          (typeof material.unitPrice === 'number' ? material.unitPrice : 
                          parseFloat(material.price || material.unitPrice) || 0);
          
          // CÁLCULOS SEGUROS: Detectar y corregir precios inflados (> 1000 probablemente en centavos)
          const normalizedPrice = rawPrice > 1000 ? Number((rawPrice / 100).toFixed(2)) : rawPrice;
          
          console.log('💰 PRICE NORMALIZATION:', {
            materialName: material.name,
            rawPrice,
            normalizedPrice,
            wasInflated: rawPrice > 1000
          });

          // Preparar datos del material para Firebase
          const materialData: MaterialInventoryItem = {
            name: material.name,
            category: material.category || 'General',
            description: material.description || `Auto-generated from DeepSearch`,
            unit: material.unit,
            price: normalizedPrice, // CÁLCULOS SEGUROS: usar precio normalizado
            supplier: material.supplier || '',
            supplierLink: material.supplierLink || '',
            sku: material.sku || '',
            stock: material.stock || 0,
            minStock: material.minStock || 0,
            source: 'deepsearch',
            tags: ['ai-generated', 'deepsearch', ...(material.tags || [])]
          };

          // Guardar en Firebase
          const docData = {
            ...materialData,
            userId,
            projectDescription: projectDescription || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await addDoc(collection(db, 'materials'), docData);
          
          console.log(`✅ Material saved to inventory: ${material.name}`);
          results.added++;
          existingNames.add(materialName); // Agregar a la lista para evitar duplicados en el mismo lote

        } catch (error) {
          console.error(`❌ Error saving material ${material.name}:`, error);
          results.errors.push(`Failed to save ${material.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Mostrar notificación de resultados
      if (results.added > 0) {
        toast({
          title: "Materials Added to Inventory",
          description: `${results.added} new materials automatically saved to your inventory${results.skipped > 0 ? `. ${results.skipped} duplicates skipped` : ''}.`,
        });
      }

      if (results.errors.length > 0) {
        console.warn('⚠️ Some materials could not be saved:', results.errors);
      }

    } catch (error) {
      console.error('❌ Error in bulk material save:', error);
      results.errors.push(`Bulk save error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Obtiene materiales existentes del usuario para evitar duplicados
   */
  private static async getExistingMaterials(userId: string): Promise<{ name: string; id: string }[]> {
    try {
      const q = query(
        collection(db, 'materials'), 
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const materials: { name: string; id: string }[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          materials.push({
            id: doc.id,
            name: data.name
          });
        }
      });

      return materials;
    } catch (error) {
      console.error('Error fetching existing materials:', error);
      return [];
    }
  }

  /**
   * Valida si un material es válido para agregar al inventario
   */
  static validateMaterial(material: any): boolean {
    return !!(
      material &&
      material.name &&
      typeof material.name === 'string' &&
      material.name.trim().length > 0 &&
      material.unit &&
      typeof material.unit === 'string'
    );
  }

  /**
   * Limpia y formatea datos del material para el inventario
   */
  static formatMaterialForInventory(material: any): MaterialInventoryItem | null {
    if (!this.validateMaterial(material)) {
      return null;
    }

    return {
      name: material.name.trim(),
      category: material.category || 'General',
      description: material.description || `Material from DeepSearch analysis`,
      unit: material.unit,
      price: typeof material.price === 'number' ? material.price : parseFloat(material.price) || 0,
      supplier: material.supplier || '',
      supplierLink: material.supplierLink || '',
      sku: material.sku || '',
      stock: material.stock || 0,
      minStock: material.minStock || 0,
      source: 'deepsearch',
      tags: ['ai-generated', 'deepsearch']
    };
  }
}