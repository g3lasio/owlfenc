/**
 * SUBSCRIPTION EMAIL SERVICE
 * Sistema de emails transaccionales para suscripciones
 * Incluye: Bienvenida, Confirmación Trial, Upgrade, Recordatorios
 * 🦉 Branding oficial de Owl Fenc
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const OWL_FENC_BRANDING = {
  logo: 'https://i.postimg.cc/8zcM3ZC9/White-logo-no-background.png',
  primaryColor: '#1a365d',
  accentColor: '#00d4ff',
  successColor: '#10b981',
  warningColor: '#f59e0b',
  gradientStart: '#4ECDC4',
  gradientEnd: '#44A08D',
  fromEmail: 'Owl Fenc <noreply@owlfenc.com>',
  supportEmail: 'support@owlfenc.com',
  appUrl: 'https://owl-fenc-ai-platform.replit.app',
  companyName: 'Owl Fenc',
  tagline: 'Tu Partner Inteligente para Contratistas'
};

interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export class SubscriptionEmailService {

  /**
   * Genera el header común para todos los emails
   */
  private generateEmailHeader(title: string, subtitle?: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&display=swap');
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; }
          h1, h2, .brand-title { font-family: 'Quantico', sans-serif; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                
                <!-- Header con Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${OWL_FENC_BRANDING.primaryColor} 0%, #2d3748 100%); padding: 40px 40px 30px; text-align: center;">
                    <img src="${OWL_FENC_BRANDING.logo}" alt="Owl Fenc" style="max-width: 180px; height: auto; margin-bottom: 20px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; font-family: 'Quantico', sans-serif;">${title}</h1>
                    ${subtitle ? `<p style="margin: 10px 0 0; color: ${OWL_FENC_BRANDING.accentColor}; font-size: 16px;">${subtitle}</p>` : ''}
                  </td>
                </tr>
    `;
  }

  /**
   * Genera el footer común para todos los emails
   */
  private generateEmailFooter(): string {
    const year = new Date().getFullYear();
    return `
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px 40px; text-align: center;">
                    <img src="${OWL_FENC_BRANDING.logo}" alt="Owl Fenc" style="max-width: 100px; height: auto; margin-bottom: 15px; opacity: 0.8;">
                    <p style="margin: 0 0 10px; color: #9ca3af; font-size: 14px;">
                      ${OWL_FENC_BRANDING.tagline}
                    </p>
                    <p style="margin: 0 0 15px; color: #6b7280; font-size: 12px;">
                      📧 ${OWL_FENC_BRANDING.supportEmail}
                    </p>
                    <div style="border-top: 1px solid #374151; padding-top: 15px; margin-top: 15px;">
                      <p style="margin: 0; color: #4b5563; font-size: 11px;">
                        © ${year} ${OWL_FENC_BRANDING.companyName}. Todos los derechos reservados.
                      </p>
                      <p style="margin: 5px 0 0; color: #4b5563; font-size: 11px;">
                        Este email fue enviado porque tienes una cuenta en Owl Fenc.
                      </p>
                    </div>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Genera un botón CTA estilizado
   */
  private generateCTAButton(text: string, url: string, color: string = OWL_FENC_BRANDING.accentColor): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px auto;">
        <tr>
          <td style="border-radius: 30px; background: linear-gradient(135deg, ${color} 0%, ${this.adjustColor(color, -20)} 100%);">
            <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; font-family: 'Quantico', sans-serif;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Ajusta la luminosidad de un color hex
   */
  private adjustColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  /**
   * 🎉 EMAIL DE BIENVENIDA - Usuario nuevo registrado
   */
  async sendWelcomeEmail(params: {
    email: string;
    userName?: string;
  }): Promise<EmailResult> {
    try {
      const { email, userName } = params;
      const displayName = userName || email.split('@')[0];

      console.log(`📧 [SUBSCRIPTION-EMAIL] Sending welcome email to: ${email}`);

      const html = `
        ${this.generateEmailHeader('¡Bienvenido a Owl Fenc!', 'Tu cuenta ha sido creada exitosamente')}
        
        <!-- Content -->
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">
              ¡Hola, ${displayName}! 👋
            </h2>
            
            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
              Gracias por unirte a <strong>Owl Fenc</strong>, la plataforma inteligente diseñada 
              exclusivamente para contratistas profesionales como tú.
            </p>
            
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid ${OWL_FENC_BRANDING.successColor};">
              <h3 style="margin: 0 0 15px; color: #065f46; font-size: 18px;">🚀 ¿Qué puedes hacer ahora?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #047857;">
                <li style="margin-bottom: 10px;">Crear estimados profesionales en minutos</li>
                <li style="margin-bottom: 10px;">Generar contratos legales con IA</li>
                <li style="margin-bottom: 10px;">Gestionar tus proyectos y clientes</li>
                <li style="margin-bottom: 10px;">Recibir pagos de forma segura</li>
              </ul>
            </div>
            
            <div style="background: #fffbeb; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid ${OWL_FENC_BRANDING.warningColor};">
              <h3 style="margin: 0 0 10px; color: #92400e; font-size: 16px;">🎁 Consejo Pro</h3>
              <p style="margin: 0; color: #b45309; font-size: 14px;">
                ¡Activa tu <strong>Free Trial de 14 días</strong> para desbloquear todas las funciones 
                premium sin costo alguno!
              </p>
            </div>
            
            ${this.generateCTAButton('Explorar Mi Dashboard', `${OWL_FENC_BRANDING.appUrl}/dashboard`, OWL_FENC_BRANDING.successColor)}
            
            <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
              ¿Tienes preguntas? Responde a este email o contacta a nuestro equipo de soporte.
            </p>
          </td>
        </tr>
        
        ${this.generateEmailFooter()}
      `;

      const { data, error } = await resend.emails.send({
        from: OWL_FENC_BRANDING.fromEmail,
        to: [email],
        subject: '🦉 ¡Bienvenido a Owl Fenc! Tu cuenta está lista',
        html,
        tags: [
          { name: 'type', value: 'welcome' },
          { name: 'category', value: 'onboarding' }
        ]
      });

      if (error) {
        console.error('❌ [SUBSCRIPTION-EMAIL] Welcome email failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [SUBSCRIPTION-EMAIL] Welcome email sent: ${data?.id}`);
      return { success: true, emailId: data?.id };

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-EMAIL] Error sending welcome email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 🎁 EMAIL DE FREE TRIAL ACTIVADO
   */
  async sendTrialActivatedEmail(params: {
    email: string;
    userName?: string;
    trialEndDate: Date;
  }): Promise<EmailResult> {
    try {
      const { email, userName, trialEndDate } = params;
      const displayName = userName || email.split('@')[0];
      const formattedDate = trialEndDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      console.log(`📧 [SUBSCRIPTION-EMAIL] Sending trial activated email to: ${email}`);

      const html = `
        ${this.generateEmailHeader('🎉 ¡Free Trial Activado!', '14 días de acceso ilimitado')}
        
        <!-- Content -->
        <tr>
          <td style="padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="display: inline-block; background: linear-gradient(135deg, ${OWL_FENC_BRANDING.gradientStart} 0%, ${OWL_FENC_BRANDING.gradientEnd} 100%); color: white; padding: 12px 25px; border-radius: 30px; font-size: 18px; font-weight: 700;">
                🎁 TRIAL PREMIUM ACTIVO
              </span>
            </div>
            
            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px; text-align: center;">
              ¡Felicidades, ${displayName}!
            </h2>
            
            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
              Tu Free Trial de <strong>14 días</strong> está ahora activo. Tienes acceso completo 
              a todas las funciones premium de Owl Fenc.
            </p>
            
            <div style="background: #f0f9ff; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; border: 2px solid ${OWL_FENC_BRANDING.accentColor};">
              <p style="margin: 0 0 5px; color: #0369a1; font-size: 14px;">Tu trial expira el:</p>
              <p style="margin: 0; color: #0c4a6e; font-size: 20px; font-weight: 700;">${formattedDate}</p>
            </div>
            
            <h3 style="margin: 30px 0 20px; color: #1a1a1a; font-size: 18px;">✨ Funciones desbloqueadas:</h3>
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td width="50%" style="vertical-align: top; padding-right: 10px;">
                  <div style="background: #f8fafc; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">📝 <strong>Estimados Ilimitados</strong></p>
                  </div>
                  <div style="background: #f8fafc; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">⚖️ <strong>Contratos con IA</strong></p>
                  </div>
                  <div style="background: #f8fafc; border-radius: 10px; padding: 15px;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">🔍 <strong>DeepSearch Premium</strong></p>
                  </div>
                </td>
                <td width="50%" style="vertical-align: top; padding-left: 10px;">
                  <div style="background: #f8fafc; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">💳 <strong>Facturación Integrada</strong></p>
                  </div>
                  <div style="background: #f8fafc; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">📊 <strong>Gestión de Proyectos</strong></p>
                  </div>
                  <div style="background: #f8fafc; border-radius: 10px; padding: 15px;">
                    <p style="margin: 0; color: #334155; font-size: 14px;">🏛️ <strong>Asesor de Permisos</strong></p>
                  </div>
                </td>
              </tr>
            </table>
            
            ${this.generateCTAButton('Comenzar a Usar Owl Fenc', `${OWL_FENC_BRANDING.appUrl}/dashboard`, OWL_FENC_BRANDING.gradientStart)}
            
            <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
              Te enviaremos recordatorios antes de que expire tu trial.
            </p>
          </td>
        </tr>
        
        ${this.generateEmailFooter()}
      `;

      const { data, error } = await resend.emails.send({
        from: OWL_FENC_BRANDING.fromEmail,
        to: [email],
        subject: '🎁 ¡Tu Free Trial de 14 días está activo!',
        html,
        tags: [
          { name: 'type', value: 'trial_activated' },
          { name: 'category', value: 'subscription' }
        ]
      });

      if (error) {
        console.error('❌ [SUBSCRIPTION-EMAIL] Trial activated email failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [SUBSCRIPTION-EMAIL] Trial activated email sent: ${data?.id}`);
      return { success: true, emailId: data?.id };

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-EMAIL] Error sending trial activated email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 🎊 EMAIL DE SUSCRIPCIÓN CONFIRMADA / UPGRADE
   */
  async sendSubscriptionConfirmedEmail(params: {
    email: string;
    userName?: string;
    planName: string;
    planPrice: number;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: Date;
    isUpgrade?: boolean;
  }): Promise<EmailResult> {
    try {
      const { email, userName, planName, planPrice, billingCycle, nextBillingDate, isUpgrade } = params;
      const displayName = userName || email.split('@')[0];
      const formattedPrice = `$${(planPrice / 100).toFixed(2)}`;
      const cycleText = billingCycle === 'yearly' ? 'año' : 'mes';
      const formattedNextDate = nextBillingDate.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      console.log(`📧 [SUBSCRIPTION-EMAIL] Sending subscription confirmed email to: ${email}`);

      const title = isUpgrade ? '🚀 ¡Upgrade Exitoso!' : '🎊 ¡Suscripción Activada!';
      const subtitle = isUpgrade ? `Bienvenido al plan ${planName}` : `Ahora eres miembro ${planName}`;

      const html = `
        ${this.generateEmailHeader(title, subtitle)}
        
        <!-- Content -->
        <tr>
          <td style="padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="display: inline-block; font-size: 60px;">🎉</span>
            </div>
            
            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px; text-align: center;">
              ¡Gracias, ${displayName}!
            </h2>
            
            <p style="margin: 0 0 25px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
              ${isUpgrade 
                ? `Has actualizado exitosamente tu cuenta al plan <strong>${planName}</strong>.`
                : `Tu suscripción al plan <strong>${planName}</strong> ha sido activada correctamente.`
              }
            </p>
            
            <!-- Plan Details Card -->
            <div style="background: linear-gradient(135deg, ${OWL_FENC_BRANDING.primaryColor} 0%, #2d3748 100%); border-radius: 16px; padding: 30px; margin: 25px 0; color: white;">
              <h3 style="margin: 0 0 20px; color: ${OWL_FENC_BRANDING.accentColor}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Detalles de tu Plan</h3>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #9ca3af;">Plan:</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">
                    <strong style="color: white;">${planName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #9ca3af;">Precio:</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">
                    <strong style="color: ${OWL_FENC_BRANDING.successColor};">${formattedPrice}/${cycleText}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <span style="color: #9ca3af;">Próximo cobro:</span>
                  </td>
                  <td style="padding: 10px 0; text-align: right;">
                    <strong style="color: white;">${formattedNextDate}</strong>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                ✅ Tu recibo de pago ha sido enviado a tu email.
              </p>
            </div>
            
            ${this.generateCTAButton('Ir a Mi Dashboard', `${OWL_FENC_BRANDING.appUrl}/dashboard`, OWL_FENC_BRANDING.successColor)}
            
            <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
              Puedes gestionar tu suscripción en cualquier momento desde tu perfil.
            </p>
          </td>
        </tr>
        
        ${this.generateEmailFooter()}
      `;

      const subject = isUpgrade 
        ? `🚀 ¡Upgrade a ${planName} completado!`
        : `🎊 ¡Bienvenido al plan ${planName}!`;

      const { data, error } = await resend.emails.send({
        from: OWL_FENC_BRANDING.fromEmail,
        to: [email],
        subject,
        html,
        tags: [
          { name: 'type', value: isUpgrade ? 'upgrade_confirmed' : 'subscription_confirmed' },
          { name: 'plan', value: planName.toLowerCase().replace(/\s+/g, '_') },
          { name: 'category', value: 'subscription' }
        ]
      });

      if (error) {
        console.error('❌ [SUBSCRIPTION-EMAIL] Subscription confirmed email failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [SUBSCRIPTION-EMAIL] Subscription confirmed email sent: ${data?.id}`);
      return { success: true, emailId: data?.id };

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-EMAIL] Error sending subscription confirmed email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * ⏰ EMAIL DE RECORDATORIO DE TRIAL (7 días restantes)
   */
  async sendTrialReminder7DaysEmail(params: {
    email: string;
    userName?: string;
    trialEndDate: Date;
  }): Promise<EmailResult> {
    try {
      const { email, userName, trialEndDate } = params;
      const displayName = userName || email.split('@')[0];
      const formattedDate = trialEndDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      console.log(`📧 [SUBSCRIPTION-EMAIL] Sending 7-day reminder to: ${email}`);

      const html = `
        ${this.generateEmailHeader('⏰ Quedan 7 días de tu Trial', 'No pierdas el acceso a las funciones premium')}
        
        <!-- Content -->
        <tr>
          <td style="padding: 40px;">
            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">
              Hola ${displayName},
            </h2>
            
            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
              Tu Free Trial de Owl Fenc expira en <strong>7 días</strong>. 
              Has estado aprovechando las funciones premium, ¡no dejes que se acaben!
            </p>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; border: 2px solid ${OWL_FENC_BRANDING.warningColor};">
              <p style="margin: 0 0 5px; color: #92400e; font-size: 14px;">Tu trial termina el:</p>
              <p style="margin: 0; color: #78350f; font-size: 20px; font-weight: 700;">${formattedDate}</p>
              <div style="margin-top: 15px; display: inline-block; background: #92400e; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                ⏳ 7 días restantes
              </div>
            </div>
            
            <h3 style="margin: 30px 0 15px; color: #1a1a1a; font-size: 16px;">Lo que perderás si no actualizas:</h3>
            
            <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 1.8;">
              <li>❌ Estimados ilimitados con IA</li>
              <li>❌ Generación de contratos legales</li>
              <li>❌ DeepSearch para investigación de mercado</li>
              <li>❌ Sistema de facturación integrado</li>
              <li>❌ Asesor de permisos municipal</li>
            </ul>
            
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px; color: #065f46; font-size: 16px; font-weight: 600;">
                🎯 Oferta especial para ti
              </p>
              <p style="margin: 0; color: #047857; font-size: 14px;">
                Actualiza antes de que expire tu trial y obtén <strong>20% de descuento</strong> en tu primer mes.
              </p>
            </div>
            
            ${this.generateCTAButton('Actualizar Mi Plan Ahora', `${OWL_FENC_BRANDING.appUrl}/subscription`, OWL_FENC_BRANDING.successColor)}
            
          </td>
        </tr>
        
        ${this.generateEmailFooter()}
      `;

      const { data, error } = await resend.emails.send({
        from: OWL_FENC_BRANDING.fromEmail,
        to: [email],
        subject: '⏰ Quedan 7 días de tu Free Trial - ¡No pierdas acceso!',
        html,
        tags: [
          { name: 'type', value: 'trial_reminder_7_days' },
          { name: 'category', value: 'retention' }
        ]
      });

      if (error) {
        console.error('❌ [SUBSCRIPTION-EMAIL] 7-day reminder failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [SUBSCRIPTION-EMAIL] 7-day reminder sent: ${data?.id}`);
      return { success: true, emailId: data?.id };

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-EMAIL] Error sending 7-day reminder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 🚨 EMAIL DE RECORDATORIO DE TRIAL (3 días restantes)
   */
  async sendTrialReminder3DaysEmail(params: {
    email: string;
    userName?: string;
    trialEndDate: Date;
  }): Promise<EmailResult> {
    try {
      const { email, userName, trialEndDate } = params;
      const displayName = userName || email.split('@')[0];
      const formattedDate = trialEndDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      console.log(`📧 [SUBSCRIPTION-EMAIL] Sending 3-day reminder to: ${email}`);

      const html = `
        ${this.generateEmailHeader('🚨 ¡Solo 3 días restantes!', 'Tu Free Trial está por terminar')}
        
        <!-- Content -->
        <tr>
          <td style="padding: 40px;">
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="display: inline-block; background: #dc2626; color: white; padding: 10px 25px; border-radius: 25px; font-size: 16px; font-weight: 700; animation: pulse 2s infinite;">
                ⚠️ URGENTE
              </span>
            </div>
            
            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px; text-align: center;">
              ${displayName}, tu trial termina pronto
            </h2>
            
            <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
              En solo <strong>3 días</strong> perderás acceso a todas las funciones premium 
              que has estado usando para hacer crecer tu negocio.
            </p>
            
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; border: 2px solid #dc2626;">
              <p style="margin: 0 0 10px; color: #991b1b; font-size: 14px;">⏰ Tu trial expira:</p>
              <p style="margin: 0; color: #7f1d1d; font-size: 22px; font-weight: 700;">${formattedDate}</p>
              <div style="margin-top: 15px;">
                <span style="display: inline-block; background: #dc2626; color: white; padding: 10px 25px; border-radius: 25px; font-size: 18px; font-weight: 700;">
                  3 DÍAS
                </span>
              </div>
            </div>
            
            <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 25px 0; border: 2px solid #22c55e;">
              <h3 style="margin: 0 0 15px; color: #166534; font-size: 18px; text-align: center;">
                💎 Oferta de Última Oportunidad
              </h3>
              <p style="margin: 0; color: #15803d; font-size: 16px; text-align: center;">
                Actualiza AHORA y obtén <strong style="font-size: 22px;">25% OFF</strong> en tu primer mes
              </p>
              <p style="margin: 10px 0 0; color: #166534; font-size: 13px; text-align: center;">
                Usa el código: <strong style="background: #dcfce7; padding: 3px 8px; border-radius: 4px;">LAST3DAYS</strong>
              </p>
            </div>
            
            ${this.generateCTAButton('🔒 Mantener Mi Acceso Premium', `${OWL_FENC_BRANDING.appUrl}/subscription`, '#dc2626')}
            
            <p style="margin: 25px 0 0; color: #6b7280; font-size: 13px; text-align: center;">
              Después de que expire tu trial, volverás al plan gratuito con funciones limitadas.
            </p>
          </td>
        </tr>
        
        ${this.generateEmailFooter()}
      `;

      const { data, error } = await resend.emails.send({
        from: OWL_FENC_BRANDING.fromEmail,
        to: [email],
        subject: '🚨 ¡URGENTE! Solo 3 días para tu Free Trial',
        html,
        tags: [
          { name: 'type', value: 'trial_reminder_3_days' },
          { name: 'category', value: 'retention' },
          { name: 'urgency', value: 'high' }
        ]
      });

      if (error) {
        console.error('❌ [SUBSCRIPTION-EMAIL] 3-day reminder failed:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ [SUBSCRIPTION-EMAIL] 3-day reminder sent: ${data?.id}`);
      return { success: true, emailId: data?.id };

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-EMAIL] Error sending 3-day reminder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const subscriptionEmailService = new SubscriptionEmailService();
