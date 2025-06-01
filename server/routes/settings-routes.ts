import express from 'express';
import { UserPreferencesService } from '../services/userPreferencesService.js';
import { SubscriptionService } from '../services/subscriptionService.js';
import { insertUserPreferencesSchema } from '../../shared/schema.js';
import { z } from 'zod';

const router = express.Router();

// Initialize default subscription plans
SubscriptionService.initializeDefaultPlans();

// User Preferences Routes
router.get('/preferences', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const preferences = await UserPreferencesService.getOrCreateUserPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const updateSchema = insertUserPreferencesSchema.partial().omit({ userId: true });
    const validatedData = updateSchema.parse(req.body);

    const updatedPreferences = await UserPreferencesService.updateUserPreferences(
      req.user.id,
      validatedData
    );

    res.json(updatedPreferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.patch('/preferences/:key', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { key } = req.params;
    const { value } = req.body;

    const updatedPreferences = await UserPreferencesService.updateSpecificPreference(
      req.user.id,
      key as any,
      value
    );

    res.json(updatedPreferences);
  } catch (error) {
    console.error(`Error updating preference ${req.params.key}:`, error);
    res.status(500).json({ error: `Failed to update preference ${req.params.key}` });
  }
});

// Subscription Routes
router.get('/subscription/plans', async (req, res) => {
  try {
    const plans = await SubscriptionService.getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

router.get('/subscription/current', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await SubscriptionService.getUserSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ error: 'Failed to fetch current subscription' });
  }
});

router.post('/subscription/create', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { planId, billingCycle = 'monthly' } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    const result = await SubscriptionService.createSubscription(
      req.user.id,
      parseInt(planId),
      billingCycle
    );

    res.json(result);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.post('/subscription/cancel', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await SubscriptionService.cancelSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.post('/subscription/reactivate', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await SubscriptionService.reactivateSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

router.get('/billing/history', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const history = await SubscriptionService.getPaymentHistory(req.user.id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Stripe Webhook
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      return res.status(400).json({ error: 'Stripe webhook secret not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    await SubscriptionService.handleStripeWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

export default router;