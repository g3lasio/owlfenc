/**
 * Advanced Signature Validation Service
 * Provides biometric analysis and authenticity validation for digital signatures
 */

export interface BiometricData {
  velocity: number[];
  pressure: number[];
  timestamps: number[];
  coordinates: { x: number; y: number }[];
  totalTime: number;
  strokeCount: number;
}

export interface SignatureMetadata {
  deviceType: 'mobile' | 'desktop';
  timestamp: string;
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
  biometricScore: number;
  authenticityScore: number;
  complexityScore: number;
  recommendations: string[];
}

export interface SignatureProfile {
  id: string;
  signerName: string;
  averageVelocity: number;
  averagePressure: number;
  typicalStrokeCount: number;
  characteristicPattern: number[];
  createdAt: string;
  updateCount: number;
}

export class SignatureValidationService {
  private static instance: SignatureValidationService;
  private profiles: Map<string, SignatureProfile> = new Map();

  // Validation thresholds
  private readonly THRESHOLDS = {
    MIN_STROKE_COUNT: 2,
    MIN_COORDINATE_COUNT: 10,
    MIN_TIME_MS: 500,
    MAX_TIME_MS: 30000,
    MIN_VELOCITY: 0.01,
    MAX_VELOCITY: 5.0,
    MIN_PRESSURE: 0.1,
    MAX_PRESSURE: 1.0,
    MIN_COMPLEXITY_SCORE: 5,
    AUTHENTICITY_THRESHOLD: 60,
    CONFIDENCE_THRESHOLD: 70
  };

  static getInstance(): SignatureValidationService {
    if (!SignatureValidationService.instance) {
      SignatureValidationService.instance = new SignatureValidationService();
    }
    return SignatureValidationService.instance;
  }

  /**
   * Comprehensive signature validation
   */
  validateSignature(
    biometricData: BiometricData,
    metadata: SignatureMetadata,
    signerProfile?: SignatureProfile
  ): ValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Basic data validation
    const basicValidation = this.validateBasicData(biometricData, issues);
    
    // Biometric analysis
    const biometricScore = this.calculateBiometricScore(biometricData, issues);
    
    // Authenticity analysis
    const authenticityScore = this.calculateAuthenticityScore(
      biometricData, 
      metadata, 
      signerProfile,
      issues
    );
    
    // Complexity analysis
    const complexityScore = this.calculateComplexityScore(biometricData, issues);

