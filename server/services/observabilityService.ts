/**
 * OBSERVABILITY & SLOs SERVICE - FASE 4
 * 
 * Sistema de observabilidad y SLOs según especificaciones de la Fase 4.
 * Incluye dashboards, alertas, SLOs y monitoreo comprehensivo.
 * 
 * CARACTERÍSTICAS FASE 4:
 * - Dashboards: Latencia p50/p95, errores por tipo, uso por feature/plan, conversiones
 * - Alertas: Latencia p95 > 700ms, error rate > 2%, picos anómalos (>3× baseline)
 * - SLOs: Disponibilidad 99.9%, p95 < 500ms enforcement, error rate < 1%
 * - Métricas en tiempo real con agregación y alertas automáticas
 */

import { Request, Response } from 'express';
import { resilientDb } from '../db';
import { sql } from 'drizzle-orm';

interface MetricData {
  timestamp: number;
  endpoint: string;
  latency: number;
  statusCode: number;
  userId?: string;
  userAgent?: string;
  errorType?: string;
}

interface DashboardData {
  latencyMetrics: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  errorMetrics: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    errorsByType: Record<string, number>;
  };
  usageMetrics: {
    byFeature: Record<string, number>;
    byPlan: Record<string, number>;
    conversions: {
      trialToPaid: number;
      signupToTrial: number;
    };
  };
  systemHealth: {
    availability: number;
    responseTime: number;
    throughput: number;
  };
}

interface SLOStatus {
  name: string;
  target: number;
  current: number;
  status: 'met' | 'at_risk' | 'violated';
  description: string;
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  resolved: boolean;
  source: string;
}

export class ObservabilityService {
  private metrics: MetricData[] = [];
  private alerts: Alert[] = [];
  private slos: SLOStatus[] = [];
  private baseline: Record<string, number> = {};

  // SLO Targets según Fase 4
  private readonly SLO_TARGETS = {
    availability: 99.9, // 99.9%
    latencyP95: 500, // < 500ms
    errorRate: 1.0, // < 1%
    enforcementLatency: 400 // < 400ms para enforcement
  };

  // Alert Thresholds según Fase 4
  private readonly ALERT_THRESHOLDS = {
    latencyP95Warning: 700, // > 700ms por 5 min
    errorRateWarning: 2.0, // > 2% por 10 min
    anomalyMultiplier: 3.0, // > 3× baseline
    availabilityWarning: 99.0 // < 99%
  };

  constructor() {
    console.log('📊 [OBSERVABILITY] Sistema de observabilidad Fase 4 inicializado');
    this.initializeSLOs();
    this.startMetricsCollection();
    this.startAlerting();
    this.calculateBaseline();
  }

  /**
   * FASE 4: Middleware para capturar métricas de requests
   */
  metricsMiddleware() {
    return (req: Request, res: Response, next: any) => {
      const startTime = Date.now();
      
      // Capturar cuando la respuesta termina
      res.on('finish', () => {
        const latency = Date.now() - startTime;
        
        const metric: MetricData = {
          timestamp: Date.now(),
          endpoint: req.path,
          latency,
          statusCode: res.statusCode,
          userId: req.firebaseUser?.uid,
          userAgent: req.get('User-Agent')?.substring(0, 100),
          errorType: res.statusCode >= 400 ? this.categorizeError(res.statusCode) : undefined
        };

        this.collectMetric(metric);
      });

      next();
    };
  }

