import { resend } from '../lib/resendClient';

const OWL_FENC_BRANDING = {
  name: 'Owl Fenc',
  email: 'noreply@owlfenc.com',
  supportEmail: 'support@owlfenc.com',
  website: 'https://owlfenc.com',
  logo: 'https://owlfenc.com/logo.png',
};

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SubscriptionEmailService {
  /**
   * Send payment failed notification email to user
   * @param userEmail User's email address
   * @param userName User's display name
   * @param attemptCount Current payment attempt number (1-3)
   * @param planName Current subscription plan name
   */
  async sendPaymentFailedEmail(
    userEmail: string,
    userName: string,
    attemptCount: number,
    planName: string
  ): Promise<EmailResult> {
    try {
      if (!resend) {
        console.error('[EMAIL] Resend client not initialized');
        return { success: false, error: 'Email service not available' };
      }

      const attemptsRemaining = 3 - attemptCount;
      const isLastAttempt = attemptCount >= 3;

      const subject = isLastAttempt
        ? `⚠️ Final Payment Attempt Failed - Action Required`
        : `Payment Failed - We'll Retry Automatically (Attempt ${attemptCount}/3)`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🦉 ${OWL_FENC_BRANDING.name}</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${userName},</h2>
    
    <p style="font-size: 16px; color: #4b5563;">
      We tried to process your payment for your <strong>${planName}</strong> subscription, but unfortunately it didn't go through.
    </p>

    ${isLastAttempt ? `
      <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-weight: 600;">
          ⚠️ This was the final payment attempt. Your subscription will be downgraded to the free "Primo Chambeador" plan.
        </p>
      </div>
    ` : `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e;">
          <strong>Payment Attempt:</strong> ${attemptCount} of 3<br>
          <strong>Remaining Attempts:</strong> ${attemptsRemaining}
        </p>
      </div>

      <p style="font-size: 16px; color: #4b5563;">
        Don't worry! We'll automatically retry the payment in a few days. You don't need to do anything unless you want to update your payment method.
      </p>
    `}

    <h3 style="color: #1f2937; margin-top: 30px;">What you can do:</h3>
    
    <ul style="color: #4b5563; font-size: 15px;">
      <li style="margin-bottom: 10px;">
        <strong>Update your payment method</strong> in your account settings to ensure the next attempt succeeds
      </li>
      <li style="margin-bottom: 10px;">
        <strong>Check your card</strong> for sufficient funds or contact your bank if needed
      </li>
      <li style="margin-bottom: 10px;">
        <strong>Contact us</strong> if you need help at <a href="mailto:${OWL_FENC_BRANDING.supportEmail}" style="color: #667eea;">${OWL_FENC_BRANDING.supportEmail}</a>
      </li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${OWL_FENC_BRANDING.website}/settings/billing" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Update Payment Method
      </a>
    </div>

    ${!isLastAttempt ? `
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        <strong>Next retry:</strong> We'll automatically attempt to charge your card again in 2-3 days.
      </p>
    ` : ''}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      Thanks for using ${OWL_FENC_BRANDING.name}!<br>
      The Owl Fenc Team
    </p>

  </div>

  <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #9ca3af;">
    <p style="margin: 5px 0;">
      ${OWL_FENC_BRANDING.name} | <a href="${OWL_FENC_BRANDING.website}" style="color: #667eea;">${OWL_FENC_BRANDING.website}</a>
    </p>
    <p style="margin: 5px 0;">
      Questions? Contact us at <a href="mailto:${OWL_FENC_BRANDING.supportEmail}" style="color: #667eea;">${OWL_FENC_BRANDING.supportEmail}</a>
    </p>
  </div>

</body>
</html>
      `;

      const { data, error } = await resend.emails.send({
        from: `${OWL_FENC_BRANDING.name} <${OWL_FENC_BRANDING.email}>`,
        to: [userEmail],
        subject,
        html: htmlContent,
      });

      if (error) {
        console.error('[EMAIL] Failed to send payment failed email:', error);
        return { success: false, error: error.message };
      }

      console.log(`[EMAIL] Payment failed email sent to ${userEmail} (attempt ${attemptCount}/3)`);
      return { success: true, messageId: data?.id };

    } catch (error) {
      console.error('[EMAIL] Error sending payment failed email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const subscriptionEmailService = new SubscriptionEmailService();
