/**
 * Rutas para el Sistema de Automatización con IA
 */

import express from 'express';
import { aiAutomationService } from '../services/aiAutomationService';

const router = express.Router();

/**
 * Configuración automática completa - Un solo botón
 * POST /api/ai-automation/auto-setup
 */
router.post('/auto-setup', async (req, res) => {
  try {
    const userInfo = req.body;
    
    console.log('🤖 Iniciando configuración automática completa...');
    
    const result = await aiAutomationService.autoConfigureEverything(userInfo);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Error en configuración automática:', error);
    res.status(500).json({
      success: false,
      message: 'Error en configuración automática',
      error: error.message
    });
  }
});

/**
 * Configuración automática de email únicamente
 * POST /api/ai-automation/email-setup
 */
router.post('/email-setup', async (req, res) => {
  try {
    const { email, companyName } = req.body;
    
    if (!email || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Email y nombre de empresa requeridos'
      });
    }
    
    const result = await aiAutomationService.autoConfigureEmail(email, companyName);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Error en configuración automática de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error en configuración automática de email',
      error: error.message
    });
  }
});

/**
 * Configuración automática de Stripe
 * POST /api/ai-automation/stripe-setup
 */
router.post('/stripe-setup', async (req, res) => {
  try {
    const businessInfo = req.body;
    
    const result = await aiAutomationService.autoConfigureStripe(businessInfo);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Error en configuración automática de Stripe:', error);
    res.status(500).json({
      success: false,
      message: 'Error en configuración automática de Stripe',
      error: error.message
    });
  }
});

/**
 * Completar perfil automáticamente
 * POST /api/ai-automation/complete-profile
 */
router.post('/complete-profile', async (req, res) => {
  try {
    const partialInfo = req.body;
    
    const result = await aiAutomationService.autoCompleteBusinessProfile(partialInfo);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Error completando perfil automáticamente:', error);
    res.status(500).json({
      success: false,
      message: 'Error completando perfil automáticamente',
      error: error.message
    });
  }
});

/**
 * Estado del servicio de automatización
 * GET /api/ai-automation/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      ai_services: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY
      },
      automation_ready: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
      features: [
        'Email automático',
        'Stripe automático', 
        'Perfil automático',
        'Configuración completa'
      ]
    };
    
    res.json(status);
    
  } catch (error: any) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado del servicio'
    });
  }
});

export default router;