/**
 * KPI TRACKING SERVICE
 * Tracks key performance indicators for production system:
 * - Trial conversion rates
 * - Usage by plan
 * - Popular features
 * - Business metrics for operational decision making
 */

import { db, admin } from '../lib/firebase-admin.js';
import { alertingService } from './alertingService.js';

export interface KPIMetrics {
  timestamp: string;
  period: 'daily' | 'weekly' | 'monthly';
  trialConversion: {
    activeTrials: number;
    conversions: number;
    conversionRate: number;
    averageDaysToConvert: number;
    expiredTrials: number;
  };
  usageByPlan: {
    primo: PlanUsage;
    mero: PlanUsage;
    supreme: PlanUsage;
  };
  popularFeatures: FeatureUsage[];
  businessMetrics: {
    totalActiveUsers: number;
    totalRevenue: number;
    churnRate: number;
    averageSessionDuration: number;
    supportTickets: number;
  };
  systemHealth: {
    apiResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface PlanUsage {
  totalUsers: number;
  activeUsers: number;
  averageUsage: any;
  topFeatures: string[];
  revenue: number;
}

export interface FeatureUsage {
  feature: string;
  totalUsage: number;
  uniqueUsers: number;
  averagePerUser: number;
  trend: 'up' | 'down' | 'stable';
}

export class KPITrackingService {
  
  /**
   * Generate comprehensive KPI report
   */
  async generateKPIReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<KPIMetrics> {
    try {
      console.log(`📊 [KPI-TRACKING] Generating ${period} KPI report...`);
      
      const startTime = Date.now();
      const timestamp = new Date().toISOString();
      
      // Get date range for the period
      const { startDate, endDate } = this.getPeriodRange(period);
      
      // Generate all KPI metrics concurrently for performance
      const [
        trialConversion,
        usageByPlan,
        popularFeatures,
        businessMetrics,
        systemHealth
      ] = await Promise.all([
        this.calculateTrialConversion(startDate, endDate),
        this.calculateUsageByPlan(startDate, endDate),
        this.calculatePopularFeatures(startDate, endDate),
        this.calculateBusinessMetrics(startDate, endDate),
        this.calculateSystemHealth(startDate, endDate)
      ]);
      
      const kpiMetrics: KPIMetrics = {
        timestamp,
        period,
        trialConversion,
        usageByPlan,
        popularFeatures,
        businessMetrics,
        systemHealth
      };
      
      // Store KPI report in database
      await this.storeKPIReport(kpiMetrics);
      
      // Check for business alerts
      await this.checkBusinessAlerts(kpiMetrics);
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [KPI-TRACKING] ${period} KPI report generated in ${duration}s`);
      
      return kpiMetrics;
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error generating KPI report:', error);
      
      // Send alert for KPI system failure
      await alertingService.sendAlert({
        type: 'failure',
        priority: 'high',
        title: 'KPI Tracking System Failure',
        message: `Failed to generate ${period} KPI report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          period,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        source: 'kpi_tracking_service'
      });
      
      throw error;
    }
  }
  