    // Device-specific validation
    this.validateDeviceSpecific(metadata, biometricData, issues, recommendations);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      biometricScore,
      authenticityScore,
      complexityScore,
      basicValidation
    );

    // Determine risk level
    const riskLevel = this.assessRiskLevel(confidence, authenticityScore, issues.length);

    // Generate recommendations
    this.generateRecommendations(biometricScore, authenticityScore, complexityScore, recommendations);

    return {
      isValid: confidence >= this.THRESHOLDS.CONFIDENCE_THRESHOLD && issues.length === 0,
      confidence: Math.round(confidence),
      riskLevel,
      issues,
      biometricScore: Math.round(biometricScore),
      authenticityScore: Math.round(authenticityScore),
      complexityScore: Math.round(complexityScore),
      recommendations
    };
  }

  /**
   * Basic data structure validation
   */
  private validateBasicData(data: BiometricData, issues: string[]): boolean {
    let isValid = true;

    if (data.strokeCount < this.THRESHOLDS.MIN_STROKE_COUNT) {
      issues.push(`Insuficientes trazos de firma (${data.strokeCount} < ${this.THRESHOLDS.MIN_STROKE_COUNT})`);
      isValid = false;
    }

    if (data.coordinates.length < this.THRESHOLDS.MIN_COORDINATE_COUNT) {
      issues.push(`Insuficientes puntos de coordenadas (${data.coordinates.length} < ${this.THRESHOLDS.MIN_COORDINATE_COUNT})`);
      isValid = false;
    }

    if (data.totalTime < this.THRESHOLDS.MIN_TIME_MS) {
      issues.push(`Tiempo de firma demasiado corto (${data.totalTime}ms < ${this.THRESHOLDS.MIN_TIME_MS}ms)`);
      isValid = false;
    }

    if (data.totalTime > this.THRESHOLDS.MAX_TIME_MS) {
      issues.push(`Tiempo de firma demasiado largo (${data.totalTime}ms > ${this.THRESHOLDS.MAX_TIME_MS}ms)`);
      isValid = false;
    }

    if (data.velocity.length === 0) {
      issues.push('No se detectaron datos de velocidad');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Calculate biometric authenticity score
   */
  private calculateBiometricScore(data: BiometricData, issues: string[]): number {
    let score = 100;

    // Velocity analysis
    const avgVelocity = this.calculateAverage(data.velocity);
    const velocityVariance = this.calculateVariance(data.velocity);
    
    if (avgVelocity < this.THRESHOLDS.MIN_VELOCITY) {
      score -= 20;
      issues.push('Velocidad de firma inusualmente baja');
    }
    
    if (avgVelocity > this.THRESHOLDS.MAX_VELOCITY) {
      score -= 15;
      issues.push('Velocidad de firma inusualmente alta');
    }

    // Velocity consistency (human signatures have natural variation)
    if (velocityVariance < 0.001) {
      score -= 25;
      issues.push('Velocidad demasiado consistente (posible firma artificial)');
    }

    // Pressure analysis
    const avgPressure = this.calculateAverage(data.pressure);
    const pressureVariance = this.calculateVariance(data.pressure);
    
    if (avgPressure < this.THRESHOLDS.MIN_PRESSURE || avgPressure > this.THRESHOLDS.MAX_PRESSURE) {
      score -= 10;
    }

    // Natural pressure variation
    if (pressureVariance < 0.01) {
      score -= 15;
      issues.push('Presión demasiado uniforme');
    }

    // Timing analysis
    const timingVariations = this.analyzeTimingPatterns(data.timestamps);
    if (timingVariations.isUnnatural) {
      score -= 20;
      issues.push('Patrones de tiempo no naturales detectados');
    }

    return Math.max(0, score);
  }

  /**
   * Calculate signature authenticity based on human behavioral patterns
   */
  private calculateAuthenticityScore(
    data: BiometricData,
    metadata: SignatureMetadata,
    profile?: SignatureProfile,
    issues: string[] = []
  ): number {
    let score = 100;

    // Stroke pattern analysis
    const strokePatterns = this.analyzeStrokePatterns(data.coordinates);
    if (!strokePatterns.hasNaturalFlow) {
      score -= 25;
      issues.push('Patrones de trazo no naturales');
    }

    // Acceleration analysis
    const accelerationPatterns = this.analyzeAcceleration(data.velocity);
    if (!accelerationPatterns.hasHumanLikeAcceleration) {
      score -= 20;
      issues.push('Patrones de aceleración no humanos');
    }

    // Tremor and micro-movements (human signatures have slight tremor)
    const microMovements = this.analyzeMicroMovements(data.coordinates);
    if (microMovements.isTooSmooth) {
      score -= 30;
      issues.push('Firma demasiado suave (falta tremor humano natural)');
    }

    // Profile comparison if available
    if (profile) {
      const profileMatch = this.compareWithProfile(data, profile);
      if (profileMatch.similarity < 0.7) {
        score -= 15;
        issues.push('Firma no coincide con perfil establecido');
      }
    }

    // Device consistency check
    const deviceConsistency = this.validateDeviceConsistency(data, metadata);
    if (!deviceConsistency.isConsistent) {
      score -= 10;
      issues.push('Inconsistencias con el tipo de dispositivo');
    }

    return Math.max(0, score);
  }

  /**
   * Calculate signature complexity score
   */
  private calculateComplexityScore(data: BiometricData, issues: string[]): number {
    // Complexity based on coordinate changes, direction changes, and stroke patterns
    const directionChanges = this.countDirectionChanges(data.coordinates);
    const coordinateSpread = this.calculateCoordinateSpread(data.coordinates);
    const strokeComplexity = data.strokeCount * data.coordinates.length / (data.totalTime + 1);

    let complexityScore = (directionChanges * 2) + (coordinateSpread * 0.1) + (strokeComplexity * 10);

    if (complexityScore < this.THRESHOLDS.MIN_COMPLEXITY_SCORE) {
      issues.push('Firma demasiado simple (puede ser falsificada fácilmente)');
      complexityScore = Math.max(complexityScore, 20); // Minimum acceptable score
    }

    return Math.min(100, complexityScore);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    biometricScore: number,
    authenticityScore: number,
    complexityScore: number,
    basicValid: boolean
  ): number {
    if (!basicValid) return 0;

    // Weighted average with emphasis on authenticity
    const weights = {
      biometric: 0.4,
      authenticity: 0.4,
      complexity: 0.2
    };

    return (
      biometricScore * weights.biometric +
      authenticityScore * weights.authenticity +
      complexityScore * weights.complexity
    );
  }

  /**
   * Assess risk level based on validation results
   */
  private assessRiskLevel(confidence: number, authenticityScore: number, issueCount: number): 'low' | 'medium' | 'high' {
    if (confidence >= 85 && authenticityScore >= 80 && issueCount === 0) {
      return 'low';
    } else if (confidence >= 60 && authenticityScore >= 60 && issueCount <= 2) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Generate specific recommendations for improving signature quality
   */
  private generateRecommendations(
    biometricScore: number,
    authenticityScore: number,
    complexityScore: number,
    recommendations: string[]
  ): void {
    if (biometricScore < 70) {
      recommendations.push('Intente firmar de manera más natural y consistente');
    }

    if (authenticityScore < 60) {
      recommendations.push('La firma parece artificial. Use su firma habitual');
    }

    if (complexityScore < 30) {
      recommendations.push('Considere una firma más distintiva para mayor seguridad');
    }

    if (recommendations.length === 0) {
      recommendations.push('Firma válida con buena calidad de autenticación');
    }
  }

  /**
   * Device-specific validation
   */
  private validateDeviceSpecific(
    metadata: SignatureMetadata,
    data: BiometricData,
    issues: string[],
    recommendations: string[]
  ): void {
    if (metadata.deviceType === 'mobile') {
      // Mobile devices should have more pressure variation
      const pressureVariance = this.calculateVariance(data.pressure);
      if (pressureVariance < 0.05) {
        issues.push('Datos de presión inconsistentes con dispositivo móvil');
      }

      // Mobile signatures tend to be faster
      const avgVelocity = this.calculateAverage(data.velocity);
      if (avgVelocity < 0.02) {
        recommendations.push('En dispositivos móviles, firme con movimientos más fluidos');
      }
    } else {
      // Desktop/mouse signatures have different characteristics
      const avgVelocity = this.calculateAverage(data.velocity);
      if (avgVelocity > 2.0) {
        recommendations.push('Con mouse, firme más lentamente para mayor precisión');
      }
    }
  }

  // Utility methods for analysis

  private analyzeTimingPatterns(timestamps: number[]): { isUnnatural: boolean } {
    if (timestamps.length < 3) return { isUnnatural: false };

    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const variance = this.calculateVariance(intervals);
    
    // Human timing has natural variation
    return { isUnnatural: variance < 10 }; // Too consistent timing
  }

  private analyzeStrokePatterns(coordinates: { x: number; y: number }[]): { hasNaturalFlow: boolean } {
    if (coordinates.length < 5) return { hasNaturalFlow: false };

    let directionChanges = 0;
    for (let i = 2; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const next = coordinates[i + 1] || curr;

      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      
      if (Math.abs(angle1 - angle2) > Math.PI / 4) {
        directionChanges++;
      }
    }

    // Natural signatures have reasonable direction changes
    const changeRatio = directionChanges / coordinates.length;
    return { hasNaturalFlow: changeRatio > 0.1 && changeRatio < 0.8 };
  }

  private analyzeAcceleration(velocity: number[]): { hasHumanLikeAcceleration: boolean } {
    if (velocity.length < 3) return { hasHumanLikeAcceleration: false };

    const accelerations = [];
    for (let i = 1; i < velocity.length; i++) {
      accelerations.push(velocity[i] - velocity[i - 1]);
    }

    const variance = this.calculateVariance(accelerations);
    
    // Human signatures have varied acceleration
    return { hasHumanLikeAcceleration: variance > 0.001 };
  }

  private analyzeMicroMovements(coordinates: { x: number; y: number }[]): { isTooSmooth: boolean } {
    if (coordinates.length < 5) return { isTooSmooth: true };

    let totalJitter = 0;
    for (let i = 2; i < coordinates.length - 2; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const next = coordinates[i + 1];

      // Calculate deviation from straight line
      const expectedX = (prev.x + next.x) / 2;
      const expectedY = (prev.y + next.y) / 2;
      
      const jitter = Math.sqrt(
        Math.pow(curr.x - expectedX, 2) + Math.pow(curr.y - expectedY, 2)
      );
      
      totalJitter += jitter;
    }

    const avgJitter = totalJitter / (coordinates.length - 4);
    
    // Human signatures have natural micro-tremor
    return { isTooSmooth: avgJitter < 0.5 };
  }

  private compareWithProfile(data: BiometricData, profile: SignatureProfile): { similarity: number } {
    const velocityDiff = Math.abs(this.calculateAverage(data.velocity) - profile.averageVelocity);
    const pressureDiff = Math.abs(this.calculateAverage(data.pressure) - profile.averagePressure);
    const strokeDiff = Math.abs(data.strokeCount - profile.typicalStrokeCount);

    // Normalize differences and calculate similarity
    const velocitySimilarity = Math.max(0, 1 - velocityDiff / 2);
    const pressureSimilarity = Math.max(0, 1 - pressureDiff);
    const strokeSimilarity = Math.max(0, 1 - strokeDiff / 10);

    const similarity = (velocitySimilarity + pressureSimilarity + strokeSimilarity) / 3;
    return { similarity };
  }

  private validateDeviceConsistency(
    data: BiometricData, 
    metadata: SignatureMetadata
  ): { isConsistent: boolean } {
    const avgVelocity = this.calculateAverage(data.velocity);
    const avgPressure = this.calculateAverage(data.pressure);

    if (metadata.deviceType === 'mobile') {
      // Mobile devices typically have higher pressure sensitivity
      return { isConsistent: avgPressure > 0.2 };
    } else {
      // Desktop/mouse typically has more consistent pressure
      const pressureVariance = this.calculateVariance(data.pressure);
      return { isConsistent: pressureVariance < 0.2 };
    }
  }

  private countDirectionChanges(coordinates: { x: number; y: number }[]): number {
    if (coordinates.length < 3) return 0;

    let changes = 0;
    for (let i = 1; i < coordinates.length - 1; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const next = coordinates[i + 1];

      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      
      if (Math.abs(angle1 - angle2) > Math.PI / 6) {
        changes++;
      }
    }

    return changes;
  }

  private calculateCoordinateSpread(coordinates: { x: number; y: number }[]): number {
    if (coordinates.length === 0) return 0;

    const xValues = coordinates.map(c => c.x);
    const yValues = coordinates.map(c => c.y);

    const xSpread = Math.max(...xValues) - Math.min(...xValues);
    const ySpread = Math.max(...yValues) - Math.min(...yValues);

    return Math.sqrt(xSpread * xSpread + ySpread * ySpread);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return this.calculateAverage(squaredDiffs);
  }

  /**
   * Create or update a signature profile for a signer
   */
  createSignatureProfile(
    signerName: string,
    biometricData: BiometricData
  ): SignatureProfile {
    const profile: SignatureProfile = {
      id: `profile_${signerName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
      signerName,
      averageVelocity: this.calculateAverage(biometricData.velocity),
      averagePressure: this.calculateAverage(biometricData.pressure),
      typicalStrokeCount: biometricData.strokeCount,
      characteristicPattern: this.extractCharacteristicPattern(biometricData),
      createdAt: new Date().toISOString(),
      updateCount: 1
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  private extractCharacteristicPattern(data: BiometricData): number[] {
    // Simplified pattern extraction - in production, this would be more sophisticated
    const pattern = [];
    const velocities = data.velocity.slice(0, 10); // First 10 velocity points
    const normalizedVelocities = velocities.map(v => Math.round(v * 100) / 100);
    return normalizedVelocities;
  }

  /**
   * Get validation statistics for monitoring
   */
  getValidationStats(): {
    totalValidations: number;
    averageConfidence: number;
    riskDistribution: { low: number; medium: number; high: number };
  } {
    // In a real implementation, this would track validation history
    return {
      totalValidations: 0,
      averageConfidence: 0,
      riskDistribution: { low: 0, medium: 0, high: 0 }
    };
  }
}

// Export singleton instance
export const signatureValidation = SignatureValidationService.getInstance();