/**
 * Email Contract Route - Send contracts via Resend
 */

import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();

// Initialize Resend if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Send contract via email
router.post('/send-contract', async (req, res) => {
  try {
    if (!resend) {
      return res.status(500).json({ 
        error: 'Email service not configured. Please provide RESEND_API_KEY.' 
      });
    }

    const { contractData, clientEmail, contractHtml, ccEmail } = req.body;

    if (!clientEmail || !contractHtml) {
      return res.status(400).json({ 
        error: 'Missing required fields: clientEmail and contractHtml' 
      });
    }

    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #059669; margin-bottom: 20px;">Construction Contract - Ready for Review</h2>
        
        <p>Dear ${contractData.contractData?.clientName || 'Valued Client'},</p>
        
        <p>Your construction contract has been prepared and is ready for your review. Please find the contract details below:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Contract Summary</h3>
          <p><strong>Project:</strong> ${contractData.contractData?.projectType || 'Construction Project'}</p>
          <p><strong>Location:</strong> ${contractData.contractData?.projectLocation || 'Project Location'}</p>
          <p><strong>Contract Amount:</strong> $${contractData.contractData?.totalAmount || 'Amount'}</p>
          <p><strong>Description:</strong> ${contractData.contractData?.projectDescription || 'Project Description'}</p>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="margin-top: 0; color: #92400e;">Important Notice - California Legal Requirements</h4>
          <p style="margin-bottom: 0; color: #92400e; font-size: 14px;">
            You have the right to cancel this contract within three business days. 
            This contract includes all required California legal notices and compliance measures.
          </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #d1d5db;">
        
        <div style="margin: 30px 0;">
          ${contractHtml}
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #d1d5db;">
        
        <p>Please review this contract carefully. If you have any questions or need clarification on any terms, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        ${contractData.contractData?.contractorName || 'Your Contractor'}</p>
        
        <div style="font-size: 12px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>This email contains a legally binding contract. Please keep this for your records.</p>
        </div>
      </div>
    `;

    // Prepare email recipients
    const recipients = [clientEmail];
    if (ccEmail) {
      recipients.push(ccEmail);
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'contracts@yourdomain.com',
      to: recipients,
      subject: `Construction Contract - ${contractData.contractData?.projectType || 'Project'} - Ready for Review`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    res.json({ 
      success: true, 
      messageId: data?.id,
      message: 'Contract sent successfully via email' 
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Internal server error while sending email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;