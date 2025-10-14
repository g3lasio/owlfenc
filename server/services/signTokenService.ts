/**
 * Sign Token Service
 * Manages secure one-time tokens for signature links
 */

import crypto from 'crypto';
import { db } from '../db';
import { signTokens, contractAuditLog } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Token configuration
const TOKEN_EXPIRATION_HOURS = 72; // 3 days default
const TOKEN_LENGTH = 64; // 64 bytes = 128 hex characters

export interface GenerateTokenParams {
  contractId: string;
  party: 'client' | 'contractor';
  scope: 'view' | 'sign';
  expirationHours?: number;
  boundTo?: string; // Optional IP binding
}

export interface TokenValidationResult {
  isValid: boolean;
  token?: any;
  error?: string;
  errorCode?: string;
}

class SignTokenService {
  /**
   * Generate a cryptographically secure opaque token
   */
  private generateOpaqueToken(): string {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create a new sign token
   */
  async generateToken(params: GenerateTokenParams): Promise<string> {
    const { contractId, party, scope, expirationHours = TOKEN_EXPIRATION_HOURS, boundTo } = params;

    // Generate opaque token
    const token = this.generateOpaqueToken();

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    try {
      // Insert token into database
      await db.insert(signTokens).values({
        contractId,
        party,
        scope,
        token,
        expiresAt,
        boundTo: boundTo || null,
        used: false,
      });

      // Log token generation
      await db.insert(contractAuditLog).values({
        contractId,
        event: 'token_generated',
        party,
        metadata: {
          scope,
          expiresAt: expiresAt.toISOString(),
          boundTo: boundTo || null,
        },
      });

      console.log(`✅ [SIGN-TOKEN] Token generated for ${party} (${scope}): ${contractId}`);

      return token;
    } catch (error: any) {
      console.error('❌ [SIGN-TOKEN] Error generating token:', error);
      throw new Error(`Failed to generate sign token: ${error.message}`);
    }
  }

  /**
   * Validate a token
   * Checks: existence, expiration, used status, scope
   */
  async validateToken(
    token: string,
    expectedParty: 'client' | 'contractor',
    expectedScope: 'view' | 'sign',
    ipAddress?: string
  ): Promise<TokenValidationResult> {
    try {
      // Find token in database
      const results = await db
        .select()
        .from(signTokens)
        .where(eq(signTokens.token, token))
        .limit(1);

      if (results.length === 0) {
        return {
          isValid: false,
          error: 'Invalid token',
          errorCode: 'INVALID_TOKEN',
        };
      }

      const tokenData = results[0];

      // Check if token is already used
      if (tokenData.used) {
        console.warn(`🚨 [SIGN-TOKEN] Token already used: ${token.substring(0, 16)}...`);
        return {
          isValid: false,
          error: 'Token has already been used',
          errorCode: 'TOKEN_USED',
        };
      }

      // Check if token is expired
      if (new Date() > new Date(tokenData.expiresAt)) {
        console.warn(`🚨 [SIGN-TOKEN] Token expired: ${token.substring(0, 16)}...`);
        return {
          isValid: false,
          error: 'Token has expired',
          errorCode: 'TOKEN_EXPIRED',
        };
      }

      // Check party match
      if (tokenData.party !== expectedParty) {
        console.warn(`🚨 [SIGN-TOKEN] Party mismatch: expected ${expectedParty}, got ${tokenData.party}`);
        return {
          isValid: false,
          error: 'Token party mismatch',
          errorCode: 'PARTY_MISMATCH',
        };
      }

      // Check scope match
      if (tokenData.scope !== expectedScope) {
        console.warn(`🚨 [SIGN-TOKEN] Scope mismatch: expected ${expectedScope}, got ${tokenData.scope}`);
        return {
          isValid: false,
          error: 'Token scope mismatch',
          errorCode: 'SCOPE_MISMATCH',
        };
      }

      // Check IP binding if specified
      if (tokenData.boundTo && ipAddress && tokenData.boundTo !== ipAddress) {
        console.warn(`🚨 [SIGN-TOKEN] IP mismatch: bound to ${tokenData.boundTo}, got ${ipAddress}`);
        return {
          isValid: false,
          error: 'IP address mismatch',
          errorCode: 'IP_MISMATCH',
        };
      }

      console.log(`✅ [SIGN-TOKEN] Token validated successfully: ${tokenData.contractId} (${tokenData.party})`);

      return {
        isValid: true,
        token: tokenData,
      };
    } catch (error: any) {
      console.error('❌ [SIGN-TOKEN] Error validating token:', error);
      return {
        isValid: false,
        error: 'Token validation failed',
        errorCode: 'VALIDATION_ERROR',
      };
    }
  }

  /**
   * Mark a token as used (atomically)
   */
  async markTokenAsUsed(token: string, ipAddress?: string): Promise<void> {
    try {
      // Update token atomically
      await db
        .update(signTokens)
        .set({
          used: true,
          usedAt: new Date(),
        })
        .where(
          and(
            eq(signTokens.token, token),
            eq(signTokens.used, false) // Ensure it's not already used
          )
        );

      // Get token data for logging
      const results = await db
        .select()
        .from(signTokens)
        .where(eq(signTokens.token, token))
        .limit(1);

      if (results.length > 0) {
        const tokenData = results[0];

        // Log token usage
        await db.insert(contractAuditLog).values({
          contractId: tokenData.contractId,
          event: 'token_used',
          party: tokenData.party,
          ipAddress: ipAddress || null,
          metadata: {
            scope: tokenData.scope,
            usedAt: new Date().toISOString(),
          },
        });

        console.log(`✅ [SIGN-TOKEN] Token marked as used: ${tokenData.contractId} (${tokenData.party})`);
      }
    } catch (error: any) {
      console.error('❌ [SIGN-TOKEN] Error marking token as used:', error);
      throw new Error(`Failed to mark token as used: ${error.message}`);
    }
  }

  /**
   * Revoke a token (mark as used to prevent future use)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await db
        .update(signTokens)
        .set({
          used: true,
          usedAt: new Date(),
        })
        .where(eq(signTokens.token, token));

      console.log(`✅ [SIGN-TOKEN] Token revoked: ${token.substring(0, 16)}...`);
    } catch (error: any) {
      console.error('❌ [SIGN-TOKEN] Error revoking token:', error);
      throw new Error(`Failed to revoke token: ${error.message}`);
    }
  }

  /**
   * Clean up expired tokens (maintenance task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await db
        .delete(signTokens)
        .where(and(eq(signTokens.used, false), eq(signTokens.expiresAt, new Date())));

      console.log(`✅ [SIGN-TOKEN] Cleaned up expired tokens`);
      return 0; // Drizzle doesn't return count easily, return 0 for now
    } catch (error: any) {
      console.error('❌ [SIGN-TOKEN] Error cleaning up tokens:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const signTokenService = new SignTokenService();
