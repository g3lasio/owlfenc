/**
 * 🛠️ DEV MODE UTILITIES
 * Centralized development-specific code and utilities
 * Separated from production code for better maintainability
 */

interface DevConfig {
  enableDebugLogs: boolean;
  simulateNetworkDelay: boolean;
  mockAuthFailures: boolean;
  bypassRateLimiting: boolean;
  enablePerformanceMetrics: boolean;
}

class DevModeManager {
  private config: DevConfig;
  private isDevelopment: boolean;
  
  constructor() {
    this.isDevelopment = this.detectDevelopmentMode();
    this.config = this.loadDevConfig();
  }
  
  // ✅ FASE 2: Centralized dev mode detection
  private detectDevelopmentMode(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      window.location.hostname.includes('replit') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('dev=true')
    );
  }
  
  private loadDevConfig(): DevConfig {
    const defaultConfig: DevConfig = {
      enableDebugLogs: true,
      simulateNetworkDelay: false,
      mockAuthFailures: false,
      bypassRateLimiting: true,
      enablePerformanceMetrics: true
    };
    
    if (!this.isDevelopment) {
      return {
        enableDebugLogs: false,
        simulateNetworkDelay: false,
        mockAuthFailures: false,
        bypassRateLimiting: false,
        enablePerformanceMetrics: false
      };
    }
    
    try {
      const stored = localStorage.getItem('dev_config');
      return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
    } catch (error) {
      console.warn('Failed to load dev config:', error);
      return defaultConfig;
    }
  }
  
  // Public API
  isDev(): boolean {
    return this.isDevelopment;
  }
  
  shouldDebugLog(): boolean {
    return this.isDevelopment && this.config.enableDebugLogs;
  }
  
  // ✅ FASE 2: Centralized dev-specific logging
  debugLog(category: string, message: string, data?: any) {
    if (!this.shouldDebugLog()) return;
    
    const prefix = `🛠️ [DEV-${category.toUpperCase()}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
  
  // ✅ FASE 2: Dev-specific network simulation
  async simulateNetworkDelay(minMs: number = 100, maxMs: number = 1000): Promise<void> {
    if (!this.isDevelopment || !this.config.simulateNetworkDelay) return;
    
    const delay = Math.random() * (maxMs - minMs) + minMs;
    this.debugLog('NETWORK', `Simulating ${delay.toFixed(0)}ms delay`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // ✅ FASE 2: Dev-specific auth testing
  shouldMockAuthFailure(): boolean {
    if (!this.isDevelopment || !this.config.mockAuthFailures) return false;
    
    // 10% chance of mocking failure in dev mode
    return Math.random() < 0.1;
  }
  
  // ✅ FASE 2: Dev-specific session management
  preserveDevSession(sessionKey: string): boolean {
    if (!this.isDevelopment) return false;
    
    this.debugLog('SESSION', `Preserving dev session: ${sessionKey}`);
    
    // Prevent Firebase from clearing certain keys in development
    const protectedKeys = [
      'firebase:authUser',
      'firebase:host',
      'dev_user_plan_simulation',
      'enhanced_auth_session'
    ];
    
    return protectedKeys.some(key => sessionKey.includes(key));
  }
  
  // ✅ FASE 3: Dev performance monitoring
  private performanceMarks = new Map<string, number>();
  
  markStart(label: string) {
    if (!this.isDevelopment || !this.config.enablePerformanceMetrics) return;
    
    this.performanceMarks.set(label, performance.now());
  }
  
  markEnd(label: string): number | null {
    if (!this.isDevelopment || !this.config.enablePerformanceMetrics) return null;
    
    const start = this.performanceMarks.get(label);
    if (!start) return null;
    
    const duration = performance.now() - start;
    this.debugLog('PERF', `${label}: ${duration.toFixed(2)}ms`);
    
    this.performanceMarks.delete(label);
    return duration;
  }
  
  // Configuration management
  updateConfig(updates: Partial<DevConfig>) {
    if (!this.isDevelopment) return;
    
    this.config = { ...this.config, ...updates };
    localStorage.setItem('dev_config', JSON.stringify(this.config));
    
    this.debugLog('CONFIG', 'Updated dev config', this.config);
  }
  
  getConfig(): DevConfig {
    return { ...this.config };
  }
  
  resetConfig() {
    if (!this.isDevelopment) return;
    
    localStorage.removeItem('dev_config');
    this.config = this.loadDevConfig();
    
    this.debugLog('CONFIG', 'Reset dev config to defaults');
  }
}

export const devModeManager = new DevModeManager();

// Convenience exports for common dev checks
export const isDevelopmentMode = () => devModeManager.isDev();
export const debugLog = (category: string, message: string, data?: any) => 
  devModeManager.debugLog(category, message, data);