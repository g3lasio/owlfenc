import { db } from "../db";
import { shortUrls, type InsertShortUrl } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

export class UrlShortenerService {
  static async generateShortCode(): Promise<string> {
    if (!db) throw new Error("Database not initialized");
    
    let shortCode: string;
    let exists = true;
    
    while (exists) {
      shortCode = nanoid();
      const [existing] = await db
        .select()
        .from(shortUrls)
        .where(eq(shortUrls.shortCode, shortCode))
        .limit(1);
      
      exists = !!existing;
    }
    
    return shortCode!;
  }

  static async createShortUrl(data: {
    originalUrl: string;
    firebaseUid: string;
    resourceType?: string;
    resourceId?: string;
    expiresAt?: Date;
  }): Promise<{ shortCode: string; shortUrl: string }> {
    if (!db) throw new Error("Database not initialized");
    
    // 🛡️ SECURITY: Validate URL protocol to prevent XSS/open-redirect attacks
    try {
      const url = new URL(data.originalUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Invalid protocol: ${url.protocol}. Only http and https are allowed.`);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
    
    const shortCode = await this.generateShortCode();
    
    await db.insert(shortUrls).values({
      shortCode,
      originalUrl: data.originalUrl,
      firebaseUid: data.firebaseUid,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      expiresAt: data.expiresAt,
    });

    const domain = process.env.SHORT_URL_DOMAIN || 'chyrris.com';
    const shortUrl = `https://${domain}/s/${shortCode}`;
    
    return { shortCode, shortUrl };
  }

  static async getOriginalUrl(shortCode: string): Promise<string | null> {
    if (!db) throw new Error("Database not initialized");
    
    const [record] = await db
      .select()
      .from(shortUrls)
      .where(eq(shortUrls.shortCode, shortCode))
      .limit(1);
    
    if (!record) {
      return null;
    }

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return null;
    }

    await db
      .update(shortUrls)
      .set({ clicks: record.clicks + 1 })
      .where(eq(shortUrls.shortCode, shortCode));
    
    return record.originalUrl;
  }

  static async getUserShortUrls(firebaseUid: string) {
    if (!db) throw new Error("Database not initialized");
    
    return await db
      .select()
      .from(shortUrls)
      .where(eq(shortUrls.firebaseUid, firebaseUid))
      .orderBy(shortUrls.createdAt);
  }
}
