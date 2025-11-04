import { Router, Request, Response } from 'express';
import { db, adminAuth } from '../firebase-admin';
import { sendEmail } from '../services/emailService';
import {
  insertSupportTicketSchema,
  insertSupportTicketResponseSchema,
  type SupportTicket,
  type InsertSupportTicket,
} from '@shared/schema';
import { z } from 'zod';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

router.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const ticketData = insertSupportTicketSchema.parse(req.body);
    
    const newTicket: Omit<SupportTicket, 'id'> = {
      ...ticketData,
      userId: req.user.uid,
      userEmail: req.user.email || ticketData.userEmail,
      userName: req.user.displayName || ticketData.userName,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ticketRef = await db.collection('support_tickets').add(newTicket);
    
    const createdTicket: SupportTicket = {
      id: ticketRef.id,
      ...newTicket,
    };

    await sendSupportNotificationEmail(createdTicket);

    res.status(201).json({ 
      success: true, 
      ticket: createdTicket,
      message: 'Support ticket created successfully. We will respond soon!'
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid ticket data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

router.get('/my-tickets', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const ticketsSnapshot = await db.collection('support_tickets')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      resolvedAt: doc.data().resolvedAt?.toDate?.() || doc.data().resolvedAt,
    })) as SupportTicket[];

    res.json({ success: true, tickets });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/ticket/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const ticketDoc = await db.collection('support_tickets').doc(req.params.id).get();

    if (!ticketDoc.exists) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketData = ticketDoc.data();
    
    if (ticketData?.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ticket: SupportTicket = {
      id: ticketDoc.id,
      ...ticketData,
      createdAt: ticketData.createdAt?.toDate?.() || ticketData.createdAt,
      updatedAt: ticketData.updatedAt?.toDate?.() || ticketData.updatedAt,
      resolvedAt: ticketData.resolvedAt?.toDate?.() || ticketData.resolvedAt,
    } as SupportTicket;

    const responsesSnapshot = await db.collection('support_ticket_responses')
      .where('ticketId', '==', req.params.id)
      .orderBy('createdAt', 'asc')
      .get();

    const responses = responsesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    res.json({ success: true, ticket, responses });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.patch('/ticket/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { status } = req.body;
    
    if (!['open', 'in-progress', 'waiting-response', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticketRef = db.collection('support_tickets').doc(req.params.id);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketData = ticketDoc.data();
    
    if (ticketData?.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    await ticketRef.update(updateData);

    res.json({ success: true, message: 'Ticket status updated' });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

router.post('/ticket/:id/response', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const ticketRef = db.collection('support_tickets').doc(req.params.id);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketData = ticketDoc.data();
    
    if (ticketData?.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const responseData = insertSupportTicketResponseSchema.parse({
      ticketId: req.params.id,
      message: req.body.message,
      isStaff: false,
    });

    const newResponse = {
      ...responseData,
      createdAt: new Date(),
    };

    await db.collection('support_ticket_responses').add(newResponse);
    
    await ticketRef.update({
      updatedAt: new Date(),
      status: 'waiting-response',
    });

    res.json({ success: true, message: 'Response added successfully' });

  } catch (error) {
    console.error('Error adding response:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid response data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to add response' });
  }
});

async function sendSupportNotificationEmail(ticket: SupportTicket) {
  try {
    const categoryLabels: Record<string, string> = {
      'billing': '💳 Billing',
      'technical': '🔧 Technical',
      'feature-request': '💡 Feature Request',
      'feedback': '💬 Feedback',
      'how-to': '📖 How-To',
      'urgent': '⚡ Urgent',
    };

    const priorityLabels: Record<string, string> = {
      'low': '🟢 Low',
      'medium': '🟡 Medium',
      'high': '🟠 High',
      'critical': '🔴 Critical',
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
    .ticket-info { background-color: #f0f4ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
    .label { font-weight: bold; color: #667eea; }
    .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin: 5px 5px 5px 0; }
    .badge-category { background-color: #e3f2fd; color: #1976d2; }
    .badge-priority { background-color: #fff3e0; color: #f57c00; }
    .message-box { background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 15px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎫 New Support Ticket - Mervin AI</h2>
    </div>
    <div class="content">
      <div class="ticket-info">
        <p><span class="label">Ticket ID:</span> ${ticket.id}</p>
        <p><span class="label">User:</span> ${ticket.userName} (${ticket.userEmail})</p>
        <p><span class="label">Created:</span> ${new Date(ticket.createdAt).toLocaleString()}</p>
        <div>
          <span class="badge badge-category">${categoryLabels[ticket.category] || ticket.category}</span>
          <span class="badge badge-priority">${priorityLabels[ticket.priority] || ticket.priority}</span>
        </div>
      </div>
      
      <h3 style="color: #667eea;">Subject:</h3>
      <p style="font-size: 18px; font-weight: bold; color: #333;">${ticket.subject}</p>
      
      <h3 style="color: #667eea;">Description:</h3>
      <div class="message-box">
        ${ticket.description.replace(/\n/g, '<br>')}
      </div>
      
      ${ticket.attachmentUrl ? `
      <h3 style="color: #667eea;">Attachment:</h3>
      <p><a href="${ticket.attachmentUrl}" target="_blank" style="color: #667eea;">View Attachment</a></p>
      ` : ''}
      
      <div class="footer">
        <p>This ticket was submitted through the Mervin AI Help & Support Center</p>
        <p>Please respond to the user at <a href="mailto:${ticket.userEmail}">${ticket.userEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const success = await sendEmail({
      to: 'mervin@owlfenc.com',
      from: 'notifications@mervinai.com',
      subject: `[Support Ticket #${ticket.id?.substring(0, 8)}] ${ticket.subject}`,
      html: htmlContent,
      replyTo: ticket.userEmail,
    });

    if (success) {
      console.log(`✅ Support notification sent to mervin@owlfenc.com for ticket ${ticket.id}`);
    } else {
      console.error(`❌ Failed to send support notification for ticket ${ticket.id}`);
    }

  } catch (error) {
    console.error('Error sending support notification email:', error);
  }
}

export default router;
