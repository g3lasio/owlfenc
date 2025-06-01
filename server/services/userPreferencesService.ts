import { db } from '../db.js';
import { userPreferences, type UserPreferences, type InsertUserPreferences } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export class UserPreferencesService {
  static async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    try {
      const result = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw new Error('Failed to fetch user preferences');
    }
  }

  static async createDefaultPreferences(userId: number): Promise<UserPreferences> {
    try {
      const newPreferences: InsertUserPreferences = {
        userId,
        language: 'en',
        timezone: 'America/New_York',
        theme: 'system',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12',
        autoSaveEstimates: true,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        marketingEmails: false,
        weekStartsOn: 'sunday'
      };

      const result = await db
        .insert(userPreferences)
        .values(newPreferences)
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw new Error('Failed to create default preferences');
    }
  }

  static async updateUserPreferences(
    userId: number, 
    updates: Partial<InsertUserPreferences>
  ): Promise<UserPreferences> {
    try {
      // First check if preferences exist
      const existing = await this.getUserPreferences(userId);
      
      if (!existing) {
        // Create default preferences first
        await this.createDefaultPreferences(userId);
      }

      const result = await db
        .update(userPreferences)
        .set({ 
          ...updates, 
          updatedAt: new Date() 
        })
        .where(eq(userPreferences.userId, userId))
        .returning();

      if (result.length === 0) {
        throw new Error('Preferences not found after update');
      }

      return result[0];
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  static async getOrCreateUserPreferences(userId: number): Promise<UserPreferences> {
    try {
      let preferences = await this.getUserPreferences(userId);
      
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting or creating user preferences:', error);
      throw new Error('Failed to get or create user preferences');
    }
  }

  static async deleteUserPreferences(userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userPreferences)
        .where(eq(userPreferences.userId, userId));

      return true;
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      throw new Error('Failed to delete user preferences');
    }
  }

  static async updateSpecificPreference(
    userId: number,
    key: keyof Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    value: any
  ): Promise<UserPreferences> {
    try {
      const updates = { [key]: value };
      return await this.updateUserPreferences(userId, updates);
    } catch (error) {
      console.error(`Error updating preference ${key}:`, error);
      throw new Error(`Failed to update preference ${key}`);
    }
  }
}