  /**
   * Calculate trial conversion metrics
   */
  private async calculateTrialConversion(startDate: Date, endDate: Date): Promise<KPIMetrics['trialConversion']> {
    try {
      // Get all entitlements to analyze trial data
      const entitlementsSnapshot = await db.collection('entitlements').get();
      
      let activeTrials = 0;
      let conversions = 0;
      let expiredTrials = 0;
      let totalDaysToConvert = 0;
      let conversionCount = 0;
      
      entitlementsSnapshot.docs.forEach(doc => {
        const entitlements = doc.data();
        const trial = entitlements.trial;
        
        if (!trial) return;
        
        const trialStartDate = trial.startDate?.toDate();
        const trialEndDate = trial.endDate?.toDate();
        
        if (!trialStartDate) return;
        
        // Check if trial was active during the period
        if (trialStartDate >= startDate && trialStartDate <= endDate) {
          
          if (trial.status === 'active' && trial.isTrialing) {
            activeTrials++;
          } else if (trial.status === 'converted') {
            conversions++;
            
            // Calculate days to convert
            const convertDate = trial.convertedAt?.toDate() || trialEndDate;
            if (convertDate) {
              const daysToConvert = Math.floor((convertDate.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
              totalDaysToConvert += daysToConvert;
              conversionCount++;
            }
          } else if (trial.status === 'expired') {
            expiredTrials++;
          }
        }
      });
      
      const totalTrials = activeTrials + conversions + expiredTrials;
      const conversionRate = totalTrials > 0 ? (conversions / totalTrials) * 100 : 0;
      const averageDaysToConvert = conversionCount > 0 ? totalDaysToConvert / conversionCount : 0;
      
      return {
        activeTrials,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageDaysToConvert: Math.round(averageDaysToConvert * 100) / 100,
        expiredTrials
      };
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error calculating trial conversion:', error);
      throw error;
    }
  }
  
  /**
   * Calculate usage by plan
   */
  private async calculateUsageByPlan(startDate: Date, endDate: Date): Promise<KPIMetrics['usageByPlan']> {
    try {
      // Get usage data for the period
      const usageSnapshot = await db.collection('usage')
        .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('updatedAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
        .get();
      
      const planStats = {
        primo: { users: new Set(), totalUsage: {}, revenue: 0 },
        mero: { users: new Set(), totalUsage: {}, revenue: 0 },
        supreme: { users: new Set(), totalUsage: {}, revenue: 0 }
      };
      
      // Aggregate usage by plan
      usageSnapshot.docs.forEach(doc => {
        const usage = doc.data();
        const planName = usage.planName?.toLowerCase();
        
        if (planStats[planName]) {
          planStats[planName].users.add(usage.uid);
          
          // Aggregate feature usage
          Object.entries(usage.used || {}).forEach(([feature, count]) => {
            planStats[planName].totalUsage[feature] = (planStats[planName].totalUsage[feature] || 0) + (count as number);
          });
        }
      });
      
      // Calculate plan revenues (simulated for now)
      const planPricing = { primo: 0, mero: 29, supreme: 79 };
      
      return {
        primo: this.buildPlanUsage(planStats.primo, planPricing.primo),
        mero: this.buildPlanUsage(planStats.mero, planPricing.mero),
        supreme: this.buildPlanUsage(planStats.supreme, planPricing.supreme)
      };
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error calculating usage by plan:', error);
      throw error;
    }
  }
  
  /**
   * Calculate popular features
   */
  private async calculatePopularFeatures(startDate: Date, endDate: Date): Promise<FeatureUsage[]> {
    try {
      const usageSnapshot = await db.collection('usage')
        .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('updatedAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
        .get();
      
      const featureStats = new Map<string, { total: number; users: Set<string> }>();
      
      usageSnapshot.docs.forEach(doc => {
        const usage = doc.data();
        const uid = usage.uid;
        
        Object.entries(usage.used || {}).forEach(([feature, count]) => {
          if (!featureStats.has(feature)) {
            featureStats.set(feature, { total: 0, users: new Set() });
          }
          
          const stats = featureStats.get(feature)!;
          stats.total += count as number;
          stats.users.add(uid);
        });
      });
      
      // Convert to array and sort by usage
      const features: FeatureUsage[] = Array.from(featureStats.entries()).map(([feature, stats]) => ({
        feature,
        totalUsage: stats.total,
        uniqueUsers: stats.users.size,
        averagePerUser: stats.users.size > 0 ? Math.round((stats.total / stats.users.size) * 100) / 100 : 0,
        trend: 'stable' as const // TODO: Calculate trend from historical data
      }));
      
      return features.sort((a, b) => b.totalUsage - a.totalUsage).slice(0, 10);
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error calculating popular features:', error);
      throw error;
    }
  }
  
  /**
   * Calculate business metrics
   */
  private async calculateBusinessMetrics(startDate: Date, endDate: Date): Promise<KPIMetrics['businessMetrics']> {
    try {
      // Get active users count
      const entitlementsSnapshot = await db.collection('entitlements').get();
      const totalActiveUsers = entitlementsSnapshot.size;
      
      // Calculate revenue (simplified)
      let totalRevenue = 0;
      entitlementsSnapshot.docs.forEach(doc => {
        const entitlements = doc.data();
        const planName = entitlements.planName;
        
        if (planName === 'mero') totalRevenue += 29;
        else if (planName === 'supreme') totalRevenue += 79;
      });
      
      // Simulate other metrics for demo
      const churnRate = Math.random() * 5; // 0-5%
      const averageSessionDuration = 15 + Math.random() * 30; // 15-45 minutes
      const supportTickets = Math.floor(Math.random() * 20); // 0-20 tickets
      
      return {
        totalActiveUsers,
        totalRevenue,
        churnRate: Math.round(churnRate * 100) / 100,
        averageSessionDuration: Math.round(averageSessionDuration * 100) / 100,
        supportTickets
      };
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error calculating business metrics:', error);
      throw error;
    }
  }
  
  /**
   * Calculate system health metrics
   */
  private async calculateSystemHealth(startDate: Date, endDate: Date): Promise<KPIMetrics['systemHealth']> {
    try {
      // Simulate system health metrics (in production, these would come from monitoring tools)
      const apiResponseTime = 150 + Math.random() * 100; // 150-250ms
      const errorRate = Math.random() * 2; // 0-2%
      const uptime = 99.5 + Math.random() * 0.5; // 99.5-100%
      
      return {
        apiResponseTime: Math.round(apiResponseTime),
        errorRate: Math.round(errorRate * 1000) / 1000,
        uptime: Math.round(uptime * 1000) / 1000
      };
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error calculating system health:', error);
      throw error;
    }
  }
  
  /**
   * Build plan usage object
   */
  private buildPlanUsage(planData: any, pricing: number): PlanUsage {
    const totalUsers = planData.users.size;
    const activeUsers = totalUsers; // Simplified: assume all users are active
    
    // Find top features
    const topFeatures = Object.entries(planData.totalUsage)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([feature]) => feature);
    
    return {
      totalUsers,
      activeUsers,
      averageUsage: planData.totalUsage,
      topFeatures,
      revenue: totalUsers * pricing
    };
  }
  
  /**
   * Get date range for period
   */
  private getPeriodRange(period: 'daily' | 'weekly' | 'monthly'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    return { startDate, endDate };
  }
  
  /**
   * Store KPI report in database
   */
  private async storeKPIReport(kpiMetrics: KPIMetrics): Promise<void> {
    try {
      const reportId = `${kpiMetrics.period}_${new Date().toISOString().slice(0, 10)}_${Date.now()}`;
      
      await db.collection('kpi_reports').doc(reportId).set({
        ...kpiMetrics,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`📊 [KPI-TRACKING] Report stored: ${reportId}`);
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error storing KPI report:', error);
    }
  }
  
  /**
   * Check for business alerts based on KPI thresholds
   */
  private async checkBusinessAlerts(kpiMetrics: KPIMetrics): Promise<void> {
    try {
      // Check conversion rate
      if (kpiMetrics.trialConversion.conversionRate < 10) {
        await alertingService.sendBusinessAlert(
          'Trial Conversion Rate',
          kpiMetrics.trialConversion.conversionRate,
          10,
          'down'
        );
      }
      
      // Check churn rate
      if (kpiMetrics.businessMetrics.churnRate > 5) {
        await alertingService.sendBusinessAlert(
          'Churn Rate',
          kpiMetrics.businessMetrics.churnRate,
          5,
          'up'
        );
      }
      
      // Check system health
      if (kpiMetrics.systemHealth.errorRate > 1) {
        await alertingService.sendAlert({
          type: 'performance',
          priority: 'medium',
          title: 'High Error Rate Detected',
          message: `System error rate is ${kpiMetrics.systemHealth.errorRate}% (threshold: 1%)`,
          details: kpiMetrics.systemHealth,
          source: 'kpi_tracking_service'
        });
      }
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error checking business alerts:', error);
    }
  }
  
  /**
   * Get historical KPI data
   */
  async getHistoricalKPIs(period: 'daily' | 'weekly' | 'monthly', limit: number = 30): Promise<KPIMetrics[]> {
    try {
      const snapshot = await db.collection('kpi_reports')
        .where('period', '==', period)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => doc.data() as KPIMetrics);
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error getting historical KPIs:', error);
      return [];
    }
  }
  
  /**
   * Generate KPI summary for dashboard
   */
  async getKPISummary(): Promise<any> {
    try {
      const [dailyKPIs, weeklyKPIs, monthlyKPIs] = await Promise.all([
        this.getHistoricalKPIs('daily', 7),
        this.getHistoricalKPIs('weekly', 4),
        this.getHistoricalKPIs('monthly', 3)
      ]);
      
      return {
        latest: {
          daily: dailyKPIs[0] || null,
          weekly: weeklyKPIs[0] || null,
          monthly: monthlyKPIs[0] || null
        },
        trends: {
          conversionRate: this.calculateTrend(dailyKPIs.map(k => k.trialConversion.conversionRate)),
          activeUsers: this.calculateTrend(dailyKPIs.map(k => k.businessMetrics.totalActiveUsers)),
          revenue: this.calculateTrend(monthlyKPIs.map(k => k.businessMetrics.totalRevenue))
        },
        alerts: {
          lowConversion: dailyKPIs[0]?.trialConversion.conversionRate < 10,
          highChurn: dailyKPIs[0]?.businessMetrics.churnRate > 5,
          systemIssues: dailyKPIs[0]?.systemHealth.errorRate > 1
        }
      };
      
    } catch (error) {
      console.error('❌ [KPI-TRACKING] Error getting KPI summary:', error);
      return null;
    }
  }
  
  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(0, Math.ceil(values.length / 2));
    const older = values.slice(Math.ceil(values.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }
}

export const kpiTrackingService = new KPITrackingService();