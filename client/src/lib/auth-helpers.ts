import { 
  getAuth, 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword,
  updateEmail 
} from 'firebase/auth';

/**
 * Change user password with reauthentication (secure method)
 * Requires current password to verify user identity
 */
export async function changePasswordWithReauth(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user || !user.email) {
    return { 
      success: false, 
      error: 'No user signed in' 
    };
  }

  try {
    // Create credential with current email and password
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    // Reauthenticate user
    await reauthenticateWithCredential(user, credential);
    console.log('✅ [PASSWORD-CHANGE] Reauthentication successful');

    // Update to new password
    await updatePassword(user, newPassword);
    console.log('✅ [PASSWORD-CHANGE] Password updated successfully');
    
    return { 
      success: true,
      message: 'Password updated successfully!' 
    };
  } catch (error: any) {
    console.error('❌ [PASSWORD-CHANGE] Error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/wrong-password') {
      return { 
        success: false, 
        error: 'Current password is incorrect' 
      };
    } else if (error.code === 'auth/weak-password') {
      return { 
        success: false, 
        error: 'New password is too weak. Please use at least 6 characters.' 
      };
    } else if (error.code === 'auth/requires-recent-login') {
      return { 
        success: false, 
        error: 'Please sign out and sign in again before changing your password' 
      };
    } else if (error.code === 'auth/invalid-credential') {
      return { 
        success: false, 
        error: 'Current password is incorrect' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to update password. Please try again.' 
    };
  }
}

/**
 * Change user email with reauthentication (secure method)
 * Requires current password to verify user identity before changing email
 */
export async function changeEmailWithReauth(
  currentPassword: string,
  newEmail: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user || !user.email) {
    return { 
      success: false, 
      error: 'No user signed in' 
    };
  }

  try {
    // Create credential with current email and password
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    // Reauthenticate user
    await reauthenticateWithCredential(user, credential);
    console.log('✅ [EMAIL-CHANGE] Reauthentication successful');

    // Update email
    await updateEmail(user, newEmail);
    console.log('✅ [EMAIL-CHANGE] Email updated successfully');
    
    return { 
      success: true,
      message: 'Email updated successfully! Please verify your new email address.' 
    };
  } catch (error: any) {
    console.error('❌ [EMAIL-CHANGE] Error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/wrong-password') {
      return { 
        success: false, 
        error: 'Current password is incorrect' 
      };
    } else if (error.code === 'auth/email-already-in-use') {
      return { 
        success: false, 
        error: 'Email address is already in use by another account' 
      };
    } else if (error.code === 'auth/invalid-email') {
      return { 
        success: false, 
        error: 'Please provide a valid email address' 
      };
    } else if (error.code === 'auth/requires-recent-login') {
      return { 
        success: false, 
        error: 'Please sign out and sign in again before changing your email' 
      };
    } else if (error.code === 'auth/invalid-credential') {
      return { 
        success: false, 
        error: 'Current password is incorrect' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to update email. Please try again.' 
    };
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // Optional: Add more validation rules
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
