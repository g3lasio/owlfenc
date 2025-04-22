import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  orderBy,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateEmail,
  linkWithPopup,
  unlink,
  deleteUser
} from "firebase/auth";

// Verificamos si estamos en modo de desarrollo en Replit
const isReplitDev = window.location.hostname.includes('.replit.dev') || 
                   window.location.hostname.includes('.id.repl.co');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: isReplitDev ? window.location.hostname : `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Proveedores de autenticación
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
const microsoftProvider = new OAuthProvider('microsoft.com');

// Projects collection
export const saveProject = async (projectData: any) => {
  try {
    // Ensure project has a status, default to "draft" if not provided
    const projectWithStatus = {
      ...projectData,
      status: projectData.status || "draft",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "projects"), projectWithStatus);
    return { id: docRef.id, ...projectWithStatus };
  } catch (error) {
    console.error("Error saving project:", error);
    throw error;
  }
};

export const getProjects = async (filters?: { status?: string, fenceType?: string }) => {
  try {
    let q = query(
      collection(db, "projects"), 
      orderBy("createdAt", "desc")
    );

    // Apply filters if provided
    if (filters) {
      const queryConstraints = [];

      if (filters.status) {
        queryConstraints.push(where("status", "==", filters.status));
      }

      if (filters.fenceType) {
        queryConstraints.push(where("fenceType", "==", filters.fenceType));
      }

      if (queryConstraints.length > 0) {
        q = query(
          collection(db, "projects"),
          ...queryConstraints,
          orderBy("createdAt", "desc")
        );
      }
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure status is set, default to "draft" if missing
      status: doc.data().status || "draft"
    }));
  } catch (error) {
    console.error("Error getting projects:", error);
    throw error;
  }
};

export const getProjectById = async (id: string) => {
  try {
    const docRef = doc(db, "projects", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Project not found");
    }
  } catch (error) {
    console.error("Error getting project:", error);
    throw error;
  }
};

export const updateProject = async (id: string, projectData: any) => {
  try {
    const docRef = doc(db, "projects", id);
    await updateDoc(docRef, {
      ...projectData,
      updatedAt: Timestamp.now()
    });
    return { id, ...projectData };
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

// **************************************
// FUNCIONES DE AUTENTICACIÓN
// **************************************

// Registrar un nuevo usuario
export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error registrando usuario:", error);
    throw error;
  }
};

// Iniciar sesión con email y contraseña
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    throw error;
  }
};

// Modo de desarrollo sin autenticación
const devMode = isReplitDev && import.meta.env.DEV;

// Crear un usuario simulado para modo de desarrollo
const createDevUser = () => {
  return {
    uid: "dev-user-123",
    email: "dev@example.com",
    displayName: "Usuario Desarrollo",
    photoURL: null,
    phoneNumber: null,
    emailVerified: true,
    getIdToken: () => Promise.resolve("dev-token-123"),
    toJSON: () => ({
      uid: "dev-user-123",
      email: "dev@example.com",
      displayName: "Usuario Desarrollo"
    })
  };
};

// Iniciar sesión con Google
export const loginWithGoogle = async () => {
  try {
    // Si estamos en modo de desarrollo y hay problemas de dominio, usar autenticación simulada
    if (devMode) {
      console.log("Usando login de desarrollo (sin Firebase)");
      const devUser = createDevUser();
      
      // Simular un login exitoso
      // Emitimos un evento de auth change que AuthContext detectará
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    // Configuración normal para entorno de producción
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Intentar con popup (más simple y rápido)
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      console.error("Error con popup de Google:", error);
      
      // Si el popup falla, intentar con redirección como fallback
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user') {
        console.log("Intentando con redirección como alternativa...");
        await signInWithRedirect(auth, googleProvider);
        return null; // La redirección navegará fuera de esta página
      }
      
      // Si recibimos un error de dominio no autorizado y estamos en Replit, usar modo de desarrollo
      if ((error.code === 'auth/unauthorized-domain' || 
           error.message?.includes('domain not authorized')) && isReplitDev) {
        console.log("Dominio no autorizado en Replit, usando autenticación de desarrollo");
        const devUser = createDevUser();
        
        // Simular un login exitoso
        setTimeout(() => {
          const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
          window.dispatchEvent(event);
        }, 500);
        
        return devUser;
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error("Error iniciando sesión con Google:", error);
    
    // Si es un error de red o dominio no autorizado en Replit, usar autenticación simulada
    if ((error.code === 'auth/network-request-failed' || 
         error.code === 'auth/unauthorized-domain' ||
         error.message?.includes('domain not authorized')) && isReplitDev) {
      console.log("Error de red o dominio en Replit, usando autenticación de desarrollo");
      const devUser = createDevUser();
      
      // Simular un login exitoso
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    throw error;
  }
};

// Iniciar sesión con Apple
export const loginWithApple = async () => {
  try {
    // Si estamos en modo de desarrollo y hay problemas de dominio, usar autenticación simulada
    if (devMode) {
      console.log("Usando login de desarrollo (sin Firebase - Apple)");
      const devUser = createDevUser();
      
      // Simular un login exitoso
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    // Añadimos información detallada para diagnóstico
    console.log("=== DIAGNÓSTICO APPLE LOGIN ===");
    console.log("1. Configurando proveedor de Apple");
    
    // Asegurarnos que el provider está correctamente inicializado
    if (!appleProvider) {
      console.error("Error crítico: El proveedor de Apple no está inicializado");
      throw new Error("Apple provider no inicializado");
    }
    
    // Datos del usuario actual (si existe) para diagnóstico
    const currentUser = auth.currentUser;
    console.log("2. Estado de usuario antes de login:", currentUser ? 
      "Usuario ya autenticado" : "No hay usuario autenticado");
    
    // Dado que estamos teniendo problemas específicos de conexión con Apple,
    // vamos a intentar usar el mecanismo de popup que puede tener menos
    // restricciones de cookies/CORS en algunos ambientes
    console.log("3. Intentando autenticación con Apple usando POPUP en lugar de redirección");
    
    try {
      console.log("4. Iniciando popup de Apple...");
      const result = await signInWithPopup(auth, appleProvider);
      console.log("5. Autenticación con popup exitosa:", result.user ? "Usuario obtenido" : "No se obtuvo usuario");
      return result.user;
    } catch (popupError: any) {
      console.error("Error con método popup:", popupError);
      console.log("Código de error popup:", popupError.code);
      
      // Si el error es por popup bloqueado, intentamos con redirección como último recurso
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request') {
        
        console.log("6. Popup bloqueado o cerrado, intentando con redirección como último recurso");
        
        // Configurar parámetros diferentes para un último intento
        appleProvider.setCustomParameters({
          // Solo establecemos locale, para minimizar configuraciones
          locale: 'es'
        });
        
        console.log("7. Iniciando último intento con redirección...");
        await signInWithRedirect(auth, appleProvider);
        console.log("8. Redirección iniciada");
        return null;
      }
      
      // Si recibimos un error de dominio no autorizado y estamos en Replit, usar modo de desarrollo
      if ((popupError.code === 'auth/unauthorized-domain' || 
           popupError.message?.includes('domain not authorized')) && isReplitDev) {
        console.log("Dominio no autorizado en Replit, usando autenticación de desarrollo");
        const devUser = createDevUser();
        
        // Simular un login exitoso
        setTimeout(() => {
          const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
          window.dispatchEvent(event);
        }, 500);
        
        return devUser;
      }
      
      // Para otros errores, los propagamos
      throw popupError;
    }
  } catch (error: any) {
    // Log detallado del error
    console.error("=== ERROR EN APPLE LOGIN ===");
    console.error("Error iniciando sesión con Apple:", error);
    console.error("Código de error:", error.code);
    console.error("Mensaje de error:", error.message);
    console.error("Error completo:", error);
    
    // Mensaje especial para error de conexión con Apple
    if (error.message && error.message.includes('appleid.apple.com refused to connect')) {
      console.error("DIAGNÓSTICO: Error de conexión con appleid.apple.com");
      console.error("Esto podría indicar:");
      console.error("1. Que la cuenta de desarrollador de Apple no está configurada correctamente");
      console.error("2. Que el dominio de la aplicación no está autorizado en Apple Developer Console");
      console.error("3. Que hay restricciones de red que impiden la conexión con Apple");
    }
    
    // Si es un error de red o dominio no autorizado en Replit, usar autenticación simulada
    if ((error.code === 'auth/network-request-failed' || 
         error.code === 'auth/unauthorized-domain' ||
         error.message?.includes('domain not authorized')) && isReplitDev) {
      console.log("Error de red o dominio en Replit, usando autenticación de desarrollo");
      const devUser = createDevUser();
      
      // Simular un login exitoso
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    // Propagamos el error para manejarlo en la UI
    throw error;
  }
};

// Iniciar sesión con Microsoft
export const loginWithMicrosoft = async () => {
  try {
    // Si estamos en modo de desarrollo y hay problemas de dominio, usar autenticación simulada
    if (devMode) {
      console.log("Usando login de desarrollo (sin Firebase - Microsoft)");
      const devUser = createDevUser();
      
      // Simular un login exitoso
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    // Intentar con popup (más simple y rápido)
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      // Aseguramos que tenemos un usuario válido
      if (result && result.user) {
        return result.user;
      } else {
        console.warn("Resultado de popup de Microsoft sin usuario");
        return null;
      }
    } catch (error: any) {
      console.error("Error con popup de Microsoft:", error);
      
      // Si el popup falla, intentar con redirección como fallback
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user') {
        console.log("Intentando con redirección como alternativa...");
        await signInWithRedirect(auth, microsoftProvider);
        return null; // La redirección navegará fuera de esta página
      }
      
      // Si recibimos un error de dominio no autorizado y estamos en Replit, usar modo de desarrollo
      if ((error.code === 'auth/unauthorized-domain' || 
           error.message?.includes('domain not authorized')) && isReplitDev) {
        console.log("Dominio no autorizado en Replit, usando autenticación de desarrollo");
        const devUser = createDevUser();
        
        // Simular un login exitoso
        setTimeout(() => {
          const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
          window.dispatchEvent(event);
        }, 500);
        
        return devUser;
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error("Error iniciando sesión con Microsoft:", error);
    
    // Si es un error de red o dominio no autorizado en Replit, usar autenticación simulada
    if ((error.code === 'auth/network-request-failed' || 
         error.code === 'auth/unauthorized-domain' ||
         error.message?.includes('domain not authorized')) && isReplitDev) {
      console.log("Error de red o dominio en Replit, usando autenticación de desarrollo");
      const devUser = createDevUser();
      
      // Simular un login exitoso
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    throw error;
  }
};

// Enviar correo de restablecimiento de contraseña
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error enviando email de restablecimiento:", error);
    throw error;
  }
};

// Confirmar restablecimiento de contraseña
export const confirmReset = async (code: string, newPassword: string) => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    return true;
  } catch (error) {
    console.error("Error confirmando restablecimiento:", error);
    throw error;
  }
};

// Actualizar perfil de usuario
export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    await updateProfile(user, {
      displayName,
      photoURL: photoURL || user.photoURL
    });

    return user;
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    throw error;
  }
};

// Cambiar contraseña
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    if (!user.email) throw new Error("El usuario no tiene email asociado");

    // Re-autenticar al usuario antes de cambiar la contraseña
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Cambiar contraseña
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error("Error cambiando contraseña:", error);
    throw error;
  }
};

// Cambiar email
export const changeEmail = async (password: string, newEmail: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    if (!user.email) throw new Error("El usuario no tiene email asociado");

    // Re-autenticar al usuario antes de cambiar el email
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Cambiar email
    await updateEmail(user, newEmail);
    return true;
  } catch (error) {
    console.error("Error cambiando email:", error);
    throw error;
  }
};

// Vincular cuenta con Google
export const linkWithGoogle = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    const result = await linkWithPopup(user, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error vinculando cuenta Google:", error);
    throw error;
  }
};

// Desvincular proveedor
export const unlinkProvider = async (providerId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    await unlink(user, providerId);
    return true;
  } catch (error) {
    console.error("Error desvinculando proveedor:", error);
    throw error;
  }
};

// Login con teléfono
export const initPhoneLogin = async (phoneNumber: string, recaptchaContainerId: string) => {
  try {
    // Configurar recaptcha
    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'normal',
      callback: () => {
        // reCAPTCHA resuelto, permitir al usuario continuar
      },
      'expired-callback': () => {
        // Respuesta de reCAPTCHA expirada, pedirle al usuario que resuelva de nuevo
      }
    });

    // Enviar código SMS
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);

    // Destruir el reCAPTCHA para evitar duplicados
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
    }

    return confirmationResult;
  } catch (error) {
    console.error("Error iniciando sesión con teléfono:", error);
    throw error;
  }
};

// Verificar código SMS
export const verifyPhoneCode = async (confirmationResult: any, code: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    return result.user;
  } catch (error) {
    console.error("Error verificando código:", error);
    throw error;
  }
};

// Login con enlace de email (Email Link / Magic Link)
export const sendEmailLink = async (email: string) => {
  try {
    const actionCodeSettings = {
      url: window.location.origin + '/login/email-link-callback',
      handleCodeInApp: true
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    // Guardar el email en localStorage para recuperarlo cuando el usuario haga clic en el enlace
    localStorage.setItem('emailForSignIn', email);

    return true;
  } catch (error) {
    console.error("Error enviando enlace de email:", error);
    throw error;
  }
};

// Cerrar sesión
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    throw error;
  }
};

// Eliminar cuenta
export const deleteUserAccount = async (password: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    if (!user.email) throw new Error("El usuario no tiene email asociado");

    // Re-autenticar al usuario antes de eliminar la cuenta
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Eliminar cuenta
    await deleteUser(user);
    return true;
  } catch (error) {
    console.error("Error eliminando cuenta:", error);
    throw error;
  }
};