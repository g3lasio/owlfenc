/**
 * Advanced Email Templates for Digital Contract Signing
 * Professional, responsive templates with enhanced security and branding
 */

export interface EmailTemplateData {
  contractId: string;
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  contractorInfo: {
    name: string;
    company: string;
    email: string;
    phone?: string;
    logo?: string; // Base64 logo
    website?: string;
    license?: string;
  };
  contractDetails: {
    projectType: string;
    description: string;
    totalAmount: number;
    startDate: string;
    completionDate: string;
    location: string;
  };
  securityInfo: {
    accessUrl: string;
    expiryDate: string;
    securityToken: string;
    ipAddress?: string;
    deviceInfo?: string;
  };
  customization: {
    brandColor?: string;
    accentColor?: string;
    logoUrl?: string;
    footerText?: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'contract-signing' | 'signature-confirmation' | 'reminder' | 'completion' | 'verification';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  security: {
    requiresAuth: boolean;
    trackOpens: boolean;
    trackClicks: boolean;
    encryptedLinks: boolean;
  };
}

export class AdvancedEmailTemplatesService {
  private static instance: AdvancedEmailTemplatesService;
  
  // Professional color schemes
  private readonly COLOR_SCHEMES = {
    professional: {
      primary: '#1f2937',
      secondary: '#3b82f6',
      accent: '#10b981',
      background: '#f8fafc',
      text: '#374151'
    },
    construction: {
      primary: '#f59e0b',
      secondary: '#ef4444',
      accent: '#22c55e',
      background: '#fffbeb',
      text: '#78350f'
    },
    legal: {
      primary: '#1e40af',
      secondary: '#dc2626',
      accent: '#059669',
      background: '#eff6ff',
      text: '#1e3a8a'
    },
    modern: {
      primary: '#0f172a',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      background: '#f1f5f9',
      text: '#334155'
    }
  };

  static getInstance(): AdvancedEmailTemplatesService {
    if (!AdvancedEmailTemplatesService.instance) {
      AdvancedEmailTemplatesService.instance = new AdvancedEmailTemplatesService();
    }
    return AdvancedEmailTemplatesService.instance;
  }

