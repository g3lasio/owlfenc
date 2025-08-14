/**
 * 🚀 ULTRA SIMPLE OAUTH - ALTERNATIVA #1
 * Redirección directa sin ninguna verificación o complejidad
 * Enfoque minimalista después de 3 días de debugging
 */

// ALTERNATIVA 1: Redirección inmediata sin verificaciones
export const instantGoogleLogin = () => {
  console.log("🚀 [INSTANT] Redirección Google inmediata");
  window.location.href = `${window.location.origin}/api/oauth-direct/google?state=login`;
};

export const instantAppleLogin = () => {
  console.log("🚀 [INSTANT] Redirección Apple inmediata");
  window.location.href = `${window.location.origin}/api/oauth-direct/apple?state=login`;
};

// ALTERNATIVA 2: Popup con postMessage (más user-friendly)
export const popupGoogleLogin = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log("🪟 [POPUP] Abriendo Google en popup");
    
    const popup = window.open(
      `${window.location.origin}/api/oauth-direct/google?state=popup`,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      reject(new Error('Popup bloqueado. Permite popups y reintenta.'));
      return;
    }
    
    // Escuchar mensaje del popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OAUTH_SUCCESS') {
        console.log("✅ [POPUP] OAuth exitoso");
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(event.data.user);
      } else if (event.data.type === 'OAUTH_ERROR') {
        console.error("❌ [POPUP] OAuth error");
        window.removeEventListener('message', messageHandler);
        popup.close();
        reject(new Error(event.data.error));
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Timeout de seguridad
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        window.removeEventListener('message', messageHandler);
        reject(new Error('Tiempo agotado'));
      }
    }, 60000);
  });
};

export const popupAppleLogin = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log("🪟 [POPUP] Abriendo Apple en popup");
    
    const popup = window.open(
      `${window.location.origin}/api/oauth-direct/apple?state=popup`,
      'apple-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      reject(new Error('Popup bloqueado. Permite popups y reintenta.'));
      return;
    }
    
    // Escuchar mensaje del popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OAUTH_SUCCESS') {
        console.log("✅ [POPUP] Apple OAuth exitoso");
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(event.data.user);
      } else if (event.data.type === 'OAUTH_ERROR') {
        console.error("❌ [POPUP] Apple OAuth error");
        window.removeEventListener('message', messageHandler);
        popup.close();
        reject(new Error(event.data.error));
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Timeout de seguridad
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        window.removeEventListener('message', messageHandler);
        reject(new Error('Tiempo agotado'));
      }
    }, 60000);
  });
};

// ALTERNATIVA 3: iframe OAuth (más discreto)
export const iframeGoogleLogin = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log("🖼️ [IFRAME] OAuth Google en iframe");
    
    const iframe = document.createElement('iframe');
    iframe.src = `${window.location.origin}/api/oauth-direct/google?state=iframe`;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Escuchar mensaje del iframe
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OAUTH_SUCCESS') {
        console.log("✅ [IFRAME] OAuth exitoso");
        window.removeEventListener('message', messageHandler);
        document.body.removeChild(iframe);
        resolve(event.data.user);
      } else if (event.data.type === 'OAUTH_ERROR') {
        console.error("❌ [IFRAME] OAuth error");
        window.removeEventListener('message', messageHandler);
        document.body.removeChild(iframe);
        reject(new Error(event.data.error));
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Timeout de seguridad
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      reject(new Error('Timeout en iframe OAuth'));
    }, 30000);
  });
};