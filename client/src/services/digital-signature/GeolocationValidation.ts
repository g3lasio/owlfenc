/**
 * Geolocation Validation Service for Digital Contract Signing
 * Provides location-based authentication and contract jurisdiction validation
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  formattedAddress: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
  locationData: LocationData;
  addressInfo?: AddressInfo;
  jurisdictionMatch: boolean;
  distanceFromProject?: number; // meters
  timezone: string;
  ipLocation?: {
    country: string;
    region: string;
    city: string;
    match: boolean;
  };
}

export interface ContractJurisdiction {
  country: string;
  state: string;
  city?: string;
  allowedRadius?: number; // meters
  requiresPhysicalPresence: boolean;
  legalRequirements: string[];
}

export interface LocationSignatureMetadata {
  location: LocationData;
  address?: AddressInfo;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  timezone: string;
  deviceOrientation?: {
    alpha: number;
    beta: number;
    gamma: number;
  };
  batteryLevel?: number;
  connectionType?: string;
}

export class GeolocationValidationService {
  private static instance: GeolocationValidationService;
  private watchId: number | null = null;
  private lastKnownLocation: LocationData | null = null;
  private validationHistory: Map<string, LocationValidationResult> = new Map();

  // Validation thresholds
  private readonly VALIDATION_THRESHOLDS = {
    MIN_ACCURACY: 100, // meters
    MAX_AGE: 5 * 60 * 1000, // 5 minutes
    MIN_CONFIDENCE: 70,
    MAX_DISTANCE_FROM_PROJECT: 50000, // 50km
    IP_LOCATION_TOLERANCE: 100000 // 100km for IP vs GPS comparison
  };

  static getInstance(): GeolocationValidationService {
    if (!GeolocationValidationService.instance) {
      GeolocationValidationService.instance = new GeolocationValidationService();
    }
    return GeolocationValidationService.instance;
  }

  /**
   * Request user's current location with high accuracy
   */
  async getCurrentLocation(highAccuracy = true): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: 15000, // 15 seconds
        maximumAge: 60000 // 1 minute cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined
          };

          this.lastKnownLocation = locationData;
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Unknown geolocation error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied the request for geolocation';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Validate location for contract signing
   */
  async validateLocationForSigning(
    contractJurisdiction: ContractJurisdiction,
    projectLocation?: { latitude: number; longitude: number; address: string }
  ): Promise<LocationValidationResult> {
    const issues: string[] = [];
    let confidence = 100;

    try {
      // Get current location
      const locationData = await this.getCurrentLocation(true);
      
      // Validate accuracy
      if (locationData.accuracy > this.VALIDATION_THRESHOLDS.MIN_ACCURACY) {
        issues.push(`Baja precisión de ubicación (${locationData.accuracy}m > ${this.VALIDATION_THRESHOLDS.MIN_ACCURACY}m)`);
        confidence -= 20;
      }

      // Get address information
      const addressInfo = await this.reverseGeocode(locationData.latitude, locationData.longitude);
      
      // Validate jurisdiction
      const jurisdictionMatch = this.validateJurisdiction(addressInfo, contractJurisdiction);
      if (!jurisdictionMatch) {
        issues.push('Ubicación fuera de la jurisdicción del contrato');
        confidence -= 30;
      }

      // Calculate distance from project if provided
      let distanceFromProject;
      if (projectLocation) {
        distanceFromProject = this.calculateDistance(
          locationData.latitude,
          locationData.longitude,
          projectLocation.latitude,
          projectLocation.longitude
        );

        if (distanceFromProject > this.VALIDATION_THRESHOLDS.MAX_DISTANCE_FROM_PROJECT) {
          issues.push(`Ubicación muy lejana del proyecto (${(distanceFromProject / 1000).toFixed(1)}km)`);
          confidence -= 15;
        }
      }

      // Get timezone
      const timezone = this.getTimezone(locationData.latitude, locationData.longitude);

      // Validate against IP location
      const ipLocation = await this.getIPLocation();
      const ipLocationMatch = this.validateIPLocation(locationData, ipLocation);
      if (!ipLocationMatch.match) {
        issues.push('Discrepancia entre ubicación GPS e IP');
        confidence -= 10;
      }

      // Determine risk level
      const riskLevel = this.assessLocationRisk(confidence, issues.length, addressInfo);

      const result: LocationValidationResult = {
        isValid: confidence >= this.VALIDATION_THRESHOLDS.MIN_CONFIDENCE && issues.length <= 2,
        confidence: Math.max(0, confidence),
        riskLevel,
        issues,
        locationData,
        addressInfo,
        jurisdictionMatch,
        distanceFromProject,
        timezone,
        ipLocation
      };

      // Store validation result
      const validationId = `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.validationHistory.set(validationId, result);

      return result;

    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        riskLevel: 'high',
        issues: [`Error de geolocalización: ${error}`],
        locationData: this.lastKnownLocation || {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: new Date().toISOString()
        },
        jurisdictionMatch: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
  }

  /**
   * Collect comprehensive location metadata for signature
   */
  async collectSignatureLocationMetadata(): Promise<LocationSignatureMetadata> {
    const location = await this.getCurrentLocation(true);
    const address = await this.reverseGeocode(location.latitude, location.longitude);
    
    // Get device orientation if available
    let deviceOrientation;
    if (window.DeviceOrientationEvent) {
      deviceOrientation = await this.getDeviceOrientation();
    }

    // Get battery level if available
    let batteryLevel;
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        batteryLevel = Math.round(battery.level * 100);
      } catch (error) {
        // Battery API not available
      }
    }

    // Get connection type
    let connectionType;
    if ('connection' in navigator) {
      connectionType = (navigator as any).connection?.effectiveType || 'unknown';
    }

    return {
      location,
      address,
      ipAddress: await this.getPublicIPAddress(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceOrientation,
      batteryLevel,
      connectionType
    };
  }

  /**
   * Reverse geocode coordinates to address
   */
  private async reverseGeocode(latitude: number, longitude: number): Promise<AddressInfo> {
    try {
      // Using a free geocoding service (in production, use Google Maps API or similar)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          street: data.localityInfo?.administrative?.[3]?.name || '',
          city: data.city || data.locality || '',
          state: data.principalSubdivision || '',
          country: data.countryName || '',
          postalCode: data.postcode || '',
          formattedAddress: data.locality || `${latitude}, ${longitude}`
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    // Fallback
    return {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      formattedAddress: `${latitude}, ${longitude}`
    };
  }

  /**
   * Validate jurisdiction compliance
   */
  private validateJurisdiction(address: AddressInfo, jurisdiction: ContractJurisdiction): boolean {
    // Country match is mandatory
    if (address.country.toLowerCase() !== jurisdiction.country.toLowerCase()) {
      return false;
    }

    // State match if specified
    if (jurisdiction.state && address.state.toLowerCase() !== jurisdiction.state.toLowerCase()) {
      return false;
    }

    // City match if specified
    if (jurisdiction.city && address.city.toLowerCase() !== jurisdiction.city.toLowerCase()) {
      return false;
    }

    return true;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get timezone for coordinates
   */
  private getTimezone(latitude: number, longitude: number): string {
    // Simplified timezone detection (in production, use a proper timezone API)
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Get IP-based location
   */
  private async getIPLocation(): Promise<{ country: string; region: string; city: string; lat?: number; lon?: number }> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name || '',
          region: data.region || '',
          city: data.city || '',
          lat: data.latitude,
          lon: data.longitude
        };
      }
    } catch (error) {
      console.warn('IP location lookup failed:', error);
    }

    return {
      country: '',
      region: '',
      city: ''
    };
  }

  /**
   * Validate GPS location against IP location
   */
  private validateIPLocation(
    gpsLocation: LocationData, 
    ipLocation: { country: string; region: string; city: string; lat?: number; lon?: number }
  ): { match: boolean; distance?: number } {
    if (!ipLocation.lat || !ipLocation.lon) {
      return { match: true }; // Can't compare without IP coordinates
    }

    const distance = this.calculateDistance(
      gpsLocation.latitude,
      gpsLocation.longitude,
      ipLocation.lat,
      ipLocation.lon
    );

    return {
      match: distance <= this.VALIDATION_THRESHOLDS.IP_LOCATION_TOLERANCE,
      distance
    };
  }

  /**
   * Assess overall location risk
   */
  private assessLocationRisk(confidence: number, issueCount: number, address: AddressInfo): 'low' | 'medium' | 'high' {
    if (confidence >= 90 && issueCount === 0) {
      return 'low';
    } else if (confidence >= 70 && issueCount <= 2) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Get device orientation
   */
  private async getDeviceOrientation(): Promise<{ alpha: number; beta: number; gamma: number } | undefined> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(undefined), 1000);
      
      const handleOrientation = (event: DeviceOrientationEvent) => {
        clearTimeout(timeout);
        window.removeEventListener('deviceorientation', handleOrientation);
        
        resolve({
          alpha: event.alpha || 0,
          beta: event.beta || 0,
          gamma: event.gamma || 0
        });
      };

      window.addEventListener('deviceorientation', handleOrientation);
    });
  }

  /**
   * Get public IP address
   */
  private async getPublicIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        return data.ip;
      }
    } catch (error) {
      console.warn('IP address lookup failed:', error);
    }
    return 'unknown';
  }

  /**
   * Start continuous location monitoring
   */
  startLocationMonitoring(callback: (location: LocationData) => void): void {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        };

        this.lastKnownLocation = locationData;
        callback(locationData);
      },
      (error) => {
        console.warn('Location monitoring error:', error);
      },
      options
    );
  }

  /**
   * Stop location monitoring
   */
  stopLocationMonitoring(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Check if location services are available
   */
  isLocationAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get validation history
   */
  getValidationHistory(): LocationValidationResult[] {
    return Array.from(this.validationHistory.values())
      .sort((a, b) => new Date(b.locationData.timestamp).getTime() - new Date(a.locationData.timestamp).getTime());
  }

  /**
   * Clean up old validation records
   */
  cleanupValidationHistory(): number {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let removedCount = 0;

    for (const [id, validation] of this.validationHistory.entries()) {
      if (new Date(validation.locationData.timestamp) < cutoffTime) {
        this.validationHistory.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    isAvailable: boolean;
    lastKnownLocation: LocationData | null;
    validationCount: number;
    monitoringActive: boolean;
  } {
    return {
      isAvailable: this.isLocationAvailable(),
      lastKnownLocation: this.lastKnownLocation,
      validationCount: this.validationHistory.size,
      monitoringActive: this.watchId !== null
    };
  }
}

// Export singleton instance
export const geolocationValidation = GeolocationValidationService.getInstance();