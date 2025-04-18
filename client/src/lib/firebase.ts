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

// Configuración de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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

// Templates collection
export const saveTemplate = async (templateData: any) => {
  try {
    const docRef = await addDoc(collection(db, "templates"), {
      ...templateData,
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, ...templateData };
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
};

export const getTemplates = async (type: string) => {
  try {
    const q = query(
      collection(db, "templates"), 
      where("type", "==", type)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting templates:", error);
    throw error;
  }
};

// =====================================================================
// Funciones de Autenticación
// =====================================================================

// Estado de autenticación
export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Registro con email y contraseña
export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    console.error("Error registrando usuario:", error);
    throw error;
  }
};

// Login con email y contraseña
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    throw error;
  }
};

// Login con Google
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error iniciando sesión con Google:", error);
    throw error;
  }
};

// Login con Apple
export const loginWithApple = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    return result.user;
  } catch (error) {
    console.error("Error iniciando sesión con Apple:", error);
    throw error;
  }
};

// Login con Microsoft
export const loginWithMicrosoft = async () => {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    return result.user;
  } catch (error) {
    console.error("Error iniciando sesión con Microsoft:", error);
    throw error;
  }
};

// Login con teléfono
export const initPhoneLogin = (phoneNumber: string, recaptchaContainerId: string) => {
  try {
    // Configurar recaptcha
    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'normal',
      callback: () => {
        // reCAPTCHA resuelto, permitir al usuario continuar
      }
    });
    
    // Enviar código SMS
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
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

export const completeEmailLinkSignIn = async () => {
  try {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // Obtener el email de localStorage
      let email = localStorage.getItem('emailForSignIn');
      
      if (!email) {
        // Si el email no está en localStorage, pedirlo al usuario
        email = window.prompt('Por favor, ingresa tu correo electrónico para confirmar tu cuenta');
      }
      
      if (email) {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        
        // Limpiar email de localStorage
        localStorage.removeItem('emailForSignIn');
        
        return result.user;
      } else {
        throw new Error("No se proporcionó un correo electrónico");
      }
    } else {
      throw new Error("No es un enlace válido para iniciar sesión");
    }
  } catch (error) {
    console.error("Error completando inicio de sesión con enlace:", error);
    throw error;
  }
};

// Recuperación de contraseña
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error enviando email de recuperación:", error);
    throw error;
  }
};

export const confirmReset = async (code: string, newPassword: string) => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    return true;
  } catch (error) {
    console.error("Error confirmando recuperación:", error);
    throw error;
  }
};

// Actualizar perfil de usuario
export const updateUserProfile = async (displayName: string, photoURL: string = "") => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    
    await updateProfile(user, { displayName, photoURL });
    return true;
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    throw error;
  }
};

// Actualizar email
export const updateUserEmail = async (newEmail: string, password: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    if (!user.email) throw new Error("El usuario no tiene email asociado");
    
    // Re-autenticar al usuario antes de cambiar el email
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    
    // Actualizar email
    await updateEmail(user, newEmail);
    return true;
  } catch (error) {
    console.error("Error actualizando email:", error);
    throw error;
  }
};

// Actualizar contraseña
export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");
    if (!user.email) throw new Error("El usuario no tiene email asociado");
    
    // Re-autenticar al usuario antes de cambiar la contraseña
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Actualizar contraseña
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error("Error actualizando contraseña:", error);
    throw error;
  }
};

// Vincular cuentas
export const linkGoogleAccount = async () => {
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
