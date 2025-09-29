/**
 * ANTI-ABUSE SERVICE
 * Rate limiting and abuse prevention for production system
 * Token bucket algorithm with Firestore persistence
 */

import { db, admin } from '../lib/firebase-admin.js';
import { alertingService } from './alertingService.js';

export interface RateLimit {
  uid: string;
  ip: string;
  endpoint: string;
  tokens: number;
  maxTokens: number;
  refillRate: number; // tokens per minute
  lastRefill: any;
  violations: number;
  blocked: boolean;
  blockedUntil?: any;
}

export interface AbuseDetection {
  uid: string;
  ip: string;
  detectionType: 'rate_limit' | 'suspicious_pattern' | 'quota_manipulation';
  details: any;
  severity: 'low' | 'medium' | 'high';
  timestamp: any;
  action: 'warn' | 'throttle' | 'block';
}

export class AntiAbuseService {
  private inMemoryCache = new Map<string, RateLimit>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Check and consume rate limit token
   */
  async checkRateLimit(
    uid: string, 
    ip: string, 
    endpoint: string, 
    customLimits?: { maxTokens?: number, refillRate?: number }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    blocked: boolean;
  }> {
    try {
      const rateLimitKey = `${uid}_${endpoint}`;
      
      // Get rate limit configuration
      const config = this.getRateLimitConfig(endpoint, customLimits);
      
      // Try to get from memory cache first
      let rateLimit = this.inMemoryCache.get(rateLimitKey);
      const now = Date.now();
      
      // If not in cache or cache expired, load from Firestore
      if (!rateLimit || (now - rateLimit.lastRefill.toMillis()) > this.cacheExpiry) {
        rateLimit = await this.loadRateLimit(uid, ip, endpoint, config);
      }
      
      // Check if user is blocked
      if (rateLimit.blocked && rateLimit.blockedUntil && rateLimit.blockedUntil.toDate() > new Date()) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: rateLimit.blockedUntil.toMillis(),
          blocked: true
        };
      }
      
      // Refill tokens based on time passed
      const timePassed = (now - rateLimit.lastRefill.toMillis()) / 60000; // minutes
      const tokensToAdd = Math.floor(timePassed * rateLimit.refillRate);
      
      if (tokensToAdd > 0) {
        rateLimit.tokens = Math.min(rateLimit.maxTokens, rateLimit.tokens + tokensToAdd);
        rateLimit.lastRefill = admin.firestore.Timestamp.fromDate(new Date());
      }
      
      // Check if tokens available
      if (rateLimit.tokens <= 0) {
        // Rate limit exceeded
        await this.handleRateLimitViolation(rateLimit);
        
        // Send abuse alert for repeated violations
        if (rateLimit.violations > 5) {
          await alertingService.sendAbuseAlert(
            uid, 
            ip, 
            rateLimit.violations, 
            endpoint
          );
        }
        
        const nextRefill = rateLimit.lastRefill.toMillis() + (60000 / rateLimit.refillRate);
        return {
          allowed: false,
          remaining: 0,
          resetTime: nextRefill,
          blocked: rateLimit.blocked
        };
      }
      
      // Consume token
      rateLimit.tokens--;
      
      // Update cache and Firestore
      this.inMemoryCache.set(rateLimitKey, rateLimit);
      await this.saveRateLimit(rateLimit);
      