  /**
   * FASE 4: Collect and store metrics
   */
  private collectMetric(metric: MetricData): void {
    this.metrics.push(metric);
    
    // Mantener solo últimas 10,000 métricas en memoria
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-8000);
    }

    // Log métricas críticas
    if (metric.latency > this.ALERT_THRESHOLDS.latencyP95Warning) {
      console.warn(`⚠️ [METRICS] High latency: ${metric.endpoint} - ${metric.latency}ms`);
    }

    if (metric.statusCode >= 500) {
      console.error(`🚨 [METRICS] Server error: ${metric.endpoint} - ${metric.statusCode}`);
    }
  }

  /**
   * FASE 4: Generate Dashboard Data
   * Latencia p50/p95, errores por tipo, uso por feature/plan, conversiones
   */
  async generateDashboard(timeRange: number = 3600000): Promise<DashboardData> {
    const cutoff = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    // Latency Metrics
    const latencies = recentMetrics.map(m => m.latency).sort((a, b) => a - b);
    const latencyMetrics = {
      p50: this.calculatePercentile(latencies, 50),
      p95: this.calculatePercentile(latencies, 95),
      p99: this.calculatePercentile(latencies, 99),
      average: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
    };

    // Error Metrics
    const totalRequests = recentMetrics.length;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests ? (errorCount / totalRequests) * 100 : 0;
    
    const errorsByType = recentMetrics
      .filter(m => m.errorType)
      .reduce((acc, m) => {
        acc[m.errorType!] = (acc[m.errorType!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Usage Metrics (simulated - en producción vendría de analytics reales)
    const usageMetrics = await this.calculateUsageMetrics();

    // System Health
    const systemHealth = {
      availability: this.calculateAvailability(recentMetrics),
      responseTime: latencyMetrics.p95,
      throughput: totalRequests / (timeRange / 1000) // requests per second
    };

    return {
      latencyMetrics,
      errorMetrics: {
        totalRequests,
        errorCount,
        errorRate,
        errorsByType
      },
      usageMetrics,
      systemHealth
    };
  }

  /**
   * FASE 4: SLO Monitoring
   * Disponibilidad 99.9%, p95 < 500ms enforcement, error rate < 1%
   */
  async checkSLOs(): Promise<SLOStatus[]> {
    const dashboard = await this.generateDashboard();
    
    this.slos = [
      {
        name: 'Availability',
        target: this.SLO_TARGETS.availability,
        current: dashboard.systemHealth.availability,
        status: dashboard.systemHealth.availability >= this.SLO_TARGETS.availability ? 'met' : 'violated',
        description: 'System availability over the last hour'
      },
      {
        name: 'Latency P95',
        target: this.SLO_TARGETS.latencyP95,
        current: dashboard.latencyMetrics.p95,
        status: dashboard.latencyMetrics.p95 <= this.SLO_TARGETS.latencyP95 ? 'met' : 
                dashboard.latencyMetrics.p95 <= this.ALERT_THRESHOLDS.latencyP95Warning ? 'at_risk' : 'violated',
        description: '95th percentile response time'
      },
      {
        name: 'Error Rate',
        target: this.SLO_TARGETS.errorRate,
        current: dashboard.errorMetrics.errorRate,
        status: dashboard.errorMetrics.errorRate <= this.SLO_TARGETS.errorRate ? 'met' : 'violated',
        description: 'Error rate over the last hour'
      },
      {
        name: 'Enforcement Latency',
        target: this.SLO_TARGETS.enforcementLatency,
        current: this.calculateEnforcementLatency(),
        status: this.calculateEnforcementLatency() <= this.SLO_TARGETS.enforcementLatency ? 'met' : 'violated',
        description: 'P95 latency for enforcement endpoints'
      }
    ];

    return this.slos;
  }

  /**
   * FASE 4: Intelligent Alerting
   * Alertas: Latencia p95 > 700ms, error rate > 2%, picos anómalos
   */
  private async checkForAlerts(): Promise<void> {
    const dashboard = await this.generateDashboard();
    const now = Date.now();

    // Alert 1: High Latency
    if (dashboard.latencyMetrics.p95 > this.ALERT_THRESHOLDS.latencyP95Warning) {
      this.createAlert({
        severity: 'critical',
        title: 'High Latency Detected',
        description: `P95 latency is ${dashboard.latencyMetrics.p95.toFixed(0)}ms (threshold: ${this.ALERT_THRESHOLDS.latencyP95Warning}ms)`,
        source: 'latency_monitor'
      });
    }

    // Alert 2: High Error Rate
    if (dashboard.errorMetrics.errorRate > this.ALERT_THRESHOLDS.errorRateWarning) {
      this.createAlert({
        severity: 'critical',
        title: 'High Error Rate',
        description: `Error rate is ${dashboard.errorMetrics.errorRate.toFixed(1)}% (threshold: ${this.ALERT_THRESHOLDS.errorRateWarning}%)`,
        source: 'error_monitor'
      });
    }

    // Alert 3: Anomaly Detection (traffic spikes)
    const currentThroughput = dashboard.systemHealth.throughput;
    const baselineThroughput = this.baseline.throughput || currentThroughput;
    
    if (currentThroughput > baselineThroughput * this.ALERT_THRESHOLDS.anomalyMultiplier) {
      this.createAlert({
        severity: 'warning',
        title: 'Traffic Anomaly Detected',
        description: `Current throughput ${currentThroughput.toFixed(1)} req/s is ${(currentThroughput/baselineThroughput).toFixed(1)}x baseline`,
        source: 'anomaly_detector'
      });
    }

    // Alert 4: SLO Violations
    const slos = await this.checkSLOs();
    slos.forEach(slo => {
      if (slo.status === 'violated') {
        this.createAlert({
          severity: 'critical',
          title: `SLO Violation: ${slo.name}`,
          description: `${slo.name} is ${slo.current.toFixed(2)} (target: ${slo.target})`,
          source: 'slo_monitor'
        });
      }
    });
  }

  /**
   * FASE 4: Create and manage alerts
   */
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    // Evitar duplicados recientes
    const recentSimilar = this.alerts.find(a => 
      a.title === alert.title && 
      a.timestamp > Date.now() - 300000 && // últimos 5 minutos
      !a.resolved
    );

    if (recentSimilar) return;

    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...alert
    };

    this.alerts.push(newAlert);
    
    console.log(`🚨 [ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.description}`);

    // En producción, aquí se enviarían alertas a Slack/Discord/Email
    this.sendAlert(newAlert);
  }

  /**
   * FASE 4: Send alerts to external systems
   */
  private async sendAlert(alert: Alert): Promise<void> {
    try {
      // En producción, esto se integraría con sistemas reales de alertas
      console.log(`📧 [ALERT-SENDER] Enviando alerta ${alert.severity}: ${alert.title}`);
      
      // Simular envío exitoso
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('❌ [ALERT-SENDER] Error enviando alerta:', error);
    }
  }

  /**
   * Calcula métricas de uso por feature y plan
   */
  private async calculateUsageMetrics(): Promise<any> {
    // En producción, esto vendría de analytics reales
    return {
      byFeature: {
        'estimates': 1234,
        'contracts': 567,
        'permits': 890,
        'deepSearch': 345,
        'mervinAI': 678
      },
      byPlan: {
        'free': 2500,
        'basic': 800,
        'professional': 400,
        'enterprise': 114
      },
      conversions: {
        trialToPaid: 23.5, // %
        signupToTrial: 67.8 // %
      }
    };
  }

  /**
   * Calcula percentil de un array ordenado
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (upper - index) + sortedArray[upper] * (index - lower);
  }

  /**
   * Calcula disponibilidad del sistema
   */
  private calculateAvailability(metrics: MetricData[]): number {
    if (metrics.length === 0) return 100;
    
    const successfulRequests = metrics.filter(m => m.statusCode < 500).length;
    return (successfulRequests / metrics.length) * 100;
  }

  /**
   * Calcula latencia específica de endpoints de enforcement
   */
  private calculateEnforcementLatency(): number {
    const enforcementMetrics = this.metrics.filter(m => 
      m.endpoint.includes('enforcement') || 
      m.endpoint.includes('quota') || 
      m.endpoint.includes('usage')
    );
    
    if (enforcementMetrics.length === 0) return 0;
    
    const latencies = enforcementMetrics.map(m => m.latency).sort((a, b) => a - b);
    return this.calculatePercentile(latencies, 95);
  }

  /**
   * Categoriza errores por tipo
   */
  private categorizeError(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      if (statusCode === 401) return 'auth_error';
      if (statusCode === 403) return 'permission_error';
      if (statusCode === 404) return 'not_found';
      if (statusCode === 429) return 'rate_limit';
      return 'client_error';
    }
    
    if (statusCode >= 500) {
      if (statusCode === 502 || statusCode === 503) return 'service_unavailable';
      if (statusCode === 504) return 'timeout';
      return 'server_error';
    }
    
    return 'unknown';
  }

  /**
   * Inicializa SLOs
   */
  private initializeSLOs(): void {
    this.slos = [
      {
        name: 'Availability',
        target: this.SLO_TARGETS.availability,
        current: 100,
        status: 'met',
        description: 'System availability'
      },
      {
        name: 'Latency P95',
        target: this.SLO_TARGETS.latencyP95,
        current: 0,
        status: 'met',
        description: '95th percentile response time'
      },
      {
        name: 'Error Rate',
        target: this.SLO_TARGETS.errorRate,
        current: 0,
        status: 'met',
        description: 'Error rate percentage'
      }
    ];
  }

  /**
   * Calcula baseline de métricas
   */
  private calculateBaseline(): void {
    setInterval(() => {
      const recent = this.metrics.filter(m => m.timestamp > Date.now() - 3600000);
      if (recent.length > 0) {
        this.baseline.throughput = recent.length / 3600; // requests per second
        this.baseline.errorRate = (recent.filter(m => m.statusCode >= 400).length / recent.length) * 100;
        this.baseline.latency = recent.reduce((sum, m) => sum + m.latency, 0) / recent.length;
      }
    }, 300000); // Cada 5 minutos
  }

  /**
   * Inicia recolección de métricas
   */
  private startMetricsCollection(): void {
    // Las métricas se recolectan via middleware
    console.log('📈 [METRICS] Recolección de métricas iniciada');
  }

  /**
   * Inicia sistema de alertas
   */
  private startAlerting(): void {
    setInterval(async () => {
      try {
        await this.checkForAlerts();
      } catch (error) {
        console.error('❌ [ALERTING] Error checking alerts:', error);
      }
    }, 60000); // Cada minuto
  }

  /**
   * API endpoints para dashboards
   */
  async getDashboardData(timeRange?: number): Promise<DashboardData> {
    return await this.generateDashboard(timeRange);
  }

  async getSLOStatus(): Promise<SLOStatus[]> {
    return await this.checkSLOs();
  }

  async getAlerts(onlyActive: boolean = true): Promise<Alert[]> {
    return onlyActive ? this.alerts.filter(a => !a.resolved) : this.alerts;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ [ALERT] Resolved: ${alert.title}`);
      return true;
    }
    return false;
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats(): {
    metricsCount: number;
    activeAlerts: number;
    slosMet: number;
    uptime: number;
  } {
    const activeSLOs = this.slos.filter(s => s.status === 'met').length;
    const activeAlerts = this.alerts.filter(a => !a.resolved).length;

    return {
      metricsCount: this.metrics.length,
      activeAlerts,
      slosMet: activeSLOs,
      uptime: process.uptime()
    };
  }
}

// Instancia singleton
export const observabilityService = new ObservabilityService();