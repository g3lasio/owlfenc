/**
 * ALERTING SERVICE
 * Comprehensive alerting system for abuse, failures, and operational issues
 * Supports Slack, Discord, Email notifications
 */

import { db, admin } from '../lib/firebase-admin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  
  /**
   * Send alert through all configured channels
   */
  async sendAlert(alert: Alert): Promise<boolean> {
    try {
      console.log(`🚨 [ALERTING] Sending ${alert.priority} alert: ${alert.title}`);
      
      // Store alert in database
      const alertDoc = await this.storeAlert(alert);
      
      // Check if alert should be throttled
      if (await this.shouldThrottleAlert(alert)) {
        console.log(`⏳ [ALERTING] Alert throttled: ${alert.title}`);
        return true;
      }
      
      let sent = false;
      
      // Send to Slack
      if (this.config.slack?.enabled) {
        try {
          await this.sendSlackAlert(alert);
          sent = true;
        } catch (error) {
          console.error('❌ [ALERTING] Slack notification failed:', error);
        }
      }
      
      // Send to Discord
      if (this.config.discord?.enabled) {
        try {
          await this.sendDiscordAlert(alert);
          sent = true;
        } catch (error) {
          console.error('❌ [ALERTING] Discord notification failed:', error);
        }
      }
      
      // Send to Email
      if (this.config.email?.enabled) {
        try {
          await this.sendEmailAlert(alert);
          sent = true;
        } catch (error) {
          console.error('❌ [ALERTING] Email notification failed:', error);
        }
      }
      
      // Update alert status
      if (alertDoc && sent) {
        await db.collection('alerts').doc(alertDoc.id).update({
          notificationsSent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return sent;
      
    } catch (error) {
      console.error('❌ [ALERTING] Error sending alert:', error);
      return false;
    }
  }
  
  /**
   * Send abuse alert
   */
  async sendAbuseAlert(
    userId: string, 
    ipAddress: string, 
    attempts: number, 
    feature: string
  ): Promise<void> {
    const alert: Alert = {
      type: 'abuse',
      priority: attempts > this.config.thresholds.abuseAttempts * 2 ? 'critical' : 'high',
      title: `🚨 Abuse Detection: User Exceeding Limits`,
      message: `User ${userId} has made ${attempts} attempts to use ${feature} from IP ${ipAddress}`,
      details: {
        userId,
        ipAddress,
        feature,
        attempts,
        threshold: this.config.thresholds.abuseAttempts,
        timestamp: new Date().toISOString()
      },
      source: 'abuse_detection',
      userId,
      ipAddress
    };
    
    await this.sendAlert(alert);
  }
  
  /**
   * Send endpoint failure alert
   */
  async sendEndpointFailureAlert(
    endpoint: string, 
    errorCount: number, 
    totalRequests: number, 
    timeWindow: string
  ): Promise<void> {
    const failureRate = errorCount / totalRequests;
    
    const alert: Alert = {
      type: 'failure',
      priority: failureRate > 0.1 ? 'critical' : 'high',
      title: `⚠️ High Failure Rate: ${endpoint}`,
      message: `Endpoint ${endpoint} has ${errorCount} failures out of ${totalRequests} requests (${(failureRate * 100).toFixed(1)}%) in the last ${timeWindow}`,
      details: {
        endpoint,
        errorCount,
        totalRequests,
        failureRate,
        timeWindow,
        threshold: this.config.thresholds.failureRate
      },
      source: 'endpoint_monitoring'
    };
    
    await this.sendAlert(alert);
  }
  
  /**
   * Send security alert
   */
  async sendSecurityAlert(
    type: string, 
    description: string, 
    userId?: string, 
    ipAddress?: string
  ): Promise<void> {
    const alert: Alert = {
      type: 'security',
      priority: 'critical',
      title: `🔒 Security Alert: ${type}`,
      message: description,
      details: {
        securityEventType: type,
        description,
        userId,
        ipAddress,
        timestamp: new Date().toISOString()
      },
      source: 'security_monitoring',
      userId,
      ipAddress
    };
    
    await this.sendAlert(alert);
  }
  
  /**
   * Send business metrics alert
   */
  async sendBusinessAlert(
    metric: string, 
    value: number, 
    threshold: number, 
    trend: 'up' | 'down'
  ): Promise<void> {
    const alert: Alert = {
      type: 'business',
      priority: 'medium',
      title: `📊 Business Metric Alert: ${metric}`,
      message: `${metric} is ${value} (threshold: ${threshold}, trending ${trend})`,
      details: {
        metric,
        value,
        threshold,
        trend,
        timestamp: new Date().toISOString()
      },
      source: 'business_monitoring'
    };
    
    await this.sendAlert(alert);
  }
  
  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }
    
    const color = this.getAlertColor(alert.priority);
    const emoji = this.getAlertEmoji(alert.type);
    
    const payload = {
      channel: this.config.slack.channel,
      username: 'Owl Fenc AI Alerts',
      icon_emoji: ':warning:',
      attachments: [
        {
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Priority',
              value: alert.priority.toUpperCase(),
              short: true
            },
            {
              title: 'Type',
              value: alert.type.toUpperCase(),
              short: true
            },
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true
            }
          ],
          footer: 'Owl Fenc AI Alerting System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };
    
    const response = await fetch(this.config.slack.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }
  }
  
  /**
   * Send Discord alert
   */
  private async sendDiscordAlert(alert: Alert): Promise<void> {
    if (!this.config.discord?.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }
    
    const color = this.getDiscordColor(alert.priority);
    const emoji = this.getAlertEmoji(alert.type);
    
    const payload = {
      username: 'Owl Fenc AI Alerts',
      embeds: [
        {
          title: `${emoji} ${alert.title}`,
          description: alert.message,
          color,
          fields: [
            {
              name: 'Priority',
              value: alert.priority.toUpperCase(),
              inline: true
            },
            {
              name: 'Type',
              value: alert.type.toUpperCase(),
              inline: true
            },
            {
              name: 'Source',
              value: alert.source,
              inline: true
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Owl Fenc AI Alerting System'
          }
        }
      ]
    };
    
    const response = await fetch(this.config.discord.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
  }
  
  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.config.email?.adminEmails?.length) {
      throw new Error('Admin emails not configured');
    }
    
    const subject = `${this.getAlertEmoji(alert.type)} [${alert.priority.toUpperCase()}] ${alert.title}`;
    const html = this.generateAlertEmailHTML(alert);
    
    const { data, error } = await resend.emails.send({
      from: 'Owl Fenc AI Alerts <alerts@owlfenc.com>',
      to: this.config.email.adminEmails,
      subject,
      html,
      tags: [
        { name: 'type', value: 'system_alert' },
        { name: 'priority', value: alert.priority },
        { name: 'alert_type', value: alert.type }
      ]
    });
    
    if (error) {
      throw new Error(`Email send failed: ${error.message}`);
    }
    
    console.log(`📧 [ALERTING] Email alert sent:`, data?.id);
  }
  
  /**
   * Generate email HTML for alert
   */
  private generateAlertEmailHTML(alert: Alert): string {
    const color = this.getAlertColor(alert.priority);
    const emoji = this.getAlertEmoji(alert.type);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
          .priority-badge { display: inline-block; background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} System Alert</h1>
            <p>${alert.title}</p>
          </div>
          <div class="content">
            <p><strong>Priority:</strong> <span class="priority-badge">${alert.priority.toUpperCase()}</span></p>
            <p><strong>Type:</strong> ${alert.type.toUpperCase()}</p>
            <p><strong>Source:</strong> ${alert.source}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            
            <h3>Details</h3>
            <p>${alert.message}</p>
            
            ${alert.details ? `
              <div class="details">
                <h4>Additional Information</h4>
                <pre>${JSON.stringify(alert.details, null, 2)}</pre>
              </div>
            ` : ''}
            
            ${alert.userId ? `<p><strong>User ID:</strong> ${alert.userId}</p>` : ''}
            ${alert.ipAddress ? `<p><strong>IP Address:</strong> ${alert.ipAddress}</p>` : ''}
          </div>
          <div class="footer">
            <p>This alert was generated by the Owl Fenc AI monitoring system.</p>
            <p>Please investigate and take appropriate action if necessary.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Store alert in database
   */
  private async storeAlert(alert: Alert): Promise<any> {
    try {
      const alertData = {
        ...alert,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false,
        notificationsSent: false
      };
      
      const docRef = await db.collection('alerts').add(alertData);
      return { id: docRef.id };
      
    } catch (error) {
      console.error('❌ [ALERTING] Error storing alert:', error);
      return null;
    }
  }
  
  /**
   * Check if alert should be throttled (prevent spam)
   */
  private async shouldThrottleAlert(alert: Alert): Promise<boolean> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const recentAlertsQuery = db.collection('alerts')
        .where('type', '==', alert.type)
        .where('title', '==', alert.title)
        .where('timestamp', '>', admin.firestore.Timestamp.fromDate(oneHourAgo))
        .limit(5);
      
      const recentAlerts = await recentAlertsQuery.get();
      
      // Throttle if more than 5 similar alerts in the last hour
      return recentAlerts.size >= 5;
      
    } catch (error) {
      console.error('❌ [ALERTING] Error checking throttle:', error);
      return false;
    }
  }
  
  /**
   * Get alert color based on priority
   */
  private getAlertColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }
  
  /**
   * Get Discord color (decimal) based on priority
   */
  private getDiscordColor(priority: string): number {
    switch (priority) {
      case 'critical': return 0xdc3545;
      case 'high': return 0xfd7e14;
      case 'medium': return 0xffc107;
      case 'low': return 0x28a745;
      default: return 0x6c757d;
    }
  }
  
  /**
   * Get emoji based on alert type
   */
  private getAlertEmoji(type: string): string {
    switch (type) {
      case 'abuse': return '🚨';
      case 'failure': return '⚠️';
      case 'security': return '🔒';
      case 'business': return '📊';
      case 'performance': return '⚡';
      default: return '🔔';
    }
  }
  
  /**
   * Get alerting configuration
   */
  getConfig(): AlertingConfig {
    return this.config;
  }
  
  /**
   * Update alerting configuration
   */
  async updateConfig(newConfig: Partial<AlertingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to database for persistence
    await db.collection('system_config').doc('alerting').set({
      config: this.config,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Get recent alerts for dashboard
   */
  async getRecentAlerts(limit: number = 50): Promise<Alert[]> {
    try {
      const alertsSnapshot = await db.collection('alerts')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Alert[];
      
    } catch (error) {
      console.error('❌ [ALERTING] Error getting recent alerts:', error);
      return [];
    }
  }
  
  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      await db.collection('alerts').doc(alertId).update({
        resolved: true,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ [ALERTING] Error resolving alert:', error);
      return false;
    }
  }
}

export const alertingService = new AlertingService();