import OpenAI from "openai";
import { storage } from "../storage";
import * as woodFenceRules from '../../client/src/data/rules/woodfencerules.js';
import { Project, InsertProject } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Verify OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY no está configurado. La generación asistida por IA no estará disponible.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Project input interface with validation requirements
export interface ProjectInput {
  // Contractor Information
  contractorId: number;
  contractorName: string;
  contractorCompany?: string;
  contractorAddress?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorLicense?: string;
  contractorLogo?: string;

  // Client Information
  clientName: string;               // Required 
  clientEmail?: string;             // Valid email format
  clientPhone?: string;             // Valid phone format
  projectAddress: string;           // Required
  clientCity?: string;
  clientState?: string;
  clientZip?: string;

  // Project Details
  projectType: string;              // Required: "fencing", "roofing", etc.
  projectSubtype: string;           // Required: "wood fence", "chain link", etc.
  projectDimensions: {
    length: number;                 // Required
    height?: number;                // Required for fencing
    width?: number;
    area?: number;                  // Required for roofing
  };
  additionalFeatures?: {
    demolition?: boolean;
    painting?: boolean;
    gates?: Array<{
      type: string;
      width: number;
      quantity: number;
      description?: string;
    }>;
    lattice?: boolean;
    [key: string]: any;             // Allow for other project-specific features
  };
  startDate?: Date;                 // Should be future date
  notes?: string;

  // For AI-assisted generation
  useAI?: boolean;                  // Whether to use AI for generating the estimate
  customPrompt?: string;            // Custom instructions for the AI
}

// Validation errors interface
export interface ValidationErrors {
  [key: string]: string;
}

// Function to validate the project input data
export function validateProjectInput(input: Partial<ProjectInput>): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate contractor information
  if (!input.contractorId) {
    errors.contractorId = "Se requiere ID del contratista.";
  }

  // Validate client information
  if (!input.clientName) {
    errors.clientName = "Se requiere nombre del cliente.";
  }

  if (input.clientEmail && !isValidEmail(input.clientEmail)) {
    errors.clientEmail = "Formato de correo electrónico inválido.";
  }

  if (input.clientPhone && !isValidPhone(input.clientPhone)) {
    errors.clientPhone = "Formato de teléfono inválido.";
  }

  if (!input.projectAddress) {
    errors.projectAddress = "Se requiere dirección del proyecto.";
  }

  // Validate project details
  if (!input.projectType) {
    errors.projectType = "Se requiere tipo de proyecto.";
  }

  if (!input.projectSubtype) {
    errors.projectSubtype = "Se requiere subtipo de proyecto.";
  }

  // Validate dimensions based on project type
  if (!input.projectDimensions) {
    errors.projectDimensions = "Se requieren dimensiones del proyecto.";
  } else {
    if (!input.projectDimensions.length || input.projectDimensions.length <= 0) {
      errors.projectDimensions = "La longitud debe ser mayor que cero.";
    }

    if (input.projectType === "fencing" && (!input.projectDimensions.height || input.projectDimensions.height <= 0)) {
      errors.projectDimensions = "La altura es requerida para proyectos de cercas.";
    }

    if (input.projectType === "roofing" && (!input.projectDimensions.area || input.projectDimensions.area <= 0)) {
      errors.projectDimensions = "El área es requerida para proyectos de techos.";
    }
  }

  // Validate start date is in the future
  if (input.startDate && new Date(input.startDate) <= new Date()) {
    errors.startDate = "La fecha de inicio debe ser en el futuro.";
  }

  return errors;
}

// Helper functions for validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Acepta formatos: (123) 456-7890, 123-456-7890, 123.456.7890, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}

export class EstimatorService {
  // Get material prices from the database or use default values
  async getMaterialPrices(materialType: string): Promise<any> {
    try {
      // Later, this would fetch from database
      const materials = await storage.getMaterialsByCategory(materialType);
      if (materials && materials.length > 0) {
        return materials.reduce((acc, material) => {
          acc[material.name] = material.price / 100; // price is stored in cents
          return acc;
        }, {});
      }
      
      // If no materials found, return empty object (will use defaults)
      return {};
    } catch (error) {
      console.error("Error fetching material prices:", error);
      return {};
    }
  }

