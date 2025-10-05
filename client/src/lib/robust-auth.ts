/**
 * ROBUST AUTHENTICATION CLIENT
 * Conecta Firebase con sistema robusto PostgreSQL
 */

import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface RobustUserData {
  success: boolean;
  user: {
    firebaseUid: string;
    email: string;
    internalUserId: number;
    isAuthenticated: boolean;
  };
  subscription: {
    active: boolean;
    status: string;
    planName?: string;
    features?: any;
    daysRemaining: number;
    isTrialing: boolean;
  };
  systemInfo: {
    dataSource: string;
    mappingService: string;
    subscriptionSystem: string;
  };
}

class RobustAuthService {
  private currentUser: RobustUserData | null = null;
  private listeners: ((user: RobustUserData | null) => void)[] = [];

  constructor() {
    this.initializeAuthListener();
  }

  private initializeAuthListener() {
    onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        console.log('🔐 [ROBUST-AUTH] Firebase user signed in, getting complete data...');
        try {
          const userData = await this.getUserData(firebaseUser);
          this.currentUser = userData;
          this.notifyListeners(userData);
        } catch (error) {
          console.error('❌ [ROBUST-AUTH] Error getting user data:', error);
          this.currentUser = null;
          this.notifyListeners(null);
        }
      } else {
        console.log('🔓 [ROBUST-AUTH] User signed out');
        this.currentUser = null;
        this.notifyListeners(null);
      }
    });
  }

  private async getUserData(firebaseUser: User): Promise<RobustUserData> {
    // 🔐 CRITICAL FIX: Obtener idToken del usuario autenticado
    let idToken: string | undefined;
    try {
      idToken = await firebaseUser.getIdToken();
    } catch (tokenError) {
      console.error('❌ [ROBUST-AUTH] Error getting ID token:', tokenError);
    }

    const response = await fetch('/api/auth/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        firebaseUid: firebaseUser.uid, 
        email: firebaseUser.email,
        idToken: idToken || ''
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get user data: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to get user data');
    }

    return data;
  }

  public getCurrentUser(): RobustUserData | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.user.isAuthenticated;
  }

  public hasActiveSubscription(): boolean {
    return this.currentUser?.subscription.active || false;
  }

  public getSubscriptionStatus(): string {
    return this.currentUser?.subscription.status || 'none';
  }

  public getDaysRemaining(): number {
    return this.currentUser?.subscription.daysRemaining || 0;
  }

  public canUseFeature(feature: string): boolean {
    const features = this.currentUser?.subscription.features;
    if (!features) return false;
    return features[feature] && features[feature] > 0;
  }

  public onAuthStateChanged(callback: (user: RobustUserData | null) => void) {
    this.listeners.push(callback);
    
    // Call immediately if we have current user data
    if (this.currentUser) {
      callback(this.currentUser);
    }

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(user: RobustUserData | null) {
    this.listeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('❌ [ROBUST-AUTH] Error in auth listener:', error);
      }
    });
  }

  public async checkFeatureAccess(feature: string): Promise<{
    canAccess: boolean;
    usage: { used: number; limit: number; isUnlimited: boolean };
    planName?: string;
  }> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/auth/can-access/${this.currentUser.user.firebaseUid}/${feature}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check feature access: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to check feature access');
    }

    return {
      canAccess: data.canAccess,
      usage: data.usage,
      planName: data.planName
    };
  }
}

// Export singleton instance
export const robustAuth = new RobustAuthService();

// Export types
export type { RobustUserData };