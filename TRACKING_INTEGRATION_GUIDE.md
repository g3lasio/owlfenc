# Tracking Services Integration Guide

This guide explains how to integrate the email and PDF tracking services into Owl Fenc's existing codebase.

## Services Created

1. **`server/services/emailTrackingService.ts`** - Tracks emails sent via Resend
2. **`server/services/pdfTrackingService.ts`** - Tracks PDFs generated

## Integration Points

### 1. Email Tracking Integration

**Where to integrate:** Anywhere emails are sent via Resend

**Example locations:**
- Invoice email sending
- Estimate email sending  
- Contract email sending
- Dual signature link emails
- Payment link emails

**How to integrate:**

```typescript
import { logEmailSent } from './services/emailTrackingService';

// After successfully sending email via Resend
try {
  const result = await resend.emails.send({
    from: 'noreply@owlfenc.com',
    to: recipientEmail,
    subject: 'Your Invoice',
    html: emailHtml
  });

  // Log the email
  await logEmailSent({
    userId: currentUserId, // Firebase UID
    type: 'invoice',
    recipient: recipientEmail,
    subject: 'Your Invoice',
    status: 'sent',
    metadata: {
      documentId: invoiceId,
      documentNumber: 'INV-2025-001'
    }
  });
} catch (error) {
  // Log failed email
  await logEmailSent({
    userId: currentUserId,
    type: 'invoice',
    recipient: recipientEmail,
    subject: 'Your Invoice',
    status: 'failed',
    errorMessage: error.message
  });
}
```

### 2. PDF Tracking Integration

**Where to integrate:** Anywhere PDFs are generated

**Example locations:**
- Invoice PDF generation
- Contract PDF generation
- Estimate PDF generation
- Permit report PDF generation

**How to integrate:**

```typescript
import { logPdfGenerated } from './services/pdfTrackingService';

// After successfully generating PDF
try {
  const pdfBuffer = await generateInvoicePdf(invoiceData);
  const fileSize = pdfBuffer.length;

  // Log the PDF generation
  await logPdfGenerated({
    userId: currentUserId, // Firebase UID
    type: 'invoice',
    documentId: invoiceId,
    documentNumber: 'INV-2025-001',
    fileSize: fileSize,
    status: 'generated',
    metadata: {
      clientName: 'John Doe',
      projectType: 'construction'
    }
  });

  return pdfBuffer;
} catch (error) {
  // Log failed PDF generation
  await logPdfGenerated({
    userId: currentUserId,
    type: 'invoice',
    documentId: invoiceId,
    documentNumber: 'INV-2025-001',
    status: 'failed',
    errorMessage: error.message
  });
  
  throw error;
}
```

## Files to Modify

Search for these patterns in the codebase to find integration points:

### Email Sending
```bash
grep -r "resend.emails.send" server/
grep -r "@react-email" client/
grep -r "sendEmail" server/
```

### PDF Generation
```bash
grep -r "jsPDF" client/
grep -r "generatePdf" server/
grep -r "pdf-lib" server/
grep -r ".pdf" server/routes.ts
```

## Testing

After integration:

1. Send a test email → Check Firestore `email_logs` collection
2. Generate a test PDF → Check Firestore `pdf_logs` collection
3. Verify Chyrris KAI Usage System shows updated counts

## Firestore Collections Schema

### `email_logs`
```
{
  userId: string (Firebase UID)
  type: 'invoice' | 'estimate' | 'contract' | 'dual_signature' | 'payment_link' | 'other'
  recipient: string (email address)
  subject: string
  sentAt: Timestamp
  status: 'sent' | 'failed'
  errorMessage?: string
  metadata?: {
    documentId?: string
    documentNumber?: string
  }
}
```

### `pdf_logs`
```
{
  userId: string (Firebase UID)
  type: 'invoice' | 'estimate' | 'contract' | 'permit_report' | 'other'
  documentId?: string
  documentNumber?: string
  generatedAt: Timestamp
  fileSize?: number (bytes)
  status: 'generated' | 'failed'
  errorMessage?: string
  metadata?: {
    clientName?: string
    projectType?: string
  }
}
```

## Monitoring

Once integrated, Chyrris KAI will automatically show:
- Emails sent today vs daily limit (500)
- Emails sent this month
- PDFs generated today/month
- Per-user breakdown of emails and PDFs

## Next Steps

1. Find all email sending locations in the codebase
2. Add `logEmailSent()` after each successful/failed email send
3. Find all PDF generation locations
4. Add `logPdfGenerated()` after each successful/failed PDF generation
5. Test thoroughly
6. Push changes to GitHub
