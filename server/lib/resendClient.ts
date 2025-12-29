
import { Resend } from 'resend';

let resend: Resend;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ RESEND_API_KEY no está configurada. Los correos no se enviarán en modo de desarrollo.');
  resend = {
    emails: {
      send: async (payload: any) => {
        console.log('--- MOCK EMAIL (Centralized Client) ---');
        console.log('To:', payload.to);
        console.log('Subject:', payload.subject);
        console.log('--- END MOCK EMAIL ---');
        return { data: { id: 'mock_email_id' }, error: null };
      },
    },
  } as any;
} else {
  throw new Error('RESEND_API_KEY es requerida en producción.');
}

export { resend };

