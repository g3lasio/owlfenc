/**
 * Profile Validation Utility
 * 
 * Utilidad para validar que el usuario tenga un perfil completo
 * antes de generar documentos (estimates, contracts, invoices)
 */

export interface ProfileValidationResult {
  valid: boolean;
  missingFields: string[];
  message?: string;
}

export interface CompanyProfile {
  companyName?: string;
  address?: string;
  phone?: string;
  email?: string;
  ownerName?: string;
  license?: string;
  logo?: string;
  website?: string;
}

/**
 * Valida que el perfil tenga los campos mínimos requeridos
 */
export function validateProfile(profile: CompanyProfile | null): ProfileValidationResult {
  if (!profile) {
    return {
      valid: false,
      missingFields: ['all'],
      message: 'No profile found. Please complete your company profile.'
    };
  }

  const missingFields: string[] = [];

  // Campos requeridos
  if (!profile.companyName) missingFields.push('Company Name');
  if (!profile.address) missingFields.push('Address');
  if (!profile.phone) missingFields.push('Phone');
  if (!profile.email) missingFields.push('Email');

  if (missingFields.length > 0) {
    return {
      valid: false,
      missingFields,
      message: `Please complete the following fields in your profile: ${missingFields.join(', ')}`
    };
  }

  return {
    valid: true,
    missingFields: []
  };
}

/**
 * Obtiene el perfil del usuario desde la API
 */
export async function fetchUserProfile(): Promise<CompanyProfile | null> {
  try {
    const response = await fetch('/api/user-profile/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }

    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Valida el perfil del usuario antes de generar documentos
 * Retorna true si el perfil es válido, false si no
 * Muestra notificación al usuario si el perfil está incompleto
 */
export async function validateProfileBeforeGeneration(
  onInvalidProfile?: (result: ProfileValidationResult) => void
): Promise<boolean> {
  const profile = await fetchUserProfile();
  const validation = validateProfile(profile);

  if (!validation.valid && onInvalidProfile) {
    onInvalidProfile(validation);
  }

  return validation.valid;
}

/**
 * Formatea los campos faltantes para mostrar al usuario
 */
export function formatMissingFields(missingFields: string[]): string {
  if (missingFields.length === 0) return '';
  if (missingFields.includes('all')) return 'complete your profile';
  
  if (missingFields.length === 1) {
    return missingFields[0];
  }
  
  if (missingFields.length === 2) {
    return `${missingFields[0]} and ${missingFields[1]}`;
  }
  
  const lastField = missingFields[missingFields.length - 1];
  const otherFields = missingFields.slice(0, -1).join(', ');
  return `${otherFields}, and ${lastField}`;
}
