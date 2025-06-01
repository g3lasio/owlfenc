import { apiRequest } from '@/lib/queryClient';

export interface SendEstimateEmailParams {
  clientEmail: string;
  clientName: string;
  contractorName: string;
  contractorEmail: string;
  estimateNumber: string;
  estimateHtml: string;
  totalAmount: number;
  projectDescription: string;
}

export const EmailService = {
  async sendEstimateEmail(params: SendEstimateEmailParams): Promise<boolean> {
    try {
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error sending estimate email:', error);
      return false;
    }
  }
};