  /**
   * Generate contract signing invitation email
   */
  generateContractSigningEmail(data: EmailTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const colors = this.COLOR_SCHEMES.professional;
    const expiryDate = new Date(data.securityInfo.expiryDate).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `📋 Contrato Digital para Firma - ${data.contractDetails.projectType} - ${data.contractorInfo.company}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato para Firma Digital</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${colors.background}; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); padding: 30px; text-align: center; }
        .logo { max-width: 150px; height: auto; margin-bottom: 20px; border-radius: 8px; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: ${colors.text}; margin-bottom: 25px; }
        .project-card { background: ${colors.background}; border-left: 4px solid ${colors.accent}; padding: 25px; margin: 25px 0; border-radius: 8px; }
        .project-title { font-size: 20px; font-weight: 600; color: ${colors.primary}; margin-bottom: 15px; }
        .project-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        .detail-item { padding: 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb; }
        .detail-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
        .detail-value { font-size: 16px; color: ${colors.text}; font-weight: 500; }
        .amount { font-size: 24px; font-weight: 700; color: ${colors.accent}; }
        .cta-section { text-align: center; margin: 40px 0; }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, ${colors.secondary}, ${colors.accent}); 
            color: white; 
            padding: 18px 40px; 
            text-decoration: none; 
            border-radius: 10px; 
            font-weight: 600; 
            font-size: 18px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
            transition: transform 0.2s ease;
        }
        .cta-button:hover { transform: translateY(-2px); }
        .security-info { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0; }
        .security-title { color: #92400e; font-weight: 600; margin-bottom: 10px; }
        .security-details { font-size: 14px; color: #92400e; line-height: 1.6; }
        .process-steps { margin: 30px 0; }
        .step { display: flex; align-items: flex-start; margin-bottom: 20px; }
        .step-number { background: ${colors.secondary}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 15px; flex-shrink: 0; }
        .step-content { flex: 1; }
        .step-title { font-weight: 600; color: ${colors.primary}; margin-bottom: 5px; }
        .step-description { color: ${colors.text}; font-size: 14px; line-height: 1.5; }
        .contractor-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .contractor-header { display: flex; align-items: center; margin-bottom: 15px; }
        .contractor-logo { width: 50px; height: 50px; border-radius: 8px; margin-right: 15px; }
        .contractor-name { font-weight: 600; color: ${colors.primary}; font-size: 18px; }
        .contractor-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: ${colors.text}; }
        .footer { background: ${colors.primary}; color: white; padding: 30px; text-align: center; }
        .footer-links { margin-bottom: 20px; }
        .footer-link { color: rgba(255,255,255,0.8); text-decoration: none; margin: 0 15px; }
        .legal-notice { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-top: 20px; }
        
        @media (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .project-details { grid-template-columns: 1fr !important; }
            .contractor-details { grid-template-columns: 1fr !important; }
            .cta-button { padding: 15px 30px !important; font-size: 16px !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            ${data.contractorInfo.logo ? `<img src="data:image/png;base64,${data.contractorInfo.logo}" alt="${data.contractorInfo.company}" class="logo">` : ''}
            <h1>🏗️ Contrato Listo para Firma</h1>
            <p>Proceso seguro de firma digital</p>
        </div>

        <!-- Main Content -->
        <div class="content">
            <div class="greeting">
                Estimado/a <strong>${data.clientInfo.name}</strong>,
            </div>

            <p style="color: ${colors.text}; line-height: 1.6; font-size: 16px;">
                Su contrato para el proyecto <strong>${data.contractDetails.projectType}</strong> ha sido preparado y está listo para revisión y firma digital. Este documento utiliza tecnología avanzada de firma biométrica para garantizar la máxima seguridad y validez legal.
            </p>

            <!-- Project Information Card -->
            <div class="project-card">
                <div class="project-title">${data.contractDetails.projectType}</div>
                <div class="project-details">
                    <div class="detail-item">
                        <div class="detail-label">Valor Total</div>
                        <div class="detail-value amount">$${data.contractDetails.totalAmount.toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Ubicación</div>
                        <div class="detail-value">${data.contractDetails.location}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Fecha de Inicio</div>
                        <div class="detail-value">${new Date(data.contractDetails.startDate).toLocaleDateString('es-ES')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Finalización</div>
                        <div class="detail-value">${new Date(data.contractDetails.completionDate).toLocaleDateString('es-ES')}</div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div class="detail-label">Descripción del Proyecto</div>
                    <div style="color: ${colors.text}; margin-top: 5px;">${data.contractDetails.description}</div>
                </div>
            </div>

            <!-- Call to Action -->
            <div class="cta-section">
                <a href="${data.securityInfo.accessUrl}" class="cta-button">
                    📋 REVISAR Y FIRMAR CONTRATO
                </a>
                <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
                    Proceso completamente seguro con validación biométrica
                </p>
            </div>

            <!-- Security Information -->
            <div class="security-info">
                <div class="security-title">🔒 Información de Seguridad</div>
                <div class="security-details">
                    <strong>• Enlace único y seguro:</strong> Este enlace es exclusivo para usted y expira automáticamente.<br>
                    <strong>• Fecha de expiración:</strong> ${expiryDate}<br>
                    <strong>• Validación biométrica:</strong> Su firma será validada con tecnología avanzada.<br>
                    <strong>• Trazabilidad completa:</strong> Todo el proceso queda registrado para validez legal.
                </div>
            </div>

            <!-- Process Steps -->
            <div class="process-steps">
                <h3 style="color: ${colors.primary}; margin-bottom: 20px;">📋 Proceso de Firma Digital</h3>
                
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <div class="step-title">Revisión Completa</div>
                        <div class="step-description">Lea todo el contrato. El sistema verifica que haya revisado cada sección.</div>
                    </div>
                </div>
                
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <div class="step-title">Confirmación de Términos</div>
                        <div class="step-description">Confirme que acepta los términos críticos del contrato.</div>
                    </div>
                </div>
                
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <div class="step-title">Firma Biométrica</div>
                        <div class="step-description">Firme usando nuestro canvas digital con validación de autenticidad.</div>
                    </div>
                </div>
                
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <div class="step-title">Confirmación Final</div>
                        <div class="step-description">Reciba confirmación inmediata y copia del contrato firmado.</div>
                    </div>
                </div>
            </div>

            <!-- Contractor Information -->
            <div class="contractor-info">
                <div class="contractor-header">
                    ${data.contractorInfo.logo ? `<img src="data:image/png;base64,${data.contractorInfo.logo}" alt="${data.contractorInfo.company}" class="contractor-logo">` : ''}
                    <div class="contractor-name">${data.contractorInfo.company}</div>
                </div>
                <div class="contractor-details">
                    <div><strong>Contacto:</strong> ${data.contractorInfo.name}</div>
                    <div><strong>Email:</strong> ${data.contractorInfo.email}</div>
                    ${data.contractorInfo.phone ? `<div><strong>Teléfono:</strong> ${data.contractorInfo.phone}</div>` : ''}
                    ${data.contractorInfo.license ? `<div><strong>Licencia:</strong> ${data.contractorInfo.license}</div>` : ''}
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-links">
                <a href="#" class="footer-link">Política de Privacidad</a>
                <a href="#" class="footer-link">Términos de Servicio</a>
                <a href="#" class="footer-link">Soporte</a>
            </div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
                <strong>${data.contractorInfo.company}</strong><br>
                Sistema de Contratos Digitales
            </div>
            
            <div class="legal-notice">
                Este email fue enviado automáticamente como parte del proceso de firma digital. 
                El enlace es único y seguro, válido hasta ${expiryDate}. 
                Si no solicitó este contrato, puede ignorar este mensaje.
                <br><br>
                <strong>ID del Contrato:</strong> ${data.contractId}<br>
                <strong>Token de Seguridad:</strong> ${data.securityInfo.securityToken.substring(0, 8)}...
            </div>
        </div>
    </div>
</body>
</html>`;

    const text = `
CONTRATO PARA FIRMA DIGITAL - ${data.contractorInfo.company}

Estimado/a ${data.clientInfo.name},

Su contrato para el proyecto "${data.contractDetails.projectType}" está listo para firma digital.

DETALLES DEL PROYECTO:
- Tipo: ${data.contractDetails.projectType}  
- Valor: $${data.contractDetails.totalAmount.toLocaleString()}
- Ubicación: ${data.contractDetails.location}
- Inicio: ${new Date(data.contractDetails.startDate).toLocaleDateString('es-ES')}
- Finalización: ${new Date(data.contractDetails.completionDate).toLocaleDateString('es-ES')}

ENLACE SEGURO PARA FIRMAR:
${data.securityInfo.accessUrl}

INFORMACIÓN DE SEGURIDAD:
- Enlace único y personal
- Expira el: ${expiryDate}
- Validación biométrica incluida
- Trazabilidad completa para validez legal

PROCESO:
1. Revisar contrato completo
2. Confirmar términos críticos  
3. Firma digital biométrica
4. Recibir confirmación y copia

CONTACTO DEL CONTRATISTA:
${data.contractorInfo.company}
${data.contractorInfo.name}
${data.contractorInfo.email}
${data.contractorInfo.phone || ''}

ID del Contrato: ${data.contractId}
Token: ${data.securityInfo.securityToken.substring(0, 8)}...

Este enlace es seguro y expira automáticamente para su protección.
`;

    return { subject, html, text };
  }

