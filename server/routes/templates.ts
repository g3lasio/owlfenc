import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { templates } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { z } from "zod";

const createProfessionalTemplate = async () => {
  try {
    // Primero revisar si ya existen las plantillas
    const existingTemplates = await db.select().from(templates)
      .where(and(
        eq(templates.type, 'estimate'),
        eq(templates.name, 'Estimado Profesional')
      ));

    if (existingTemplates.length > 0) {
      console.log('La plantilla profesional ya existe. ID:', existingTemplates[0].id);
      return { success: true, message: 'La plantilla profesional ya existe', id: existingTemplates[0].id };
    }

    // Crear plantilla profesional
    const professionalTemplate = {
      userId: 1, // Usuario por defecto del sistema
      name: 'Estimado Profesional',
      description: 'Plantilla de estimado con diseño profesional y detalles organizados',
      type: 'estimate',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Estimado Profesional</title>
          <style>
            /* Estilos globales */
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            
            .estimate-container {
              max-width: 800px;
              margin: 20px auto;
              padding: 30px;
              background-color: white;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              border-top: 6px solid #3b82f6;
            }
            
            /* Cabecera */
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .company-info {
              flex: 2;
            }
            
            .company-info h1 {
              margin: 0 0 5px 0;
              color: #1f2937;
              font-weight: 700;
            }
            
            .company-info p {
              margin: 0 0 3px 0;
              color: #4b5563;
              font-size: 0.9rem;
            }
            
            .logo img {
              max-width: 120px;
              height: auto;
            }
            
            .estimate-meta {
              flex: 1;
              text-align: right;
            }
            
            .estimate-meta h2 {
              margin: 0 0 10px 0;
              font-size: 1.5rem;
              color: #1e40af;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 0.9rem;
            }
            
            .meta-label {
              font-weight: 600;
              color: #6b7280;
            }
            
            /* Información del cliente */
            .client-section {
              display: flex;
              margin-bottom: 30px;
              gap: 30px;
            }
            
            .client-info, .project-info {
              flex: 1;
              background-color: #f3f4f6;
              padding: 15px;
              border-radius: 5px;
            }
            
            .section-title {
              margin: 0 0 10px 0;
              color: #1e40af;
              font-size: 1.1rem;
              font-weight: 600;
              padding-bottom: 5px;
              border-bottom: 2px solid #dbeafe;
            }
            
            .client-info p, .project-info p {
              margin: 0 0 5px 0;
              font-size: 0.9rem;
            }
            
            /* Tabla de desglose */
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            .items-table th {
              background-color: #eef2ff;
              padding: 12px 15px;
              text-align: left;
              font-weight: 600;
              color: #1e40af;
              font-size: 0.9rem;
              border-bottom: 2px solid #c7d2fe;
            }
            
            .items-table td {
              padding: 12px 15px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 0.9rem;
            }
            
            .items-table tr:last-child td {
              border-bottom: none;
            }
            
            .items-table tr:nth-child(even) {
              background-color: #f9fafb;
            }
            
            /* Resumen de precios */
            .summary-table {
              width: 350px;
              margin-left: auto;
              margin-bottom: 30px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 0.9rem;
            }
            
            .summary-row.subtotal {
              border-top: 1px solid #e5e7eb;
              border-bottom: 1px solid #e5e7eb;
              padding-top: 12px;
              padding-bottom: 12px;
            }
            
            .summary-row.total {
              font-weight: 700;
              font-size: 1.1rem;
              color: #1e40af;
              padding-top: 12px;
            }
            
            /* Términos y notas */
            .terms-section {
              margin-bottom: 30px;
              padding: 20px;
              background-color: #f3f4f6;
              border-radius: 5px;
            }
            
            .terms-title {
              margin: 0 0 15px 0;
              color: #1e40af;
              font-size: 1.1rem;
              font-weight: 600;
            }
            
            .terms-list {
              margin: 0;
              padding-left: 20px;
            }
            
            .terms-list li {
              margin-bottom: 8px;
              font-size: 0.9rem;
            }
            
            /* Footer */
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 0.8rem;
            }
            
            .cta {
              text-align: center;
              margin: 30px 0;
            }
            
            .cta-message {
              font-size: 1.1rem;
              color: #1e40af;
              margin-bottom: 15px;
            }
            
            .signature {
              margin-top: 40px;
              padding-top: 20px;
              display: flex;
              justify-content: space-between;
            }
            
            .signature-line {
              width: 45%;
              border-top: 1px solid #9ca3af;
              padding-top: 10px;
              font-size: 0.9rem;
              color: #4b5563;
            }
          </style>
        </head>
        <body>
          <div class="estimate-container">
            <!-- Cabecera con logo e información -->
            <div class="header">
              <div class="company-info">
                <h1>{{companyName}}</h1>
                <p>{{companyAddress}}</p>
                <p>{{companyPhone}} | {{companyEmail}}</p>
                <p>Licencia: {{companyLicense}}</p>
              </div>
              <div class="logo">
                <img src="{{logoUrl}}" alt="Logo">
              </div>
              <div class="estimate-meta">
                <h2>Estimado</h2>
                <div class="meta-row">
                  <span class="meta-label">Fecha:</span>
                  <span>{{currentDate}}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Estimado #:</span>
                  <span>{{estimateNumber}}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Válido por:</span>
                  <span>30 días</span>
                </div>
              </div>
            </div>
            
            <!-- Información del cliente y proyecto -->
            <div class="client-section">
              <div class="client-info">
                <h3 class="section-title">Información del Cliente</h3>
                <p><strong>Nombre:</strong> {{clientName}}</p>
                <p><strong>Email:</strong> {{clientEmail}}</p>
                <p><strong>Teléfono:</strong> {{clientPhone}}</p>
                <p><strong>Dirección:</strong> {{clientAddress}}</p>
                <p><strong>Ciudad:</strong> {{clientCity}}, {{clientState}} {{clientZip}}</p>
              </div>
              <div class="project-info">
                <h3 class="section-title">Detalles del Proyecto</h3>
                <p><strong>Tipo:</strong> {{projectType}}</p>
                <p><strong>Subtipo:</strong> {{projectSubtype}}</p>
                <p><strong>Dirección:</strong> {{projectAddress}}</p>
                <p><strong>Dimensiones:</strong> {{projectDimensions}}</p>
                <p><strong>Características adicionales:</strong> {{additionalFeatures}}</p>
              </div>
            </div>
            
            <!-- Tabla de items -->
            <h3 class="section-title">Materiales y Servicios</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 45%;">Descripción</th>
                  <th style="width: 15%;">Cantidad</th>
                  <th style="width: 20%;">Precio</th>
                  <th style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                {{#items}}
                <tr>
                  <td>{{description}}</td>
                  <td>{{quantity}} {{unit}}</td>
                  <td>${{unitPrice}}</td>
                  <td>${{totalPrice}}</td>
                </tr>
                {{/items}}
              </tbody>
            </table>
            
            <!-- Resumen de costos -->
            <div class="summary-table">
              <div class="summary-row subtotal">
                <span>Subtotal</span>
                <span>${{subtotal}}</span>
              </div>
              {{#tax}}
              <div class="summary-row">
                <span>Impuesto ({{taxRate}}%)</span>
                <span>${{taxAmount}}</span>
              </div>
              {{/tax}}
              {{#discount}}
              <div class="summary-row">
                <span>Descuento ({{discountRate}}%)</span>
                <span>-${{discountAmount}}</span>
              </div>
              {{/discount}}
              <div class="summary-row total">
                <span>Total</span>
                <span>${{total}}</span>
              </div>
            </div>
            
            <!-- Términos y condiciones -->
            <div class="terms-section">
              <h3 class="terms-title">Términos y Condiciones</h3>
              <ul class="terms-list">
                <li>Este estimado tiene validez por 30 días a partir de la fecha de emisión.</li>
                <li>Se requiere un depósito del 50% para iniciar el trabajo.</li>
                <li>El balance restante se pagará al completar el trabajo a satisfacción del cliente.</li>
                <li>Los cambios en el ámbito del proyecto pueden afectar al costo final del mismo.</li>
                <li>Todos los materiales tienen garantía del fabricante. Nuestra garantía de instalación es de 1 año.</li>
                <li>Los tiempos de entrega pueden variar según la disponibilidad de materiales y condiciones climáticas.</li>
              </ul>
            </div>
            
            <!-- Llamada a la acción -->
            <div class="cta">
              <p class="cta-message">¡Gracias por confiar en nuestros servicios!</p>
              <p>Para aprobar este estimado o si tiene alguna pregunta, por favor contáctenos al {{companyPhone}}.</p>
            </div>
            
            <!-- Área de firma -->
            <div class="signature">
              <div class="signature-line">
                Firma del Cliente
              </div>
              <div class="signature-line">
                Fecha
              </div>
            </div>
            
            <!-- Pie de página -->
            <div class="footer">
              <p>{{companyName}} | {{companyAddress}} | {{companyPhone}}</p>
              <p>Email: {{companyEmail}} | Web: {{companyWebsite}}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      isDefault: false
    };

    // Crear plantilla premium
    const luxuryTemplate = {
      userId: 1, // Usuario por defecto del sistema
      name: 'Estimado Premium',
      description: 'Plantilla de estimado con diseño elegante y premium para clientes exclusivos',
      type: 'estimate',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Estimado Premium</title>
          <style>
            /* Estilos globales */
            body {
              font-family: 'Montserrat', 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #2d3748;
              margin: 0;
              padding: 0;
              background-color: #f7f7f7;
            }
            
            .estimate-container {
              max-width: 800px;
              margin: 20px auto;
              padding: 40px;
              background-color: white;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
              border-radius: 8px;
              position: relative;
              overflow: hidden;
            }
            
            .estimate-container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 8px;
              background: linear-gradient(90deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%);
            }
            
            /* Cabecera */
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 25px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .company-info {
              flex: 2;
            }
            
            .company-info h1 {
              margin: 0 0 8px 0;
              color: #1a365d;
              font-weight: 700;
              font-size: 2rem;
            }
            
            .company-info p {
              margin: 0 0 4px 0;
              color: #4a5568;
              font-size: 0.95rem;
            }
            
            .logo img {
              max-width: 150px;
              height: auto;
            }
            
            .estimate-meta {
              flex: 1;
              text-align: right;
              padding: 15px;
              background-color: #f8fafc;
              border-radius: 6px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }
            
            .estimate-meta h2 {
              margin: 0 0 15px 0;
              font-size: 1.6rem;
              color: #1a365d;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              font-weight: 700;
            }
            
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 0.92rem;
            }
            
            .meta-label {
              font-weight: 600;
              color: #4a5568;
            }
            
            /* Información del cliente */
            .client-section {
              display: flex;
              margin-bottom: 40px;
              gap: 30px;
            }
            
            .client-info, .project-info {
              flex: 1;
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 6px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }
            
            .section-title {
              margin: 0 0 15px 0;
              color: #1a365d;
              font-size: 1.2rem;
              font-weight: 600;
              padding-bottom: 8px;
              border-bottom: 3px solid #bee3f8;
            }
            
            .client-info p, .project-info p {
              margin: 0 0 8px 0;
              font-size: 0.95rem;
            }
            
            /* Tabla de desglose */
            .items-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 35px;
              border-radius: 6px;
              overflow: hidden;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }
            
            .items-table th {
              background-color: #ebf8ff;
              padding: 15px 20px;
              text-align: left;
              font-weight: 600;
              color: #2c5282;
              font-size: 0.95rem;
              border-bottom: 2px solid #90cdf4;
            }
            
            .items-table td {
              padding: 15px 20px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 0.95rem;
            }
            
            .items-table tr:last-child td {
              border-bottom: none;
            }
            
            .items-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            
            /* Resumen de precios */
            .summary-table {
              width: 400px;
              margin-left: auto;
              margin-bottom: 40px;
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 6px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              font-size: 0.95rem;
            }
            
            .summary-row.subtotal {
              border-top: 1px solid #e2e8f0;
              border-bottom: 1px solid #e2e8f0;
              padding-top: 15px;
              padding-bottom: 15px;
            }
            
            .summary-row.total {
              font-weight: 700;
              font-size: 1.2rem;
              color: #2c5282;
              padding-top: 15px;
            }
            
            /* Términos y notas */
            .terms-section {
              margin-bottom: 40px;
              padding: 25px;
              background-color: #f8fafc;
              border-radius: 6px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }
            
            .terms-title {
              margin: 0 0 20px 0;
              color: #1a365d;
              font-size: 1.2rem;
              font-weight: 600;
              padding-bottom: 8px;
              border-bottom: 3px solid #bee3f8;
            }
            
            .terms-list {
              margin: 0;
              padding-left: 20px;
            }
            
            .terms-list li {
              margin-bottom: 10px;
              font-size: 0.95rem;
            }
            
            /* Footer */
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #718096;
              font-size: 0.85rem;
            }
            
            .cta {
              text-align: center;
              margin: 40px 0;
              padding: 25px;
              background-color: #ebf8ff;
              border-radius: 6px;
            }
            
            .cta-message {
              font-size: 1.2rem;
              color: #2c5282;
              margin-bottom: 15px;
              font-weight: 600;
            }
            
            .signature {
              margin-top: 50px;
              padding-top: 25px;
              display: flex;
              justify-content: space-between;
            }
            
            .signature-line {
              width: 45%;
              border-top: 1px solid #a0aec0;
              padding-top: 12px;
              font-size: 0.95rem;
              color: #4a5568;
            }
          </style>
        </head>
        <body>
          <div class="estimate-container">
            <!-- Cabecera con logo e información -->
            <div class="header">
              <div class="company-info">
                <h1>{{companyName}}</h1>
                <p>{{companyAddress}}</p>
                <p>{{companyPhone}} | {{companyEmail}}</p>
                <p>Licencia: {{companyLicense}}</p>
              </div>
              <div class="logo">
                <img src="{{logoUrl}}" alt="Logo">
              </div>
              <div class="estimate-meta">
                <h2>Estimado</h2>
                <div class="meta-row">
                  <span class="meta-label">Fecha:</span>
                  <span>{{currentDate}}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Estimado #:</span>
                  <span>{{estimateNumber}}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Válido por:</span>
                  <span>30 días</span>
                </div>
              </div>
            </div>
            
            <!-- Información del cliente y proyecto -->
            <div class="client-section">
              <div class="client-info">
                <h3 class="section-title">Información del Cliente</h3>
                <p><strong>Nombre:</strong> {{clientName}}</p>
                <p><strong>Email:</strong> {{clientEmail}}</p>
                <p><strong>Teléfono:</strong> {{clientPhone}}</p>
                <p><strong>Dirección:</strong> {{clientAddress}}</p>
                <p><strong>Ciudad:</strong> {{clientCity}}, {{clientState}} {{clientZip}}</p>
              </div>
              <div class="project-info">
                <h3 class="section-title">Detalles del Proyecto</h3>
                <p><strong>Tipo:</strong> {{projectType}}</p>
                <p><strong>Subtipo:</strong> {{projectSubtype}}</p>
                <p><strong>Dirección:</strong> {{projectAddress}}</p>
                <p><strong>Dimensiones:</strong> {{projectDimensions}}</p>
                <p><strong>Características adicionales:</strong> {{additionalFeatures}}</p>
              </div>
            </div>
            
            <!-- Tabla de items -->
            <h3 class="section-title">Materiales y Servicios</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 45%;">Descripción</th>
                  <th style="width: 15%;">Cantidad</th>
                  <th style="width: 20%;">Precio</th>
                  <th style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                {{#items}}
                <tr>
                  <td>{{description}}</td>
                  <td>{{quantity}} {{unit}}</td>
                  <td>${{unitPrice}}</td>
                  <td>${{totalPrice}}</td>
                </tr>
                {{/items}}
              </tbody>
            </table>
            
            <!-- Resumen de costos -->
            <div class="summary-table">
              <div class="summary-row subtotal">
                <span>Subtotal</span>
                <span>${{subtotal}}</span>
              </div>
              {{#tax}}
              <div class="summary-row">
                <span>Impuesto ({{taxRate}}%)</span>
                <span>${{taxAmount}}</span>
              </div>
              {{/tax}}
              {{#discount}}
              <div class="summary-row">
                <span>Descuento ({{discountRate}}%)</span>
                <span>-${{discountAmount}}</span>
              </div>
              {{/discount}}
              <div class="summary-row total">
                <span>Total</span>
                <span>${{total}}</span>
              </div>
            </div>
            
            <!-- Términos y condiciones -->
            <div class="terms-section">
              <h3 class="terms-title">Términos y Condiciones</h3>
              <ul class="terms-list">
                <li>Este estimado tiene validez por 30 días a partir de la fecha de emisión.</li>
                <li>Se requiere un depósito del 50% para iniciar el trabajo.</li>
                <li>El balance restante se pagará al completar el trabajo a satisfacción del cliente.</li>
                <li>Los cambios en el ámbito del proyecto pueden afectar al costo final del mismo.</li>
                <li>Todos los materiales tienen garantía del fabricante. Nuestra garantía de instalación es de 2 años.</li>
                <li>Los tiempos de entrega pueden variar según la disponibilidad de materiales y condiciones climáticas.</li>
                <li>Incluye servicios de limpieza y remoción de escombros al finalizar el proyecto.</li>
              </ul>
            </div>
            
            <!-- Llamada a la acción -->
            <div class="cta">
              <p class="cta-message">¡Gracias por confiar en nuestros servicios de calidad premium!</p>
              <p>Para aprobar este estimado o si tiene alguna pregunta, por favor contáctenos al {{companyPhone}}.</p>
            </div>
            
            <!-- Área de firma -->
            <div class="signature">
              <div class="signature-line">
                Firma del Cliente
              </div>
              <div class="signature-line">
                Fecha
              </div>
            </div>
            
            <!-- Pie de página -->
            <div class="footer">
              <p>{{companyName}} | {{companyAddress}} | {{companyPhone}}</p>
              <p>Email: {{companyEmail}} | Web: {{companyWebsite}}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      isDefault: false
    };

    // Insertar las plantillas en la base de datos
    const result = await db.insert(templates).values([professionalTemplate, luxuryTemplate]);
    
    console.log('Plantillas creadas exitosamente.');
    return { success: true, message: 'Plantillas creadas exitosamente' };
    
  } catch (error) {
    console.error('Error al crear plantillas profesionales:', error);
    return { success: false, message: 'Error al crear plantillas profesionales', error };
  }
};

export function setupTemplatesRoutes(router: Router) {
  // Obtener todas las plantillas por tipo
  router.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const type = req.query.type as string;
      const userId = req.query.userId as string;
      
      let templateList;
      if (type && userId) {
        // Para la compatibilidad actual, simplemente obtenemos las plantillas por tipo
        templateList = await storage.getTemplatesByType(userId ? parseInt(userId) : 1, type);
      } else if (type) {
        templateList = await storage.getTemplatesByType(1, type);
      } else if (userId) {
        // Crear consulta personalizada para obtener las plantillas de un usuario
        const templates = await db.select()
          .from(templates)
          .where(eq(templates.userId, parseInt(userId)));
        templateList = templates;
      } else {
        // Obtener todas las plantillas
        const allTemplates = await db.select().from(templates);
        templateList = allTemplates;
      }
      
      res.status(200).json(templateList);
    } catch (error) {
      console.error("Error al obtener plantillas:", error);
      res.status(500).json({ message: "Error al obtener plantillas" });
    }
  });

  // Obtener plantilla por ID
  router.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      
      res.status(200).json(template);
    } catch (error) {
      console.error("Error al obtener plantilla:", error);
      res.status(500).json({ message: "Error al obtener plantilla" });
    }
  });

  // Crear plantilla
  router.post("/api/templates", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        type: z.string(),
        html: z.string(),
        isDefault: z.boolean().optional(),
      });

      const templateData = schema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error al crear plantilla:", error);
      res.status(500).json({ message: "Error al crear plantilla", error: (error as Error).message });
    }
  });

  // Actualizar plantilla
  router.put("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        html: z.string().optional(),
        isDefault: z.boolean().optional(),
      });

      const templateData = schema.parse(req.body);
      const template = await storage.updateTemplate(id, templateData);
      
      if (!template) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      
      res.status(200).json(template);
    } catch (error) {
      console.error("Error al actualizar plantilla:", error);
      res.status(500).json({ message: "Error al actualizar plantilla" });
    }
  });

  // Eliminar plantilla
  router.delete("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      
      res.status(200).json({ message: "Plantilla eliminada exitosamente" });
    } catch (error) {
      console.error("Error al eliminar plantilla:", error);
      res.status(500).json({ message: "Error al eliminar plantilla" });
    }
  });

  // Crear plantillas profesionales
  router.post("/api/templates/create-professional", async (req: Request, res: Response) => {
    try {
      const result = await createProfessionalTemplate();
      res.status(200).json(result);
    } catch (error) {
      console.error("Error al crear plantillas profesionales:", error);
      res.status(500).json({ message: "Error al crear plantillas profesionales", error: (error as Error).message });
    }
  });
}