      const nextRefill = rateLimit.lastRefill.toMillis() + (60000 / rateLimit.refillRate);
      return {
        allowed: true,
        remaining: rateLimit.tokens,
        resetTime: nextRefill,
        blocked: false
      };
      
    } catch (error) {
      console.error(`❌ [ANTI-ABUSE] Error checking rate limit:`, error);
      // On error, allow the request but log the issue
      return {
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
        blocked: false
      };
    }
  }
  
  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousActivity(
    uid: string, 
    ip: string, 
    activity: {
      endpoint: string;
      userAgent?: string;
      frequency?: number;
      timePattern?: string;
    }
  ): Promise<boolean> {
    try {
      const suspiciousIndicators = [];
      
      // Check for rapid-fire requests
      if (activity.frequency && activity.frequency > 100) { // More than 100 requests per minute
        suspiciousIndicators.push('high_frequency');
      }
      
      // Check for suspicious user agents
      const suspiciousAgents = ['bot', 'crawler', 'scraper', 'python', 'curl'];
      if (activity.userAgent && suspiciousAgents.some(agent => 
        activity.userAgent!.toLowerCase().includes(agent)
      )) {
        suspiciousIndicators.push('suspicious_user_agent');
      }
      
      // Check for unusual time patterns (e.g., requests at exact intervals)
      if (activity.timePattern === 'exact_intervals') {
        suspiciousIndicators.push('robotic_timing');
      }
      
      // If suspicious indicators found, log and potentially block
      if (suspiciousIndicators.length > 0) {
        await this.logAbuseDetection({
          uid,
          ip,
          detectionType: 'suspicious_pattern',
          details: {
            endpoint: activity.endpoint,
            indicators: suspiciousIndicators,
            userAgent: activity.userAgent,
            frequency: activity.frequency
          },
          severity: suspiciousIndicators.length > 2 ? 'high' : 'medium',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          action: suspiciousIndicators.length > 2 ? 'block' : 'warn'
        });
        
        return suspiciousIndicators.length > 2; // Block if high severity
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ [ANTI-ABUSE] Error detecting suspicious activity:`, error);
      return false;
    }
  }
  
  /**
   * Check for quota manipulation attempts
   */
  async detectQuotaManipulation(
    uid: string, 
    patterns: {
      rapidTrialCreation?: boolean;
      unusualUsageSpikes?: boolean;
      multipleAccountSameIP?: boolean;
    }
  ): Promise<boolean> {
    try {
      const manipulationIndicators = [];
      
      if (patterns.rapidTrialCreation) {
        manipulationIndicators.push('rapid_trial_creation');
      }
      
      if (patterns.unusualUsageSpikes) {
        manipulationIndicators.push('unusual_usage_spikes');
      }
      
      if (patterns.multipleAccountSameIP) {
        manipulationIndicators.push('multiple_accounts_same_ip');
      }
      
      if (manipulationIndicators.length > 0) {
        await this.logAbuseDetection({
          uid,
          ip: 'unknown',
          detectionType: 'quota_manipulation',
          details: {
            indicators: manipulationIndicators,
            patterns
          },
          severity: 'high',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          action: 'block'
        });
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ [ANTI-ABUSE] Error detecting quota manipulation:`, error);
      return false;
    }
  }
  
  /**
   * Get rate limit configuration for endpoint
   */
  private getRateLimitConfig(endpoint: string, customLimits?: any): { maxTokens: number, refillRate: number } {
    const defaultConfig = {
      maxTokens: 100,
      refillRate: 10 // 10 tokens per minute
    };
    
    const endpointConfigs: { [key: string]: { maxTokens: number, refillRate: number } } = {
      'generate-estimate': { maxTokens: 30, refillRate: 5 },
      'generate-ai-estimate': { maxTokens: 10, refillRate: 2 },
      'generate-contract': { maxTokens: 20, refillRate: 3 },
      'property-verification': { maxTokens: 25, refillRate: 4 },
      'permit-advisor': { maxTokens: 20, refillRate: 3 },
      'default': defaultConfig
    };
    
    const config = endpointConfigs[endpoint] || endpointConfigs.default;
    
    return {
      maxTokens: customLimits?.maxTokens || config.maxTokens,
      refillRate: customLimits?.refillRate || config.refillRate
    };
  }
  
  /**
   * Load rate limit from Firestore
   */
  private async loadRateLimit(uid: string, ip: string, endpoint: string, config: any): Promise<RateLimit> {
    const rateLimitId = `${uid}_${endpoint}`;
    const rateLimitDoc = await db.collection('rate_limits').doc(rateLimitId).get();
    
    if (rateLimitDoc.exists()) {
      return rateLimitDoc.data() as RateLimit;
    } else {
      // Create new rate limit
      const newRateLimit: RateLimit = {
        uid,
        ip,
        endpoint,
        tokens: config.maxTokens,
        maxTokens: config.maxTokens,
        refillRate: config.refillRate,
        lastRefill: admin.firestore.FieldValue.serverTimestamp(),
        violations: 0,
        blocked: false
      };
      
      await db.collection('rate_limits').doc(rateLimitId).set(newRateLimit);
      return newRateLimit;
    }
  }
  
  /**
   * Save rate limit to Firestore
   */
  private async saveRateLimit(rateLimit: RateLimit): Promise<void> {
    const rateLimitId = `${rateLimit.uid}_${rateLimit.endpoint}`;
    await db.collection('rate_limits').doc(rateLimitId).update({
      tokens: rateLimit.tokens,
      lastRefill: rateLimit.lastRefill,
      violations: rateLimit.violations,
      blocked: rateLimit.blocked,
      blockedUntil: rateLimit.blockedUntil
    });
  }
  
  /**
   * Handle rate limit violation
   */
  private async handleRateLimitViolation(rateLimit: RateLimit): Promise<void> {
    rateLimit.violations++;
    
    // Progressive penalties
    if (rateLimit.violations >= 5) {
      // Block for 1 hour after 5 violations
      rateLimit.blocked = true;
      rateLimit.blockedUntil = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 60 * 60 * 1000)
      );
    } else if (rateLimit.violations >= 3) {
      // Reduce refill rate after 3 violations
      rateLimit.refillRate = Math.max(1, rateLimit.refillRate * 0.5);
    }
    
    // Log violation
    await this.logAbuseDetection({
      uid: rateLimit.uid,
      ip: rateLimit.ip,
      detectionType: 'rate_limit',
      details: {
        endpoint: rateLimit.endpoint,
        violations: rateLimit.violations,
        blocked: rateLimit.blocked
      },
      severity: rateLimit.violations >= 5 ? 'high' : 'medium',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: rateLimit.blocked ? 'block' : 'throttle'
    });
  }
  
  /**
   * Log abuse detection
   */
  private async logAbuseDetection(detection: AbuseDetection): Promise<void> {
    await db.collection('abuse_logs').add(detection);
    
    console.log(
      `🚨 [ANTI-ABUSE] ${detection.severity.toUpperCase()} - ${detection.detectionType}: User ${detection.uid} - Action: ${detection.action}`
    );
  }
  
  /**
   * Clean up old rate limit data
   */
  async cleanupOldData(): Promise<void> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      // Clean up expired blocks
      const expiredBlocksQuery = db.collection('rate_limits')
        .where('blocked', '==', true)
        .where('blockedUntil', '<', admin.firestore.Timestamp.fromDate(oneDayAgo));
      
      const expiredBlocks = await expiredBlocksQuery.get();
      
      const batch = db.batch();
      expiredBlocks.docs.forEach(doc => {
        batch.update(doc.ref, {
          blocked: false,
          blockedUntil: admin.firestore.FieldValue.delete(),
          violations: 0
        });
      });
      
      await batch.commit();
      
      console.log(`🧹 [ANTI-ABUSE] Cleaned up ${expiredBlocks.docs.length} expired blocks`);
      
    } catch (error) {
      console.error('❌ [ANTI-ABUSE] Error cleaning up old data:', error);
    }
  }
  
  /**
   * Get abuse statistics for admin dashboard
   */
  async getAbuseStatistics(): Promise<{
    activeBlocks: number;
    recentViolations: number;
    topAbusers: any[];
    detectionTypes: { [type: string]: number };
  }> {
    try {
      // Get active blocks
      const activeBlocksSnapshot = await db.collection('rate_limits')
        .where('blocked', '==', true)
        .get();
      
      // Get recent violations (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentViolationsSnapshot = await db.collection('abuse_logs')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .get();
      
      // Aggregate statistics
      const detectionTypes: { [type: string]: number } = {};
      const userViolations: { [uid: string]: number } = {};
      
      recentViolationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        detectionTypes[data.detectionType] = (detectionTypes[data.detectionType] || 0) + 1;
        userViolations[data.uid] = (userViolations[data.uid] || 0) + 1;
      });
      
      // Get top abusers
      const topAbusers = Object.entries(userViolations)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([uid, violations]) => ({ uid, violations }));
      
      return {
        activeBlocks: activeBlocksSnapshot.size,
        recentViolations: recentViolationsSnapshot.size,
        topAbusers,
        detectionTypes
      };
      
    } catch (error) {
      console.error('❌ [ANTI-ABUSE] Error getting abuse statistics:', error);
      return {
        activeBlocks: 0,
        recentViolations: 0,
        topAbusers: [],
        detectionTypes: {}
      };
    }
  }
}

export const antiAbuseService = new AntiAbuseService();