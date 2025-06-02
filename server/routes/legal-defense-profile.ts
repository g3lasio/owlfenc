
import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const router = Router();

const LegalDefenseProfileSchema = z.object({
  businessStructure: z.string(),
  einNumber: z.string(),
  licenses: z.array(z.object({
    type: z.string(),
    number: z.string(),
    issuer: z.string(),
    expirationDate: z.string(),
    jurisdiction: z.string()
  })),
  insurance: z.array(z.object({
    type: z.string(),
    carrier: z.string(),
    policyNumber: z.string(),
    coverage: z.string(),
    limits: z.string(),
    expirationDate: z.string()
  })),
  bonding: z.object({
    available: z.boolean(),
    capacity: z.string(),
    bondingCompany: z.string()
  }),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
  preferredClauses: z.array(z.string()),
  pastLegalIssues: z.array(z.string()),
  specialtyVulnerabilities: z.array(z.string()),
  operatingStates: z.array(z.string()),
  localCodes: z.array(z.string()),
  knownPrecedents: z.array(z.string()),
  contractSuccesses: z.array(z.string()),
  lessonsLearned: z.array(z.string()),
  clientRedFlags: z.array(z.string())
});

// Obtener perfil de defensa legal
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Default para desarrollo
    
    // Intentar cargar desde la base de datos
    const profile = await storage.getSettings(userId);
    
    if (profile?.legalDefenseProfile) {
      res.json(profile.legalDefenseProfile);
    } else {
      // Retornar perfil vacío si no existe
      res.json({
        businessStructure: '',
        einNumber: '',
        licenses: [],
        insurance: [],
        bonding: { available: false, capacity: '', bondingCompany: '' },
        riskTolerance: 'moderate',
        preferredClauses: [],
        pastLegalIssues: [],
        specialtyVulnerabilities: [],
        operatingStates: [],
        localCodes: [],
        knownPrecedents: [],
        contractSuccesses: [],
        lessonsLearned: [],
        clientRedFlags: []
      });
    }
  } catch (error) {
    console.error('Error loading legal defense profile:', error);
    res.status(500).json({ error: 'Error loading legal profile' });
  }
});

// Guardar perfil de defensa legal
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Default para desarrollo
    const profileData = LegalDefenseProfileSchema.parse(req.body);
    
    // Actualizar configuraciones del usuario con el perfil legal
    await storage.updateSettings(userId, {
      legalDefenseProfile: profileData
    });
    
    res.json({ success: true, message: 'Legal defense profile saved successfully' });
  } catch (error) {
    console.error('Error saving legal defense profile:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid profile data', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Error saving legal profile' });
  }
});

// Obtener configuración específica para el motor de defensa legal
router.get('/defense-config/:projectType', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { projectType } = req.params;
    
    const profile = await storage.getSettings(userId);
    const legalProfile = profile?.legalDefenseProfile;
    
    if (!legalProfile) {
      return res.json({ 
        hasProfile: false, 
        recommendations: ['Configure su perfil legal para mejor protección'] 
      });
    }
    
    // Generar configuración de defensa basada en el perfil
    const defenseConfig = {
      hasProfile: true,
      businessStructure: legalProfile.businessStructure,
      riskLevel: calculateRiskLevel(legalProfile, projectType),
      recommendedClauses: generateRecommendedClauses(legalProfile, projectType),
      jurisdictionalWarnings: checkJurisdictionalIssues(legalProfile),
      insuranceStatus: checkInsuranceAdequacy(legalProfile, projectType),
      licenseStatus: checkLicenseValidity(legalProfile)
    };
    
    res.json(defenseConfig);
  } catch (error) {
    console.error('Error generating defense config:', error);
    res.status(500).json({ error: 'Error generating defense configuration' });
  }
});

// Funciones auxiliares para análisis de riesgo
function calculateRiskLevel(profile: any, projectType: string): string {
  let riskScore = 0;
  
  // Factores que aumentan riesgo
  if (profile.pastLegalIssues.length > 0) riskScore += 2;
  if (profile.specialtyVulnerabilities.some((v: string) => 
    v.toLowerCase().includes(projectType.toLowerCase()))) riskScore += 3;
  if (profile.insurance.length === 0) riskScore += 3;
  if (profile.licenses.length === 0) riskScore += 2;
  
  // Factores que reducen riesgo
  if (profile.contractSuccesses.length > 2) riskScore -= 1;
  if (profile.bonding.available) riskScore -= 1;
  if (profile.riskTolerance === 'conservative') riskScore -= 1;
  
  if (riskScore >= 5) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

function generateRecommendedClauses(profile: any, projectType: string): string[] {
  const clauses = [];
  
  // Cláusulas basadas en experiencia pasada
  if (profile.pastLegalIssues.some((issue: string) => 
    issue.toLowerCase().includes('payment'))) {
    clauses.push('ENHANCED_PAYMENT_TERMS');
    clauses.push('LIEN_RIGHTS');
  }
  
  if (profile.pastLegalIssues.some((issue: string) => 
    issue.toLowerCase().includes('scope'))) {
    clauses.push('STRICT_SCOPE_DEFINITION');
    clauses.push('CHANGE_ORDER_PROTECTION');
  }
  
  // Cláusulas basadas en estructura del negocio
  if (profile.businessStructure === 'LLC') {
    clauses.push('PERSONAL_GUARANTEE_LIMITATION');
  }
  
  // Cláusulas basadas en seguros
  if (profile.insurance.length > 0) {
    clauses.push('INSURANCE_COORDINATION');
  }
  
  return clauses;
}

function checkJurisdictionalIssues(profile: any): string[] {
  const warnings = [];
  
  if (profile.operatingStates.length > 1) {
    warnings.push('Multi-state operations require jurisdiction clause');
  }
  
  if (profile.localCodes.length > 0) {
    warnings.push('Local code compliance clauses recommended');
  }
  
  return warnings;
}

function checkInsuranceAdequacy(profile: any, projectType: string): any {
  const requiredTypes = ['General Liability', 'Workers Comp'];
  const missing = requiredTypes.filter(type => 
    !profile.insurance.some((ins: any) => ins.type === type)
  );
  
  return {
    adequate: missing.length === 0,
    missing: missing,
    recommendations: missing.map(type => 
      `Consider adding ${type} coverage for better protection`
    )
  };
}

function checkLicenseValidity(profile: any): any {
  const today = new Date();
  const expiringSoon = profile.licenses.filter((license: any) => {
    const expDate = new Date(license.expirationDate);
    const daysUntilExpiry = (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  });
  
  const expired = profile.licenses.filter((license: any) => {
    const expDate = new Date(license.expirationDate);
    return expDate < today;
  });
  
  return {
    valid: expired.length === 0,
    expiringSoon: expiringSoon,
    expired: expired,
    warnings: [
      ...expired.map((lic: any) => `License ${lic.number} has expired`),
      ...expiringSoon.map((lic: any) => `License ${lic.number} expires soon`)
    ]
  };
}

export default router;