  /**
   * Generate signature confirmation email
   */
  generateSignatureConfirmationEmail(data: EmailTemplateData): {
    subject: string;
    html: string;
    text: string;
  } {
    const colors = this.COLOR_SCHEMES.construction;
    const signedDate = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = `✅ Contrato Firmado Exitosamente - ${data.contractDetails.projectType}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato Firmado</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
        .success-icon { font-size: 48px; margin-bottom: 15px; }
        .content { padding: 40px 30px; }
        .confirmation-card { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .check-mark { background: #22c55e; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 20px; }
        .next-steps { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 25px; margin: 30px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✅</div>
            <h1>Contrato Firmado Exitosamente</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Su firma digital ha sido validada y registrada</p>
        </div>

        <div class="content">
            <div class="greeting" style="font-size: 18px; margin-bottom: 25px;">
                ¡Felicitaciones <strong>${data.clientInfo.name}</strong>!
            </div>

            <div class="confirmation-card">
                <div class="check-mark">✓</div>
                <h2 style="color: #059669; margin-bottom: 15px;">Firma Completada</h2>
                <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                    Su contrato para <strong>${data.contractDetails.projectType}</strong> ha sido firmado digitalmente y es legalmente válido.
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <strong>Fecha de Firma:</strong> ${signedDate}<br>
                    <strong>Valor del Contrato:</strong> $${data.contractDetails.totalAmount.toLocaleString()}<br>
                    <strong>ID del Contrato:</strong> ${data.contractId}
                </div>
            </div>

            <div class="next-steps">
                <h3 style="color: #1e40af; margin-top: 0;">📋 Próximos Pasos</h3>
                <ul style="color: #374151; line-height: 1.6;">
                    <li>Recibirá una copia del contrato firmado por email</li>
                    <li>${data.contractorInfo.company} iniciará el proyecto según cronograma</li>
                    <li>Se coordinará la fecha de inicio de trabajos</li>
                    <li>Recibirá actualizaciones del progreso del proyecto</li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;

    const text = `
✅ CONTRATO FIRMADO EXITOSAMENTE

¡Felicitaciones ${data.clientInfo.name}!

Su contrato para "${data.contractDetails.projectType}" ha sido firmado digitalmente y es legalmente válido.

DETALLES DE LA FIRMA:
- Fecha: ${signedDate}
- Valor: $${data.contractDetails.totalAmount.toLocaleString()}
- ID: ${data.contractId}

PRÓXIMOS PASOS:
- Recibirá copia del contrato firmado
- ${data.contractorInfo.company} iniciará según cronograma
- Coordinación de fecha de inicio
- Actualizaciones de progreso

Contacto: ${data.contractorInfo.email}
`;

    return { subject, html, text };
  }

  /**
   * Generate contract reminder email
   */
  generateReminderEmail(data: EmailTemplateData, hoursRemaining: number): {
    subject: string;
    html: string;
    text: string;
  } {
    const colors = this.COLOR_SCHEMES.legal;
    const urgencyLevel = hoursRemaining <= 24 ? 'high' : hoursRemaining <= 72 ? 'medium' : 'low';
    
    const subject = `⏰ Recordatorio: Contrato expira en ${hoursRemaining} horas - ${data.contractDetails.projectType}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Contrato</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fef3c7; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 30px; text-align: center; }
        .urgency-${urgencyLevel} { border-left: 4px solid ${urgencyLevel === 'high' ? '#ef4444' : urgencyLevel === 'medium' ? '#f59e0b' : '#22c55e'}; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: white; margin: 0;">⏰ Recordatorio Importante</h1>
            <p style="color: rgba(255,255,255,0.9);">Su contrato expira pronto</p>
        </div>
        <div style="padding: 40px 30px;">
            <div class="urgency-${urgencyLevel}" style="background: #fef3c7; padding: 25px; margin: 30px 0; border-radius: 8px;">
                <h2 style="color: #92400e; margin-top: 0;">Tiempo Restante: ${hoursRemaining} horas</h2>
                <p style="color: #92400e;">Su contrato para <strong>${data.contractDetails.projectType}</strong> expira el ${new Date(data.securityInfo.expiryDate).toLocaleDateString('es-ES')}.</p>
            </div>
            <div style="text-align: center; margin: 40px 0;">
                <a href="${data.securityInfo.accessUrl}" style="background: #ef4444; color: white; padding: 18px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 18px; display: inline-block;">
                    FIRMAR AHORA
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;

    const text = `
⏰ RECORDATORIO IMPORTANTE

Su contrato para "${data.contractDetails.projectType}" expira en ${hoursRemaining} horas.

Fecha de expiración: ${new Date(data.securityInfo.expiryDate).toLocaleDateString('es-ES')}

FIRMAR AHORA: ${data.securityInfo.accessUrl}

Contacto: ${data.contractorInfo.email}
`;

    return { subject, html, text };
  }