  // Calculate fence estimate using rules-based approach
  async calculateFenceEstimateWithRules(input: ProjectInput): Promise<any> {
    try {
      const { 
        projectSubtype, 
        projectDimensions, 
        additionalFeatures = {},
        clientState
      } = input;

      const linearFeet = projectDimensions.length;
      const height = projectDimensions.height || 6;
      const state = clientState || "California";
      
      // For wood fences, use the existing rules
      if (projectSubtype.toLowerCase().includes('wood')) {
        const options = {
          demolition: additionalFeatures.demolition || false,
          painting: additionalFeatures.painting || false,
          additionalLattice: additionalFeatures.lattice || false,
          postType: "auto"
        };

        const result = woodFenceRules.calculateWoodFenceCost(linearFeet, height, state, options);
        
        // Build response with more detailed breakdown
        return {
          subtype: projectSubtype,
          dimensions: {
            length: linearFeet,
            height: height
          },
          materials: {
            posts: {
              type: result.postTypeUsed,
              quantity: result.totalPosts,
              costPerUnit: parseFloat(result.postsCost) / result.totalPosts,
              totalCost: parseFloat(result.postsCost)
            },
            concrete: {
              bags: result.totalBags,
              costPerBag: parseFloat(result.concreteCost) / result.totalBags,
              totalCost: parseFloat(result.concreteCost)
            },
            rails: {
              quantity: result.totalRails,
              costPerUnit: parseFloat(result.railsCost) / result.totalRails,
              totalCost: parseFloat(result.railsCost)
            },
            pickets: {
              quantity: result.totalPickets,
              costPerUnit: parseFloat(result.picketsCost) / result.totalPickets,
              totalCost: parseFloat(result.picketsCost)
            },
            hardware: {
              hangers: {
                quantity: result.totalHangers,
                costPerUnit: parseFloat(result.hangersCost) / result.totalHangers,
                totalCost: parseFloat(result.hangersCost)
              },
              screws: {
                boxes: result.boxesScrews,
                costPerBox: parseFloat(result.screwsCost) / result.boxesScrews,
                totalCost: parseFloat(result.screwsCost)
              }
            }
          },
          labor: {
            rate: parseFloat(result.laborRate),
            totalCost: parseFloat(result.laborCost)
          },
          additionalCosts: {
            lattice: parseFloat(result.latticeCost),
            painting: parseFloat(result.paintingCost)
          },
          totals: {
            materialsSubtotal: parseFloat(result.materialsSubtotal),
            totalMaterialsCost: parseFloat(result.totalMaterialsCost),
            laborCost: parseFloat(result.laborCost),
            baseTotalCost: parseFloat(result.baseTotalCost),
            finalTotalCost: parseFloat(result.finalTotalCost),
            costPerLinearFoot: parseFloat(result.costPerLinearFoot)
          }
        };
      } 
      
      // For other fence types, use simplified calculation
      const heightFactors = {
        3: 0.8, 
        4: 0.9, 
        6: 1.0, 
        8: 1.2
      };
      
      const baseRates = {
        "chain link": 40,
        "vinyl": 50,
        "wrought iron": 70,
        "bamboo": 45
      };
      
      // Find appropriate base rate
      let baseRate = 40; // Default
      for (const [key, rate] of Object.entries(baseRates)) {
        if (projectSubtype.toLowerCase().includes(key)) {
          baseRate = rate;
          break;
        }
      }
      
      // Calculate based on simplified model
      const heightFactor = heightFactors[height] || 1.0;
      const demolitionFactor = additionalFeatures.demolition ? 1.2 : 1.0;
      
      const basePrice = linearFeet * baseRate * heightFactor * demolitionFactor;
      const materialsRatio = 0.45; // 45% materials, 55% labor as default
      const materialsCost = basePrice * materialsRatio;
      const laborCost = basePrice * (1 - materialsRatio);
      
      // Add painting cost if applicable
      const paintingCost = additionalFeatures.painting ? (linearFeet * height * 3.5) : 0;
      
      // Calculate gate costs
      let gatesCost = 0;
      if (additionalFeatures.gates && additionalFeatures.gates.length > 0) {
        gatesCost = additionalFeatures.gates.reduce((total, gate) => {
          // Base gate cost calculation
          const gateWidth = gate.width || 4;
          const baseGateCost = gateWidth * baseRate * 3; // Gate is typically 3x linear foot cost
          return total + (baseGateCost * (gate.quantity || 1));
        }, 0);
      }
      
      const totalMaterialsCost = materialsCost;
      const subtotal = materialsCost + laborCost + paintingCost + gatesCost;
      const tax = subtotal * 0.0875; // Typical sales tax
      const total = subtotal + tax;
      
      return {
        subtype: projectSubtype,
        dimensions: {
          length: linearFeet,
          height: height
        },
        materials: {
          totalCost: totalMaterialsCost
        },
        labor: {
          totalCost: laborCost
        },
        additionalCosts: {
          painting: paintingCost,
          gates: gatesCost
        },
        totals: {
          materialsSubtotal: materialsCost,
          totalMaterialsCost: totalMaterialsCost,
          laborCost: laborCost,
          paintingCost: paintingCost,
          gatesCost: gatesCost,
          subtotal: subtotal,
          tax: tax,
          total: total,
          costPerLinearFoot: total / linearFeet
        }
      };
    } catch (error) {
      console.error("Error calculating fence estimate:", error);
      throw error;
    }
  }

