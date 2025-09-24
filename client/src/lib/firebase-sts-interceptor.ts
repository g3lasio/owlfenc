// 🛡️ SMART FIREBASE STS ERROR SUPPRESSION - Intelligent error elimination
// Suppresses "Failed to fetch" errors from Firebase STS WITHOUT breaking real authentication

// Firebase STS error patterns to suppress
const STS_ERROR_PATTERNS = [
  'securetoken.googleapis.com',
  'identitytoolkit.googleapis.com',
  'requestStsToken',
  '_StsTokenManager',
  '_performFetchWithErrorHandling',
  '_logoutIfInvalidated',
  '_reloadWithoutSaving'
];

// Check if error is a Firebase STS background error (not user-initiated)
const isStsBackgroundError = (error: any): boolean => {
  if (!error || typeof error.message !== 'string') return false;
  
  // Must be a fetch error
  if (!error.message.includes('Failed to fetch')) return false;
  
  // Must be from Firebase auth stack
  if (!error.stack || !error.stack.includes('firebase_auth.js')) return false;
  
  // Must match STS patterns
  return STS_ERROR_PATTERNS.some(pattern => 
    error.message.includes(pattern) || 
    (error.stack && error.stack.includes(pattern))
  );
};

// Track active authentication flows to avoid suppressing legitimate errors
let activeAuthFlows = new Set<string>();

// Mark start of auth flow (login/register)
export const markAuthFlowStart = (flowId: string) => {
  activeAuthFlows.add(flowId);
  setTimeout(() => {
    activeAuthFlows.delete(flowId); // Auto-cleanup after 30 seconds
  }, 30000);
};

// Mark end of auth flow
export const markAuthFlowEnd = (flowId: string) => {
  activeAuthFlows.delete(flowId);
};

// Initialize smart STS error suppression
export const initializeStsFetchInterceptor = () => {
  console.log('🛡️ [SMART-STS-SUPPRESSOR] Initializing intelligent STS error suppression...');
  
  // Handle unhandled promise rejections for STS background errors
  const originalRejectionHandler = window.onunhandledrejection;
  
  window.onunhandledrejection = (event) => {
    const error = event.reason;
    
    // Check if it's a background STS error (not during active auth)
    if (isStsBackgroundError(error)) {
      // If there are active auth flows, let the error through (might be legitimate)
      if (activeAuthFlows.size > 0) {
        console.debug('🛡️ [SMART-STS-SUPPRESSOR] Active auth flow detected - allowing error through');
        if (originalRejectionHandler) {
          originalRejectionHandler(event);
        }
        return;
      }
      
      // This is a background STS error - suppress it
      console.debug('🛡️ [SMART-STS-SUPPRESSOR] Suppressing background Firebase STS error');
      event.preventDefault(); // Prevent the error from appearing in console
      return;
    }
    
    // Let other unhandled rejections proceed normally
    if (originalRejectionHandler) {
      originalRejectionHandler(event);
    }
  };
  
  console.log('✅ [SMART-STS-SUPPRESSOR] Intelligent Firebase STS error suppression active');
};

// Clean up suppressor (for testing)
export const cleanupStsFetchInterceptor = () => {
  activeAuthFlows.clear();
  console.log('🧹 [SMART-STS-SUPPRESSOR] Cleaned up STS suppressor');
};