  /**
   * Replace variables in template content
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Get color scheme by name
   */
  getColorScheme(schemeName: keyof typeof this.COLOR_SCHEMES) {
    return this.COLOR_SCHEMES[schemeName] || this.COLOR_SCHEMES.professional;
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): EmailTemplate[] {
    return [
      {
        id: 'contract-signing',
        name: 'Contract Signing Invitation',
        type: 'contract-signing',
        subject: 'Contrato para Firma Digital - {{projectType}}',
        htmlContent: 'Professional HTML template for contract signing',
        textContent: 'Plain text version for contract signing',
        variables: ['clientName', 'projectType', 'totalAmount', 'accessUrl', 'expiryDate'],
        security: {
          requiresAuth: true,
          trackOpens: true,
          trackClicks: true,
          encryptedLinks: true
        }
      },
      {
        id: 'signature-confirmation',
        name: 'Signature Confirmation',
        type: 'signature-confirmation',
        subject: 'Contrato Firmado Exitosamente - {{projectType}}',
        htmlContent: 'Confirmation template for completed signatures',
        textContent: 'Plain text confirmation',
        variables: ['clientName', 'projectType', 'contractId', 'signedDate'],
        security: {
          requiresAuth: false,
          trackOpens: true,
          trackClicks: false,
          encryptedLinks: false
        }
      },
      {
        id: 'contract-reminder',
        name: 'Contract Expiry Reminder',
        type: 'reminder',
        subject: 'Recordatorio: Contrato expira pronto - {{projectType}}',
        htmlContent: 'Reminder template for contract expiration',
        textContent: 'Plain text reminder',
        variables: ['clientName', 'projectType', 'hoursRemaining', 'accessUrl'],
        security: {
          requiresAuth: true,
          trackOpens: true,
          trackClicks: true,
          encryptedLinks: true
        }
      }
    ];
  }
}

// Export singleton instance
export const advancedEmailTemplates = AdvancedEmailTemplatesService.getInstance();