  // Calculate roofing estimate (simplified approach)
  async calculateRoofingEstimateWithRules(input: ProjectInput): Promise<any> {
    try {
      const { 
        projectSubtype, 
        projectDimensions, 
        additionalFeatures = {},
        clientState
      } = input;

      const area = projectDimensions.area || 0;
      const state = clientState || "California";
      
      // Base rates per square foot
      const roofingRates = {
        "asphalt": 4.5,
        "metal": 7.5,
        "tile": 9.0,
        "slate": 14.0,
        "flat": 6.0
      };
      
      // Find appropriate base rate
      let baseRate = 5.0; // Default
      for (const [key, rate] of Object.entries(roofingRates)) {
        if (projectSubtype.toLowerCase().includes(key)) {
          baseRate = rate;
          break;
        }
      }
      
      // State cost factors
      const stateFactor = (state === "California") ? 1.2 : 
                         (state === "New York") ? 1.3 : 1.0;
      
      // Calculate costs
      const demolitionCost = additionalFeatures.demolition ? (area * 1.5) : 0;
      const materialsCost = area * baseRate * stateFactor;
      const laborCost = area * baseRate * 0.8 * stateFactor; // Labor is ~80% of material cost
      
      const subtotal = materialsCost + laborCost + demolitionCost;
      const tax = materialsCost * 0.0875; // Tax only on materials
      const total = subtotal + tax;
      
      return {
        subtype: projectSubtype,
        dimensions: {
          area: area
        },
        materials: {
          totalCost: materialsCost
        },
        labor: {
          totalCost: laborCost
        },
        additionalCosts: {
          demolition: demolitionCost
        },
        totals: {
          materialsSubtotal: materialsCost,
          laborCost: laborCost,
          demolitionCost: demolitionCost,
          subtotal: subtotal,
          tax: tax,
          total: total,
          costPerSquareFoot: total / area
        }
      };
    } catch (error) {
      console.error("Error calculating roofing estimate:", error);
      throw error;
    }
  }

