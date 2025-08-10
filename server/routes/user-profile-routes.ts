import express, { Request, Response } from 'express';
import { z } from 'zod';

const router = express.Router();

// Company Profile Schema
const companyProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  businessType: z.string().optional(),
  projectVolume: z.string().optional(),
  mainChallenge: z.string().optional(),
});

// In-memory storage for company profiles (replace with database in production)
const companyProfiles: Map<string, any> = new Map();

// Get user company profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const { uid } = req.query;
    
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const profile = companyProfiles.get(uid);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save/Update user company profile
router.post('/company-profile', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      companyName,
      address,
      phone,
      email,
      businessType,
      projectVolume,
      mainChallenge
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate required fields
    const validationResult = companyProfileSchema.safeParse({
      companyName,
      address,
      phone,
      email,
      businessType,
      projectVolume,
      mainChallenge
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const profile = {
      ...validationResult.data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store profile (in production, save to database)
    companyProfiles.set(userId, profile);

    console.log(`✅ Company profile saved for user ${userId}:`, profile);

    res.json({ 
      success: true, 
      message: 'Company profile saved successfully',
      profile 
    });
  } catch (error) {
    console.error('Error saving company profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update specific profile fields
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const { uid, ...updates } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const existingProfile = companyProfiles.get(uid);
    
    if (!existingProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date()
    };

    companyProfiles.set(uid, updatedProfile);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has completed onboarding
router.get('/onboarding-status', async (req: Request, res: Response) => {
  try {
    const { uid } = req.query;
    
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const profile = companyProfiles.get(uid);
    const hasCompletedOnboarding = !!profile && !!profile.companyName;

    res.json({ 
      success: true, 
      hasCompletedOnboarding,
      hasProfile: !!profile
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;