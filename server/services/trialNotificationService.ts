/**
 * TRIAL NOTIFICATION SERVICE
 * Sistema de notificaciones automáticas para trials (día 7, 12, 14)
 * Maneja downgrade automático y notificaciones de retención
 */

import { db, admin } from '../lib/firebase-admin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface TrialNotification {
  uid: string;
  email: string;
  daysTrial: number;
  daysRemaining: number;
  notificationType: 'day_7' | 'day_12' | 'day_14_expiry';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: any;
  error?: string;
}

export interface NotificationResult {
  success: boolean;
  processed: number;
  notificationsSent: number;
  downgrades: number;
  errors: string[];
}

export class TrialNotificationService {
  
  /**
   * Process all trial notifications (called daily by Cloud Scheduler)
   */
  async processTrialNotifications(): Promise<NotificationResult> {
    const startTime = Date.now();
    
    console.log('📧 [TRIAL-NOTIFICATIONS] Starting daily notification processing...');
    
    const result: NotificationResult = {
      success: false,
      processed: 0,
      notificationsSent: 0,
      downgrades: 0,
      errors: []
    };
    
    try {
      // 1. Get all users with active trials
      const entitlementsSnapshot = await db.collection('entitlements')
        .where('trial.isTrialing', '==', true)
        .where('trial.status', '==', 'active')
        .get();
      
      result.processed = entitlementsSnapshot.size;
      
      if (result.processed === 0) {
        console.log('📧 [TRIAL-NOTIFICATIONS] No active trials found');
        result.success = true;
        return result;
      }
      
      console.log(`📊 [TRIAL-NOTIFICATIONS] Processing ${result.processed} active trials`);
      
      // 2. Process users in batches with concurrency control for scalability
      const allUsers = entitlementsSnapshot.docs.map(doc => ({
        uid: doc.id,
        entitlements: doc.data()
      }));
      
      const batches = this.createBatches(allUsers, 25); // Smaller batches for better control
      const concurrencyLimit = 3; // Process 3 batches concurrently
      
      console.log(`📊 [TRIAL-NOTIFICATIONS] Processing ${batches.length} batches with ${concurrencyLimit} concurrent workers`);
      
      for (let i = 0; i < batches.length; i += concurrencyLimit) {
        const concurrentBatches = batches.slice(i, i + concurrencyLimit);
        
        // Process batches concurrently with Promise.allSettled for error isolation
        const batchResults = await Promise.allSettled(
          concurrentBatches.map((batch, index) => 
            this.processBatchWithRetry(batch, i + index + 1)
          )
        );
        
        // Aggregate results and handle errors
        batchResults.forEach((batchResult, index) => {
          if (batchResult.status === 'fulfilled') {
            const batchData = batchResult.value;
            result.notificationsSent += batchData.notificationsSent;
            result.downgrades += batchData.downgrades;
            result.errors.push(...batchData.errors);
          } else {
            console.error(`❌ [TRIAL-NOTIFICATIONS] Batch ${i + index + 1} failed:`, batchResult.reason);
            result.errors.push(`Batch ${i + index + 1} failed: ${batchResult.reason}`);
          }
        });
        
        // Rate limiting between batch groups to avoid overwhelming email/Firestore
        if (i + concurrencyLimit < batches.length) {
          console.log(`⏳ [TRIAL-NOTIFICATIONS] Rate limiting: waiting 2s before next batch group...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }
      
      // 3. Clean up old notifications
      await this.cleanupOldNotifications();
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [TRIAL-NOTIFICATIONS] Completed in ${duration}s: ${result.notificationsSent} notifications, ${result.downgrades} downgrades`);
      
      result.success = result.errors.length === 0;
      return result;
      
    } catch (error) {
      console.error('❌ [TRIAL-NOTIFICATIONS] Fatal error during processing:', error);
      result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      return result;
    }
  }
  
  /**
   * Create batches from user array for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Process batch with retry logic for production reliability
   */
  private async processBatchWithRetry(batch: Array<{ uid: string; entitlements: any }>, batchNumber: number): Promise<{
    notificationsSent: number;
    downgrades: number;
    errors: string[];
  }> {
    const maxRetries = 2;
    let attempt = 0;
    
    while (attempt <= maxRetries) {
      try {
        return await this.processBatch(batch, batchNumber);
      } catch (error) {
        attempt++;
        console.error(`❌ [TRIAL-NOTIFICATIONS] Batch ${batchNumber} attempt ${attempt} failed:`, error);
        
        if (attempt <= maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ [TRIAL-NOTIFICATIONS] Retrying batch ${batchNumber} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`Batch ${batchNumber} failed after ${maxRetries} retries`);
  }
  
  /**
   * Process a batch of users concurrently
   */
  private async processBatch(batch: Array<{ uid: string; entitlements: any }>, batchNumber: number): Promise<{
    notificationsSent: number;
    downgrades: number;
    errors: string[];
  }> {
    console.log(`📤 [TRIAL-NOTIFICATIONS] Processing batch ${batchNumber} with ${batch.length} users`);
    
    const batchResult = {
      notificationsSent: 0,
      downgrades: 0,
      errors: [] as string[]
    };
    
    // Process users in batch concurrently
    const userResults = await Promise.allSettled(
      batch.map(async ({ uid, entitlements }) => {
        try {
          return await this.processUserTrialNotification(uid, entitlements);
        } catch (error) {
          throw new Error(`User ${uid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      })
    );
    
    // Aggregate batch results
    userResults.forEach((userResult, index) => {
      if (userResult.status === 'fulfilled') {
        const userData = userResult.value;
        if (userData.notificationSent) {
          batchResult.notificationsSent++;
        }
        if (userData.downgraded) {
          batchResult.downgrades++;
        }
      } else {
        console.error(`❌ [TRIAL-NOTIFICATIONS] User processing failed:`, userResult.reason);
        batchResult.errors.push(userResult.reason.message || userResult.reason);
      }
    });
    
    console.log(`✅ [TRIAL-NOTIFICATIONS] Batch ${batchNumber} completed: ${batchResult.notificationsSent} notifications, ${batchResult.downgrades} downgrades`);
    return batchResult;
  }
  
  /**
   * Process trial notification for a single user
   */
  private async processUserTrialNotification(uid: string, entitlements: any): Promise<{
    notificationSent: boolean;
    downgraded: boolean;
  }> {
    try {
      const trial = entitlements.trial;
      const trialStartDate = trial.startDate.toDate();
      const now = new Date();
      
      // Calculate days since trial started
      const daysSinceTrial = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 14 - daysSinceTrial);
      
      console.log(`📊 [TRIAL-NOTIFICATIONS] User ${uid}: ${daysSinceTrial} days trial, ${daysRemaining} remaining`);
      
      let notificationSent = false;
      let downgraded = false;
      
      // Determine notification type
      let notificationType: 'day_7' | 'day_12' | 'day_14_expiry' | null = null;
      
      if (daysSinceTrial === 7) {
        notificationType = 'day_7';
      } else if (daysSinceTrial === 12) {
        notificationType = 'day_12';
      } else if (daysSinceTrial >= 14) {
        notificationType = 'day_14_expiry';
      }
      
      if (!notificationType) {
        return { notificationSent: false, downgraded: false };
      }
      
      // Check if notification already sent today
      const notificationId = `${uid}_${notificationType}_${now.toISOString().slice(0, 10)}`;
      const existingNotification = await db.collection('notifications').doc(notificationId).get();
      
      if (existingNotification.exists()) {
        console.log(`📧 [TRIAL-NOTIFICATIONS] Notification already sent: ${notificationId}`);
        return { notificationSent: false, downgraded: false };
      }
      
      // Get user info for email
      const userDoc = await db.collection('users').doc(uid).get();
      const userEmail = userDoc.exists() ? userDoc.data()?.email : null;
      
      if (!userEmail) {
        throw new Error(`No email found for user ${uid}`);
      }
      
      // Create notification record
      const notification: TrialNotification = {
        uid,
        email: userEmail,
        daysTrial: daysSinceTrial,
        daysRemaining,
        notificationType,
        status: 'pending'
      };
      
      // Send notification
      if (notificationType === 'day_14_expiry') {
        // Day 14: Send expiry notification and downgrade
        await this.sendTrialExpiryNotification(userEmail, uid, notification);
        await this.downgradeToFreeplan(uid, entitlements);
        downgraded = true;
      } else {
        // Day 7 or 12: Send reminder notification
        await this.sendTrialReminderNotification(userEmail, uid, notification);
      }
      
      notificationSent = true;
      notification.status = 'sent';
      notification.sentAt = admin.firestore.FieldValue.serverTimestamp();
      
      // Save notification record
      await db.collection('notifications').doc(notificationId).set(notification);
      
      console.log(`✅ [TRIAL-NOTIFICATIONS] Sent ${notificationType} notification to ${userEmail}`);
      
      return { notificationSent, downgraded };
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error processing user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Send trial reminder notification (day 7 or 12)
   */
  private async sendTrialReminderNotification(
    email: string, 
    uid: string, 
    notification: TrialNotification
  ): Promise<void> {
    try {
      const isDay7 = notification.notificationType === 'day_7';
      const subject = isDay7 
        ? '⏰ 7 days into your trial - See what\'s possible!' 
        : '🚀 Only 2 days left in your trial - Don\'t miss out!';
      
      const emailContent = this.generateReminderEmailHTML(notification, isDay7);
      
      const { data, error } = await resend.emails.send({
        from: 'Owl Fence AI <noreply@owlfenc.com>',
        to: [email],
        subject,
        html: emailContent,
        tags: [
          { name: 'type', value: 'trial_reminder' },
          { name: 'day', value: isDay7 ? 'day_7' : 'day_12' },
          { name: 'uid', value: uid }
        ]
      });
      
      if (error) {
        throw new Error(`Email send failed: ${error.message}`);
      }
      
      console.log(`📧 [TRIAL-NOTIFICATIONS] Reminder email sent to ${email}:`, data?.id);
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error sending reminder email:`, error);
      throw error;
    }
  }
  
  /**
   * Send trial expiry notification and offer upgrade
   */
  private async sendTrialExpiryNotification(
    email: string, 
    uid: string, 
    notification: TrialNotification
  ): Promise<void> {
    try {
      const subject = '🎯 Your trial has expired - Upgrade to continue!';
      const emailContent = this.generateExpiryEmailHTML(notification);
      
      const { data, error } = await resend.emails.send({
        from: 'Owl Fence AI <noreply@owlfenc.com>',
        to: [email],
        subject,
        html: emailContent,
        tags: [
          { name: 'type', value: 'trial_expiry' },
          { name: 'day', value: 'day_14' },
          { name: 'uid', value: uid }
        ]
      });
      
      if (error) {
        throw new Error(`Email send failed: ${error.message}`);
      }
      
      console.log(`📧 [TRIAL-NOTIFICATIONS] Expiry email sent to ${email}:`, data?.id);
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error sending expiry email:`, error);
      throw error;
    }
  }
  
  /**
   * Downgrade user to free plan after trial expiry
   */
  private async downgradeToFreeplan(uid: string, currentEntitlements: any): Promise<void> {
    try {
      console.log(`⬇️ [TRIAL-NOTIFICATIONS] Downgrading user ${uid} to free plan`);
      
      // Update entitlements to free plan
      const updatedEntitlements = {
        ...currentEntitlements,
        planId: 1,
        planName: 'primo',
        limits: {
          basicEstimates: 5,
          aiEstimates: 2,
          contracts: 2,
          propertyVerifications: 3,
          permitAdvisor: 3,
          projects: 5,
          invoices: 10,
          paymentTracking: 20,
          deepsearch: 5
        },
        trial: {
          ...currentEntitlements.trial,
          isTrialing: false,
          status: 'expired',
          expiredAt: admin.firestore.FieldValue.serverTimestamp()
        },
        downgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        previousPlan: {
          planId: currentEntitlements.planId,
          planName: currentEntitlements.planName,
          downgradedFrom: new Date().toISOString()
        }
      };
      
      await db.collection('entitlements').doc(uid).update(updatedEntitlements);
      
      // Send downgrade notification email
      await this.sendDowngradeNotificationEmail(uid, currentEntitlements.planName || 'trial');
      
      // Create audit log for downgrade
      await this.createDowngradeAuditLog(uid, currentEntitlements);
      
      console.log(`✅ [TRIAL-NOTIFICATIONS] User ${uid} downgraded to primo plan`);
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error downgrading user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Send downgrade notification email (called automatically on downgrade)
   */
  async sendDowngradeNotificationEmail(uid: string, fromPlan: string = 'trial'): Promise<void> {
    try {
      console.log(`📧 [TRIAL-NOTIFICATIONS] Sending downgrade notification to ${uid}`);
      
      // Get user email
      const userDoc = await db.collection('users').doc(uid).get();
      const userEmail = userDoc.exists() ? userDoc.data()?.email : null;
      
      if (!userEmail) {
        console.warn(`⚠️ [TRIAL-NOTIFICATIONS] No email found for user ${uid} - skipping downgrade notification`);
        return;
      }
      
      const subject = '🔄 Account Plan Changed - Important Information';
      const emailContent = this.generateDowngradeEmailHTML(fromPlan);
      
      const { data, error } = await resend.emails.send({
        from: 'Owl Fence AI <noreply@owlfenc.com>',
        to: [userEmail],
        subject,
        html: emailContent,
        tags: [
          { name: 'type', value: 'plan_downgrade' },
          { name: 'from_plan', value: fromPlan },
          { name: 'to_plan', value: 'primo' },
          { name: 'uid', value: uid }
        ]
      });
      
      if (error) {
        throw new Error(`Downgrade email failed: ${error.message}`);
      }
      
      console.log(`✅ [TRIAL-NOTIFICATIONS] Downgrade email sent to ${userEmail}:`, data?.id);
      
      // Save notification record
      const notificationId = `${uid}_downgrade_${new Date().toISOString().slice(0, 10)}`;
      await db.collection('notifications').doc(notificationId).set({
        uid,
        email: userEmail,
        type: 'plan_downgrade',
        fromPlan,
        toPlan: 'primo',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error sending downgrade email:`, error);
      // Don't throw - downgrade should succeed even if email fails
    }
  }
  
  /**
   * Generate downgrade notification email HTML
   */
  private generateDowngradeEmailHTML(fromPlan: string): string {
    const isTrialDowngrade = fromPlan === 'trial';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .warning-box { background: #fff3e0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .features-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .plan-column { padding: 15px; border-radius: 8px; }
          .free-plan { background: #f5f5f5; border: 2px solid #ddd; }
          .paid-plan { background: #e8f5e8; border: 2px solid #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Plan Update Notification</h1>
            <p>Your account status has been updated</p>
          </div>
          <div class="content">
            <h2>${isTrialDowngrade ? '🔄 Trial Period Completed' : '🔄 Plan Change Notification'}</h2>
            
            ${isTrialDowngrade ? `
              <div class="info-box">
                <p><strong>Your 14-day trial has ended.</strong> Your account has been automatically moved to our free "Primo" plan so you can continue using Owl Fence AI with basic features.</p>
              </div>
            ` : `
              <div class="warning-box">
                <p><strong>Your account has been downgraded</strong> from ${fromPlan.charAt(0).toUpperCase() + fromPlan.slice(1)} to Primo plan due to payment processing issues.</p>
              </div>
            `}
            
            <h3>What's Available on Your Current Plan</h3>
            
            <div class="features-comparison">
              <div class="plan-column free-plan">
                <h4>🆓 Primo Plan (Current)</h4>
                <ul>
                  <li>✅ 5 Basic Estimates</li>
                  <li>✅ 2 AI Estimates</li>
                  <li>✅ 2 Contracts</li>
                  <li>✅ 3 Property Verifications</li>
                  <li>✅ 3 Permit Advisory queries</li>
                  <li>✅ 5 Projects</li>
                  <li>✅ Basic Support</li>
                </ul>
              </div>
              
              <div class="plan-column paid-plan">
                <h4>🚀 Mero Plan (Upgrade)</h4>
                <ul>
                  <li>✅ 50 Basic Estimates</li>
                  <li>✅ 25 AI Estimates</li>
                  <li>✅ 25 Contracts</li>
                  <li>✅ 20 Property Verifications</li>
                  <li>✅ 30 Permit Advisory queries</li>
                  <li>✅ Unlimited Projects</li>
                  <li>✅ Priority Support</li>
                </ul>
              </div>
            </div>
            
            <h3>🎯 Ready to Upgrade?</h3>
            <p>Get back to full productivity with significantly higher limits and priority support. Perfect for contractors managing multiple projects.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.owlfenc.com/billing" class="cta-button">
                Upgrade to Mero - $37/month
              </a>
            </div>
            
            ${isTrialDowngrade ? `
              <div class="info-box">
                <h4>🔥 Limited Time Offer</h4>
                <p><strong>Get 20% off your first month</strong> when you upgrade within 7 days. Use code: <strong>TRIAL20</strong></p>
              </div>
            ` : `
              <div class="warning-box">
                <h4>🔧 Payment Issue?</h4>
                <p>If this downgrade was unexpected, please check your payment method or contact support. We're here to help restore your plan quickly.</p>
              </div>
            `}
            
            <p style="color: #666; font-size: 14px;">
              Your existing projects and data remain safe and accessible. Need help or have questions? Just reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Create audit log for downgrade action
   */
  private async createDowngradeAuditLog(uid: string, previousEntitlements: any): Promise<void> {
    try {
      await db.collection('audit_logs').add({
        uid,
        action: 'plan_downgrade',
        details: {
          fromPlan: {
            planId: previousEntitlements.planId,
            planName: previousEntitlements.planName,
            limits: previousEntitlements.limits
          },
          toPlan: {
            planId: 1,
            planName: 'primo',
            limits: {
              basicEstimates: 5,
              aiEstimates: 2,
              contracts: 2,
              propertyVerifications: 3,
              permitAdvisor: 3,
              projects: 5,
              invoices: 10,
              paymentTracking: 20,
              deepsearch: 5
            }
          },
          reason: previousEntitlements.trial?.isTrialing ? 'trial_expired' : 'payment_failed',
          automated: true
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: null,
        userAgent: null,
        source: 'trial_notification_service'
      });
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error creating downgrade audit log:`, error);
      // Don't throw - audit log failure shouldn't stop downgrade
    }
  }
  
  /**
   * Generate reminder email HTML (day 7 or 12)
   */
  private generateReminderEmailHTML(notification: TrialNotification, isDay7: boolean): string {
    const daysUsed = notification.daysTrial;
    const daysLeft = notification.daysRemaining;
    const urgencyClass = isDay7 ? 'day-7' : 'day-12';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .progress { background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0; }
          .progress-bar { background: ${isDay7 ? '#4CAF50' : '#FF9800'}; height: 100%; width: ${(daysUsed / 14) * 100}%; transition: width 0.3s ease; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .features { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .feature { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
          .${urgencyClass} { border-left-color: ${isDay7 ? '#4CAF50' : '#FF9800'} !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isDay7 ? '🎯 7 Days In!' : '⚡ Final Days!'}</h1>
            <p>${isDay7 ? 'You\'re halfway through your trial' : 'Only 2 days left to experience everything'}</p>
          </div>
          <div class="content">
            <h2>Your Progress</h2>
            <div class="progress">
              <div class="progress-bar"></div>
            </div>
            <p><strong>Day ${daysUsed} of 14</strong> • <strong>${daysLeft} days remaining</strong></p>
            
            <h3>${isDay7 ? 'What\'s Next?' : 'Don\'t Miss Out!'}</h3>
            <p>${isDay7 
              ? 'You\'ve got 7 more days to explore everything Owl Fence AI offers. Here\'s what you can still try:'
              : 'Time is running out! Make sure you\'ve experienced these powerful features:'
            }</p>
            
            <div class="features">
              <div class="feature ${urgencyClass}">
                <strong>🤖 AI Estimates</strong>
                <p>Intelligent project pricing</p>
              </div>
              <div class="feature ${urgencyClass}">
                <strong>📋 Smart Contracts</strong>
                <p>Professional legal docs</p>
              </div>
              <div class="feature ${urgencyClass}">
                <strong>🏠 Property Verification</strong>
                <p>Instant property checks</p>
              </div>
              <div class="feature ${urgencyClass}">
                <strong>📄 Permit Advisor</strong>
                <p>Navigate regulations easily</p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.owlfenc.com/dashboard" class="cta-button">
                ${isDay7 ? 'Continue Exploring' : 'Upgrade Now'}
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              ${isDay7 
                ? 'Need help getting the most out of your trial? Reply to this email.'
                : 'Questions about upgrading? We\'re here to help - just reply to this email.'
              }
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Generate expiry email HTML (day 14)
   */
  private generateExpiryEmailHTML(notification: TrialNotification): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B6B 0%, #EE5A24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .pricing-card { background: #f8f9fa; border: 2px solid #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
          .price { font-size: 32px; font-weight: bold; color: #667eea; }
          .features-list { text-align: left; margin: 15px 0; }
          .features-list li { margin: 5px 0; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Your Trial Has Ended</h1>
            <p>Continue your success with Owl Fence AI</p>
          </div>
          <div class="content">
            <h2>Thanks for trying Owl Fence AI!</h2>
            <p>Your 14-day trial is complete. We hope you experienced the power of AI-driven construction management.</p>
            
            <p><strong>Your account has been moved to our free plan</strong> with basic features. To continue using all the premium tools you've tried, upgrade today!</p>
            
            <div class="pricing-card">
              <h3>🚀 Mero Plan - Most Popular</h3>
              <div class="price">$37<span style="font-size: 16px; color: #666;">/month</span></div>
              <ul class="features-list">
                <li>✅ 50 AI Estimates per month</li>
                <li>✅ 25 Professional Contracts</li>
                <li>✅ 20 Property Verifications</li>
                <li>✅ 30 Permit Advisory queries</li>
                <li>✅ Unlimited Projects & Invoices</li>
                <li>✅ Priority Support</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.owlfenc.com/billing" class="cta-button">
                Upgrade Now - Save 20%
              </a>
            </div>
            
            <h3>🔥 Limited Time Offer</h3>
            <p style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #FF9800;">
              <strong>First month 20% off</strong> when you upgrade within 7 days. Use code: <strong>TRIAL20</strong>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Questions about upgrading? Need help choosing the right plan? Just reply to this email and we'll help you find the perfect fit.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * Clean up old notifications (keep 30 days)
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldNotificationsQuery = db.collection('notifications')
        .where('sentAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .limit(500);
      
      const snapshot = await oldNotificationsQuery.get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`🧹 [TRIAL-NOTIFICATIONS] Cleaned up ${snapshot.docs.length} old notifications`);
      }
      
    } catch (error) {
      console.error('❌ [TRIAL-NOTIFICATIONS] Error cleaning up notifications:', error);
    }
  }
  
  /**
   * Manual notification trigger (for testing)
   */
  async sendManualNotification(uid: string, notificationType: 'day_7' | 'day_12' | 'day_14_expiry'): Promise<boolean> {
    try {
      console.log(`🔧 [TRIAL-NOTIFICATIONS] Manual notification trigger: ${uid} - ${notificationType}`);
      
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      if (!entitlementsDoc.exists()) {
        throw new Error('User entitlements not found');
      }
      
      const result = await this.processUserTrialNotification(uid, entitlementsDoc.data());
      return result.notificationSent;
      
    } catch (error) {
      console.error(`❌ [TRIAL-NOTIFICATIONS] Error in manual notification:`, error);
      return false;
    }
  }
}

export const trialNotificationService = new TrialNotificationService();