  // Generate estimate using AI
  async generateEstimateWithAI(input: ProjectInput): Promise<any> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API Key no configurada. No se puede utilizar generación por IA.");
      }

      // Create a detailed system prompt with all the information
      const systemPrompt = `Eres un asistente experto en estimación de costos de construcción y proyectos residenciales.
Tu tarea es generar un estimado detallado para un proyecto de construcción, utilizando tu conocimiento
de materiales, precios, y prácticas estándar en la industria.

INFORMACIÓN DEL PROYECTO:
- Tipo: ${input.projectType}
- Subtipo: ${input.projectSubtype}
- Dimensiones: ${JSON.stringify(input.projectDimensions)}
- Características adicionales: ${JSON.stringify(input.additionalFeatures || {})}
- Ubicación: ${input.clientState || "California"}, ${input.clientCity || ""}

GENERAR UN ESTIMADO DETALLADO QUE INCLUYA:
1. Desglose de materiales necesarios (cantidades y costos)
2. Desglose de mano de obra (horas/días y costos)
3. Cualquier costo adicional (permisos, remoción de escombros, etc.)
4. Subtotal, impuestos y total final
5. Una estimación de tiempo para completar el proyecto

Responde con un objeto JSON que tenga la siguiente estructura:
{
  "materials": [
    {"name": "string", "quantity": number, "unit": "string", "unitCost": number, "totalCost": number}
  ],
  "labor": [
    {"description": "string", "hours": number, "rate": number, "totalCost": number}
  ],
  "additionalCosts": [
    {"description": "string", "cost": number}
  ],
  "summary": {
    "materialsTotal": number,
    "laborTotal": number,
    "additionalTotal": number,
    "subtotal": number,
    "tax": number,
    "total": number,
    "timeEstimate": "string"
  }
}`;

      // Add custom instructions if provided
      const fullPrompt = input.customPrompt 
        ? systemPrompt + "\n\nINSTRUCCIONES ADICIONALES:\n" + input.customPrompt
        : systemPrompt;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: fullPrompt },
          { role: "user", content: "Genera un estimado detallado basado en la información proporcionada." }
        ],
        response_format: { type: "json_object" }
      });

      // Parse the response
      const aiEstimate = JSON.parse(response.choices[0].message.content);
      
      // Return the AI-generated estimate
      return {
        aiGenerated: true,
        timestamp: new Date().toISOString(),
        data: aiEstimate
      };
    } catch (error) {
      console.error("Error generando estimado con IA:", error);
      throw error;
    }
  }

  // Master function to generate an estimate
  async generateEstimate(input: ProjectInput): Promise<any> {
    // Validate the input data
    const validationErrors = validateProjectInput(input);
    if (Object.keys(validationErrors).length > 0) {
      throw new Error("Datos de entrada inválidos: " + JSON.stringify(validationErrors));
    }

    // Generate unique project ID
    const projectId = this.generateProjectId();
    
    // Initialize result object
    let rulesBasedEstimate = null;
    let aiEstimate = null;
    
    // Calculate rules-based estimate based on project type
    if (input.projectType.toLowerCase() === "fencing") {
      rulesBasedEstimate = await this.calculateFenceEstimateWithRules(input);
    } else if (input.projectType.toLowerCase() === "roofing") {
      rulesBasedEstimate = await this.calculateRoofingEstimateWithRules(input);
    } else {
      // For other project types, just capture the request for later manual estimation
      rulesBasedEstimate = {
        message: "Tipo de proyecto no soportado para estimación automática",
        projectType: input.projectType,
        dimensions: input.projectDimensions
      };
    }
    
    // If AI generation is requested, also get AI estimate
    if (input.useAI) {
      try {
        aiEstimate = await this.generateEstimateWithAI(input);
      } catch (error) {
        console.error("Error en generación de estimado por IA:", error);
        // Continue with just the rules-based estimate
      }
    }
    
    // Generate final response
    const result = {
      projectId,
      timestamp: new Date().toISOString(),
      contractor: {
        id: input.contractorId,
        name: input.contractorName,
        company: input.contractorCompany,
        license: input.contractorLicense
      },
      client: {
        name: input.clientName,
        email: input.clientEmail,
        phone: input.clientPhone,
        address: input.projectAddress,
        city: input.clientCity,
        state: input.clientState,
        zip: input.clientZip
      },
      project: {
        type: input.projectType,
        subtype: input.projectSubtype,
        dimensions: input.projectDimensions,
        additionalFeatures: input.additionalFeatures,
        startDate: input.startDate,
        notes: input.notes
      },
      rulesBasedEstimate,
      aiEstimate
    };
    
    // Save the estimate data in the database
    try {
      await this.saveEstimate(input, result);
    } catch (error) {
      console.error("Error al guardar el estimado:", error);
      // Continue even if saving fails
    }
    
    return result;
  }

  // Generate HTML for the estimate
  async generateEstimateHtml(estimateData: any): Promise<string> {
    try {
      // Get the default template for the user
      const userId = estimateData.contractor.id;
      const template = await storage.getDefaultTemplate(userId, "estimate");
      
      if (!template) {
        // Use a basic default template if none is found
        return this.generateDefaultEstimateHtml(estimateData);
      }
      
      // Replace placeholders in the template with actual data
      let html = template.html;
      
      // Basic replacements
      const replacements = {
        "{{estimateNumber}}": estimateData.projectId,
        "{{estimateDate}}": new Date().toLocaleDateString(),
        "{{validUntil}}": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
        "{{contractorName}}": estimateData.contractor.name || "",
        "{{contractorCompany}}": estimateData.contractor.company || "",
        "{{contractorLicense}}": estimateData.contractor.license || "",
        "{{contractorAddress}}": estimateData.contractor?.address || "",
        "{{contractorPhone}}": estimateData.contractor?.phone || "",
        "{{contractorEmail}}": estimateData.contractor?.email || "",
        "{{clientName}}": estimateData.client.name || "",
        "{{clientAddressBilling}}": estimateData.client.address || "",
        "{{clientAddressShipping}}": estimateData.client.address || "",
        "{{clientPhone}}": estimateData.client.phone || "",
        "{{clientEmail}}": estimateData.client.email || "",
        "{{projectType}}": estimateData.project.type || "",
        "{{projectSubtype}}": estimateData.project.subtype || "",
        "{{projectLength}}": estimateData.project.dimensions?.length?.toString() || "",
        "{{projectHeight}}": estimateData.project.dimensions?.height?.toString() || "",
        "{{projectArea}}": estimateData.project.dimensions?.area?.toString() || "",
        "{{projectNotes}}": estimateData.project.notes || "",
        "{{materialsTotal}}": estimateData.rulesBasedEstimate?.totals?.totalMaterialsCost?.toFixed(2) || "0.00",
        "{{laborTotal}}": estimateData.rulesBasedEstimate?.totals?.laborCost?.toFixed(2) || "0.00",
        "{{subtotal}}": estimateData.rulesBasedEstimate?.totals?.subtotal?.toFixed(2) || "0.00",
        "{{tax}}": estimateData.rulesBasedEstimate?.totals?.tax?.toFixed(2) || "0.00",
        "{{total}}": estimateData.rulesBasedEstimate?.totals?.total?.toFixed(2) || "0.00",
        "{{logoURL}}": estimateData.contractor?.logo || "https://via.placeholder.com/200x100?text=Logo"
      };
      
      // Apply replacements
      for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.replace(new RegExp(placeholder, "g"), value);
      }
      
      // Generate line items HTML
      let lineItemsHtml = '';
      
      // Add materials
      if (estimateData.rulesBasedEstimate && estimateData.rulesBasedEstimate.materials) {
        const materials = estimateData.rulesBasedEstimate.materials;
        
        // For detailed materials breakdown (wood fence)
        if (materials.posts) {
          lineItemsHtml += this.generateLineItemHtml(
            `Postes (${materials.posts.type})`, 
            materials.posts.quantity, 
            "unidad", 
            materials.posts.costPerUnit, 
            materials.posts.totalCost
          );
          
          lineItemsHtml += this.generateLineItemHtml(
            "Concreto para postes", 
            materials.concrete.bags, 
            "bolsa", 
            materials.concrete.costPerBag, 
            materials.concrete.totalCost
          );
          
          lineItemsHtml += this.generateLineItemHtml(
            "Rieles", 
            materials.rails.quantity, 
            "unidad", 
            materials.rails.costPerUnit, 
            materials.rails.totalCost
          );
          
          lineItemsHtml += this.generateLineItemHtml(
            "Tablas", 
            materials.pickets.quantity, 
            "unidad", 
            materials.pickets.costPerUnit, 
            materials.pickets.totalCost
          );
        } else {
          // For simplified material list
          lineItemsHtml += this.generateLineItemHtml(
            `Materiales (${estimateData.project.subtype})`, 
            1, 
            "conjunto", 
            materials.totalCost, 
            materials.totalCost
          );
        }
      }
      
      // Add labor
      if (estimateData.rulesBasedEstimate && estimateData.rulesBasedEstimate.labor) {
        lineItemsHtml += this.generateLineItemHtml(
          "Mano de obra", 
          1, 
          "servicio", 
          estimateData.rulesBasedEstimate.labor.totalCost, 
          estimateData.rulesBasedEstimate.labor.totalCost
        );
      }
      
      // Add additional costs
      if (estimateData.rulesBasedEstimate && estimateData.rulesBasedEstimate.additionalCosts) {
        const additionalCosts = estimateData.rulesBasedEstimate.additionalCosts;
        
        if (additionalCosts.demolition && additionalCosts.demolition > 0) {
          lineItemsHtml += this.generateLineItemHtml(
            "Demolición y remoción", 
            1, 
            "servicio", 
            additionalCosts.demolition, 
            additionalCosts.demolition
          );
        }
        
        if (additionalCosts.painting && additionalCosts.painting > 0) {
          lineItemsHtml += this.generateLineItemHtml(
            "Pintura y acabados", 
            1, 
            "servicio", 
            additionalCosts.painting, 
            additionalCosts.painting
          );
        }
        
        if (additionalCosts.lattice && additionalCosts.lattice > 0) {
          lineItemsHtml += this.generateLineItemHtml(
            "Celosía decorativa", 
            1, 
            "servicio", 
            additionalCosts.lattice, 
            additionalCosts.lattice
          );
        }
        
        if (additionalCosts.gates && additionalCosts.gates > 0) {
          lineItemsHtml += this.generateLineItemHtml(
            "Puertas e instalación", 
            1, 
            "conjunto", 
            additionalCosts.gates, 
            additionalCosts.gates
          );
        }
      }
      
      // Replace line items placeholder
      html = html.replace("{{lineItems}}", lineItemsHtml);
      
      return html;
    } catch (error) {
      console.error("Error generando HTML del estimado:", error);
      // Return a very basic estimate in case of error
      return this.generateErrorEstimateHtml(estimateData);
    }
  }

  // Helper method to generate a line item HTML
  private generateLineItemHtml(description: string, quantity: number, unit: string, unitPrice: number, totalPrice: number): string {
    return `
      <tr>
        <td>${description}</td>
        <td>${quantity}</td>
        <td>${unit}</td>
        <td>$${unitPrice.toFixed(2)}</td>
        <td>$${totalPrice.toFixed(2)}</td>
      </tr>
    `;
  }

  // Generate a default template if none is found
  private generateDefaultEstimateHtml(estimateData: any): string {
    const today = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
    
    let lineItems = '';
    let subtotal = 0;
    
    if (estimateData.rulesBasedEstimate) {
      // Add materials
      if (estimateData.rulesBasedEstimate.materials) {
        if (estimateData.rulesBasedEstimate.materials.posts) {
          // Detailed materials
          lineItems += this.generateLineItemHtml(
            `Postes (${estimateData.rulesBasedEstimate.materials.posts.type})`, 
            estimateData.rulesBasedEstimate.materials.posts.quantity, 
            "unidad", 
            estimateData.rulesBasedEstimate.materials.posts.costPerUnit, 
            estimateData.rulesBasedEstimate.materials.posts.totalCost
          );
          
          subtotal += estimateData.rulesBasedEstimate.materials.posts.totalCost;
          
          // Add other materials...
        } else {
          // Simplified materials
          lineItems += this.generateLineItemHtml(
            `Materiales (${estimateData.project.subtype})`, 
            1, 
            "conjunto", 
            estimateData.rulesBasedEstimate.materials.totalCost, 
            estimateData.rulesBasedEstimate.materials.totalCost
          );
          
          subtotal += estimateData.rulesBasedEstimate.materials.totalCost;
        }
      }
      
      // Add labor
      if (estimateData.rulesBasedEstimate.labor) {
        lineItems += this.generateLineItemHtml(
          "Mano de obra", 
          1, 
          "servicio", 
          estimateData.rulesBasedEstimate.labor.totalCost, 
          estimateData.rulesBasedEstimate.labor.totalCost
        );
        
        subtotal += estimateData.rulesBasedEstimate.labor.totalCost;
      }
    }
    
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Estimado #${estimateData.projectId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .company { font-weight: bold; font-size: 24px; }
          .estimate-info { text-align: right; }
          .client-info, .project-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${estimateData.contractor.company || estimateData.contractor.name}</div>
          <div class="estimate-info">
            <h2>ESTIMADO</h2>
            <p>Número: ${estimateData.projectId}</p>
            <p>Fecha: ${today}</p>
            <p>Válido hasta: ${validUntil}</p>
          </div>
        </div>
        
        <div class="client-info">
          <h3>Cliente</h3>
          <p><strong>Nombre:</strong> ${estimateData.client.name}</p>
          <p><strong>Dirección:</strong> ${estimateData.client.address}</p>
          <p><strong>Teléfono:</strong> ${estimateData.client.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${estimateData.client.email || 'N/A'}</p>
        </div>
        
        <div class="project-info">
          <h3>Detalles del Proyecto</h3>
          <p><strong>Tipo:</strong> ${estimateData.project.type} - ${estimateData.project.subtype}</p>
          <p><strong>Dimensiones:</strong> 
             ${estimateData.project.dimensions.length ? `Longitud: ${estimateData.project.dimensions.length} pies` : ''}
             ${estimateData.project.dimensions.height ? `Altura: ${estimateData.project.dimensions.height} pies` : ''}
             ${estimateData.project.dimensions.area ? `Área: ${estimateData.project.dimensions.area} pies cuadrados` : ''}
          </p>
          <p><strong>Notas:</strong> ${estimateData.project.notes || 'N/A'}</p>
        </div>
        
        <h3>Detalle del Estimado</h3>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio Unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="total">Subtotal</td>
              <td class="total">$${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4">Impuesto (8.75%)</td>
              <td>$${tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4" class="total">TOTAL</td>
              <td class="total">$${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="terms">
          <h3>Términos y Condiciones</h3>
          <p>1. Este estimado es válido por 30 días desde la fecha de emisión.</p>
          <p>2. Se requiere un 50% de depósito para comenzar el trabajo.</p>
          <p>3. El balance restante se debe al completar el trabajo.</p>
          <p>4. Los cambios al proyecto pueden resultar en costos adicionales.</p>
        </div>
        
        <div class="footer">
          <p><strong>${estimateData.contractor.company || estimateData.contractor.name}</strong></p>
          <p>License: ${estimateData.contractor.license || 'N/A'}</p>
          <p>Tel: ${estimateData.contractor.phone || 'N/A'} | Email: ${estimateData.contractor.email || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate a simple error template
  private generateErrorEstimateHtml(estimateData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Estimado Error</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>Error Generando Estimado</h1>
        <p class="error">Ocurrió un error al generar el estimado detallado.</p>
        <p>Por favor contacte al administrador del sistema.</p>
        <p>ID de Proyecto: ${estimateData.projectId}</p>
      </body>
      </html>
    `;
  }

  // Generate project ID
  private generateProjectId(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = crypto.randomBytes(3).toString('hex');
    return `EST-${timestamp}${random}`;
  }

  // Save the estimate to the database
  private async saveEstimate(input: ProjectInput, estimateData: any): Promise<void> {
    try {
      // Prepare the project data
      const projectData: InsertProject = {
        userId: input.contractorId,
        projectId: estimateData.projectId,
        clientName: input.clientName,
        clientEmail: input.clientEmail || "",
        clientPhone: input.clientPhone || "",
        address: input.projectAddress,
        fenceType: input.projectSubtype,
        length: input.projectDimensions.length,
        height: input.projectDimensions.height || 0,
        gates: input.additionalFeatures?.gates || [],
        additionalDetails: input.notes || "",
        status: "draft"
      };
      
      // Create HTML for the estimate
      const estimateHtml = await this.generateEstimateHtml(estimateData);
      
      // Add the estimate HTML to the project data
      projectData.estimateHtml = estimateHtml;
      
      // Add the total price if available
      if (estimateData.rulesBasedEstimate?.totals?.total) {
        projectData.totalPrice = Math.round(estimateData.rulesBasedEstimate.totals.total * 100);
      }
      
      // Save to database
      await storage.createProject(projectData);
    } catch (error) {
      console.error("Error saving estimate to database:", error);
      throw error;
    }
  }
}

export const estimatorService = new EstimatorService();