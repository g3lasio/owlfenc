/**
 * API de restablecimiento de contraseña usando backend Resend
 */

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerify {
  token: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

const API_BASE = '/api/password-reset';

export async function requestPasswordReset(email: string): Promise<ApiResponse> {
  try {
    console.log('🔐 [FRONTEND] Solicitando restablecimiento para:', email);

    const response = await fetch(`${API_BASE}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to request password reset');
    }

    console.log('✅ [FRONTEND] Solicitud enviada exitosamente');
    return data;
  } catch (error) {
    console.error('❌ [FRONTEND] Error en solicitud:', error);
    throw error;
  }
}

export async function verifyPasswordResetToken(token: string): Promise<ApiResponse> {
  try {
    console.log('🔐 [FRONTEND] Verificando token de restablecimiento');

    const response = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Invalid or expired token');
    }

    console.log('✅ [FRONTEND] Token verificado exitosamente');
    return data;
  } catch (error) {
    console.error('❌ [FRONTEND] Error verificando token:', error);
    throw error;
  }
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<ApiResponse> {
  try {
    console.log('🔐 [FRONTEND] Confirmando nuevo password');

    const response = await fetch(`${API_BASE}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }

    console.log('✅ [FRONTEND] Password restablecido exitosamente');
    return data;
  } catch (error) {
    console.error('❌ [FRONTEND] Error confirmando reset:', error);
    throw error;
  }
}