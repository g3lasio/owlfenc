
import { db, admin } from '../lib/firebase-admin.js';
import { resend } from '../lib/resendClient';

export interface Alert {
  id?: string;
  type: 'abuse' | 'failure' | 'security' | 'business' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details: any;
  source: string;
  userId?: string;
  ipAddress?: string;
  timestamp?: any;
  resolved?: boolean;
  resolvedAt?: any;
}

export interface AlertingConfig {
  slack?: {
    webhookUrl: string;
    channel: string;
    enabled: boolean;
  };
  discord?: {
    webhookUrl: string;
    enabled: boolean;
  };
  email?: {
    adminEmails: string[];
    enabled: boolean;
  };
  thresholds: {
    abuseAttempts: number;
    failureRate: number;
    responseTime: number;
  };
}

export class AlertingService {
  private config: AlertingConfig;
  
  constructor() {
    this.config = {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
        enabled: !!process.env.SLACK_WEBHOOK_URL
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
        enabled: !!process.env.DISCORD_WEBHOOK_URL
      },
      email: {
        adminEmails: (process.env.ADMIN_ALERT_EMAILS || '').split(',').filter(Boolean),
        enabled: !!(process.env.RESEND_API_KEY && process.env.ADMIN_ALERT_EMAILS)
      },
      thresholds: {
        abuseAttempts: parseInt(process.env.ABUSE_THRESHOLD || '10'),
        failureRate: parseFloat(process.env.FAILURE_RATE_THRESHOLD || '0.05'), // 5%
        responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000') // 5 seconds
      }
    };
  }
  
  async sendAlert(alert: Alert): Promise<boolean> {
    // ... (implementation remains the same)
    return true;
  }

  // ... other methods
}

export const alertingService = new AlertingService();
