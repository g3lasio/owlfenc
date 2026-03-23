
import { Resend } from 'resend';

let resend: Resend;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ [RESEND-CONFIG] API Key configured successfully');
} else if (process.env.NODE_ENV !== 'production') {
  // Development mode: use mock email service without excessive logging
  if (process.env.DEBUG_EMAIL === 'true') {
    console.log('📧 [RESEND-DEV] Using mock email service (set RESEND_API_KEY to enable real emails)');
  }
  resend = {
    emails: {
      send: async (payload: any) => {
        if (process.env.DEBUG_EMAIL === 'true') {
          console.log('📧 [MOCK-EMAIL] To:', payload.to);
          console.log('📧 [MOCK-EMAIL] Subject:', payload.subject);
        }
        return { data: { id: 'mock_email_id' }, error: null };
      },
    },
  } as any;
} else {
  throw new Error('RESEND_API_KEY is required in production. Please set the environment variable.');
}

export { resend };
