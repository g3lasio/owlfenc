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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  deleteUser,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator
} from "firebase/auth";

// Verificamos si estamos en modo de desarrollo en Replit
const isReplitDev = window.location.hostname.includes('.replit.dev') || 
                   window.location.hostname.includes('.id.repl.co');

// Activar modo de desarrollo si estamos en Replit
export const devMode = isReplitDev;

// Crear un usuario simulado para modo de desarrollo
export const createDevUser = () => {
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
export const storage = getStorage(app);

// Proveedores de autenticación
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

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

// Importamos datos de muestra para desarrollo
import { sampleProjects } from "@/data/sampleProjects";

export const getProjects = async (filters?: { status?: string, fenceType?: string }) => {
  try {
    // Para desarrollo usamos datos de muestra
    console.log("Cargando proyectos de muestra");
    
    let filteredProjects = [...sampleProjects];
    
    // Aplicar filtros si se proporcionan
    if (filters) {
      if (filters.status) {
        filteredProjects = filteredProjects.filter(project => project.status === filters.status);
      }
      
      if (filters.fenceType) {
        filteredProjects = filteredProjects.filter(project => project.fenceType === filters.fenceType);
      }
    }
    
    // Ordenar por fecha de creación (más reciente primero)
    filteredProjects.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
      return dateB.getTime() - dateA.getTime();
    });
    
    return filteredProjects;
    
    /* Código original para Firebase
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
    */
  } catch (error) {
    console.error("Error getting projects:", error);
    throw error;
  }
};

export const getProjectById = async (id: string) => {
  try {
    // Para desarrollo usamos datos de muestra
    console.log("Buscando proyecto con ID:", id);
    const project = sampleProjects.find(p => p.id === id);
    
    if (project) {
      return project;
    } else {
      throw new Error("Project not found");
    }
    
    /* Código original para Firebase
    const docRef = doc(db, "projects", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Project not found");
    }
    */
  } catch (error) {
    console.error("Error getting project:", error);
    throw error;
  }
};

export const updateProject = async (id: string, projectData: any) => {
  try {
    // Para desarrollo usamos datos de muestra
    console.log("Actualizando proyecto con ID:", id, projectData);
    
    // Buscar el proyecto en la lista de muestra
    const projectIndex = sampleProjects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    // Actualizar el proyecto en la lista de muestra
    const currentProject = sampleProjects[projectIndex];
    const updatedProject = {
      ...currentProject,
      ...projectData,
      // Solo actualizar si ya existía, para evitar error de tipo
      ...(currentProject.updatedAt ? { updatedAt: Timestamp.now() } : {})
    };
    
    sampleProjects[projectIndex] = updatedProject;
    return updatedProject;
    
    /* Código original para Firebase
    const docRef = doc(db, "projects", id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    // Make sure we're not losing any existing data
    const currentData = docSnap.data();
    
    const updatedData = {
      ...projectData,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(docRef, updatedData);
    
    // Get the refreshed document
    const updatedDocSnap = await getDoc(docRef);
    return { id, ...updatedDocSnap.data() };
    */
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

// Update project progress stage
export const updateProjectProgress = async (id: string, progress: string) => {
  try {
    // Para desarrollo usamos datos de muestra
    console.log("Actualizando progreso del proyecto con ID:", id, progress);
    
    // Buscar el proyecto en la lista de muestra
    const projectIndex = sampleProjects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    // Actualizar el proyecto en la lista de muestra
    const currentProject = sampleProjects[projectIndex];
    sampleProjects[projectIndex] = {
      ...currentProject,
      projectProgress: progress,
      // Solo actualizar si ya existía, para evitar error de tipo
      ...(currentProject.updatedAt ? { updatedAt: Timestamp.now() } : {})
    };
    
    return sampleProjects[projectIndex];
    
    /* Código original para Firebase
    const docRef = doc(db, "projects", id);
    await updateDoc(docRef, {
      projectProgress: progress,
      updatedAt: Timestamp.now()
    });
    
    // Get updated project
    const updatedDocSnap = await getDoc(docRef);
    return { id, ...updatedDocSnap.data() };
    */
  } catch (error) {
    console.error("Error updating project progress:", error);
    throw error;
  }
};

// **************************************
// FUNCIONES DE MANEJO DE MATERIALES
// **************************************

// Añadir material al inventario
export const addMaterial = async (materialData: any) => {
  try {
    const materialWithTimestamp = {
      ...materialData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, "materials"), materialWithTimestamp);
    return { id: docRef.id, ...materialWithTimestamp };
  } catch (error) {
    console.error("Error al guardar material:", error);
    throw error;
  }
};

// Obtener todos los materiales
export const getMaterials = async (filters?: { category?: string, projectId?: string }) => {
  try {
    let q = query(
      collection(db, "materials"), 
      orderBy("createdAt", "desc")
    );
    
    // Aplicar filtros si se proporcionan
    if (filters) {
      const queryConstraints = [];
      
      if (filters.category) {
        queryConstraints.push(where("category", "==", filters.category));
      }
      
      if (filters.projectId) {
        queryConstraints.push(where("projectId", "==", filters.projectId));
      }
      
      if (queryConstraints.length > 0) {
        q = query(
          collection(db, "materials"),
          ...queryConstraints,
          orderBy("createdAt", "desc")
        );
      }
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al obtener materiales:", error);
    throw error;
  }
};

// Obtener un material por su ID
export const getMaterialById = async (id: string) => {
  try {
    const docRef = doc(db, "materials", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Material no encontrado");
    }
  } catch (error) {
    console.error("Error al obtener material:", error);
    throw error;
  }
};

// Actualizar un material
export const updateMaterial = async (id: string, materialData: any) => {
  try {
    const docRef = doc(db, "materials", id);
    await updateDoc(docRef, {
      ...materialData,
      updatedAt: Timestamp.now()
    });
    return { id, ...materialData };
  } catch (error) {
    console.error("Error al actualizar material:", error);
    throw error;
  }
};

// **************************************
// FUNCIONES DE MANEJO DE ARCHIVOS
// **************************************

// Subir archivo a Firebase Storage
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // Crear una referencia única para el archivo
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    
    // Subir el archivo a Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    
    // Obtener la URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error al subir archivo:", error);
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

// Espacio reservado para comentarios

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
    
    // Logs mejorados para diagnóstico
    console.log("=== DIAGNÓSTICO APPLE LOGIN (INICIO) ===");
    console.log("1. Navegador detectado:", navigator.userAgent);
    console.log("2. URL actual:", window.location.href);
    console.log("3. Dominio actual:", window.location.hostname);
    console.log("4. Firebase authDomain configurado:", auth.app.options.authDomain);
    
    // Recreamos el proveedor de Apple en cada intento para evitar problemas de estado
    console.log("5. Creando nueva instancia del proveedor Apple");
    const freshAppleProvider = new OAuthProvider('apple.com');
    
    // Datos del usuario actual (si existe) para diagnóstico
    const currentUser = auth.currentUser;
    console.log("6. Estado de usuario antes de login:", currentUser ? 
      "Usuario ya autenticado (UID: " + currentUser.uid + ")" : "No hay usuario autenticado");
    
    // Configurar el proveedor de Apple con todos los scopes necesarios
    console.log("7. Configurando scopes del proveedor Apple");
    freshAppleProvider.addScope('email');
    freshAppleProvider.addScope('name');
    
    // Agregar parámetros personalizados que pueden mejorar la experiencia
    console.log("8. Configurando parámetros adicionales del proveedor Apple");
    freshAppleProvider.setCustomParameters({
      // Forzar siempre la selección de cuenta
      prompt: 'select_account',
      // Establecer idioma preferido
      locale: 'es_ES'
    });
    
    // Establecemos cookies de rastreo para diagnóstico
    console.log("9. Estableciendo datos para diagnosticar el flujo de autenticación");
    sessionStorage.setItem('appleAuth_attempt_start', JSON.stringify({
      timestamp: Date.now(),
      url: window.location.href,
      domain: window.location.hostname,
      authDomain: auth.app.options.authDomain
    }));
    
    // Verificar soporte del navegador y estrategia preferida
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log("10. Dispositivo móvil detectado:", isMobile);
    
    // En dispositivos móviles es mejor usar redirección directa
    if (isMobile) {
      console.log("11. Usando método de redirección por estar en dispositivo móvil");
      
      // Persistir el tipo de intento para diagnóstico posterior
      sessionStorage.setItem('appleAuth_redirect_reason', 'mobile_device');
      
      await signInWithRedirect(auth, freshAppleProvider);
      console.log("12. Redirección iniciada, no debería verse este mensaje");
      return null;
    }
    
    // En escritorio intentamos primero con popup, si falla usamos redirección
    try {
      console.log("11. Intentando autenticación con popup (escritorio)...");
      const result = await signInWithPopup(auth, freshAppleProvider);
      console.log("12. Login con popup exitoso! UID:", result.user.uid);
      
      // Datos completos del usuario para diagnóstico
      console.log("13. Datos del usuario autenticado:");
      console.log("   - Email:", result.user.email);
      console.log("   - Nombre:", result.user.displayName);
      console.log("   - Verificado:", result.user.emailVerified);
      console.log("   - Método:", result.user.providerData[0]?.providerId);
      
      return result.user;
    } catch (popupError: any) {
      console.warn("12. Error con popup:", popupError.code, popupError.message);
      
      // Si es un error de popup (bloqueado o cerrado), intentamos con redirección
      if (
        popupError.code === 'auth/popup-blocked' || 
        popupError.code === 'auth/popup-closed-by-user' ||
        popupError.code === 'auth/cancelled-popup-request'
      ) {
        console.log("13. Cambiando a modo de redirección después de error de popup");
        
        // Guardamos información del intento para diagnóstico
        sessionStorage.setItem('appleAuth_redirect_reason', 'popup_' + popupError.code);
        sessionStorage.setItem('appleAuth_popup_error', JSON.stringify({
          code: popupError.code,
          message: popupError.message,
          timestamp: Date.now()
        }));
        
        console.log("14. Iniciando redirección a Apple...");
        await signInWithRedirect(auth, freshAppleProvider);
        console.log("15. Redirección iniciada, no se debería ver este mensaje");
        return null;
      }
      
      // Si el error no está relacionado con popups, registramos datos para diagnóstico
      sessionStorage.setItem('appleAuth_fatal_error', JSON.stringify({
        code: popupError.code,
        message: popupError.message,
        timestamp: Date.now()
      }));
      
      // Si es error de dominio no autorizado y estamos en Replit, usar modo desarrollo
      if ((popupError.code === 'auth/unauthorized-domain' || 
           popupError.message?.includes('domain not authorized')) && isReplitDev) {
        console.log("13. Dominio no autorizado en Replit, usando autenticación simulada");
        const devUser = createDevUser();
        
        setTimeout(() => {
          const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
          window.dispatchEvent(event);
        }, 500);
        
        return devUser;
      }
      
      // Si es otro tipo de error, lo propagamos
      throw popupError;
    }
  } catch (error: any) {
    console.error("=== ERROR FATAL EN APPLE LOGIN ===");
    console.error("Error detallado:", error);
    console.error("Código:", error.code || "No disponible");
    console.error("Mensaje:", error.message || "No disponible");
    console.error("Stack:", error.stack || "No disponible");
    
    // Diagnóstico avanzado según el tipo de error
    if (error.code === 'auth/unauthorized-domain') {
      console.error("DIAGNÓSTICO: Este dominio no está autorizado en la consola de Firebase");
      console.error("- Dominio actual:", window.location.hostname);
      console.error("- Debes agregar este dominio en la consola de Firebase:");
      console.error("  Firebase Console > Authentication > Sign-in method > Authorized domains");
      console.error("- También debes configurar el dominio en la consola de desarrollador de Apple:");
      console.error("  https://developer.apple.com > Certificates, Identifiers & Profiles > Services IDs");
    } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
      console.error("DIAGNÓSTICO: La operación no es compatible con este entorno");
      console.error("- Verifica las restricciones de cookies de terceros en el navegador");
      console.error("- Verifica que estás usando HTTPS");
      console.error("- Este error puede ocurrir en navegadores antiguos o con restricciones");
    } else if (error.message && error.message.includes('appleid.apple.com refused to connect')) {
      console.error("DIAGNÓSTICO: Error de conexión con los servidores de Apple");
      console.error("- Posibles causas:");
      console.error("  1. La cuenta de desarrollador Apple no está configurada correctamente");
      console.error("  2. El dominio de tu aplicación no está autorizado en Apple Developer Console");
      console.error("  3. Hay restricciones de red que impiden la conexión con Apple");
      console.error("  4. Los servicios de Apple pueden estar experimentando problemas");
    }
    
    // Si estamos en modo de desarrollo y hay error, simular autenticación
    if (devMode) {
      console.log("Error en modo de desarrollo, simulando autenticación");
      const devUser = createDevUser();
      
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    throw error;
  }
};

// Método de inicio de sesión con Microsoft eliminado intencionalmente

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
/**
 * Función para iniciar el proceso de login con número de teléfono
 * @param phoneNumber Número de teléfono en formato internacional (e.j. +1234567890)
 * @param recaptchaContainerId ID del elemento HTML que contendrá el reCAPTCHA
 * @returns Objeto ConfirmationResult para verificar el código SMS
 */
export const initPhoneLogin = async (phoneNumber: string, recaptchaContainerId: string) => {
  try {
    // Si estamos en modo de desarrollo, simular el proceso
    if (devMode) {
      console.log("Usando autenticación por teléfono en modo desarrollo");
      // Crear un objeto simulado para confirmationResult
      return {
        confirm: (code: string) => {
          console.log(`Verificando código ${code} en modo desarrollo`);
          return Promise.resolve({ user: createDevUser() });
        }
      };
    }

    // Configurar reCAPTCHA
    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'normal',
      callback: () => {
        // reCAPTCHA resuelto, permitir al usuario continuar
        console.log("reCAPTCHA resuelto correctamente");
      },
      'expired-callback': () => {
        // Respuesta de reCAPTCHA expirada
        console.log("reCAPTCHA ha expirado, por favor intenta de nuevo");
      }
    });

    console.log("reCAPTCHA inicializado correctamente");

    // Enviar código SMS
    console.log(`Enviando SMS al número ${phoneNumber}`);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    console.log("Código SMS enviado correctamente");

    // Destruir el reCAPTCHA para evitar duplicados
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      console.log("reCAPTCHA eliminado para evitar duplicados");
    }

    return confirmationResult;
  } catch (error: any) {
    console.error("Error iniciando sesión con teléfono:", error);
    console.error("Código de error:", error.code);
    console.error("Mensaje de error:", error.message);
    
    // Si estamos en modo de desarrollo y hay un error, simular el proceso
    if (devMode) {
      console.log("Error en modo de desarrollo, simulando autenticación");
      return {
        confirm: (code: string) => {
          console.log(`Verificando código ${code} en modo desarrollo (después de error)`);
          return Promise.resolve({ user: createDevUser() });
        }
      };
    }
    
    throw error;
  }
};

/**
 * Función para verificar el código SMS recibido
 * @param confirmationResult Objeto ConfirmationResult devuelto por initPhoneLogin
 * @param code Código SMS ingresado por el usuario
 * @returns Usuario autenticado
 */
export const verifyPhoneCode = async (confirmationResult: any, code: string) => {
  try {
    console.log(`Verificando código SMS: ${code}`);
    const result = await confirmationResult.confirm(code);
    console.log("Código SMS verificado correctamente");
    return result.user;
  } catch (error: any) {
    console.error("Error verificando código SMS:", error);
    console.error("Código de error:", error.code);
    console.error("Mensaje de error:", error.message);
    throw error;
  }
};

/**
 * Función para configurar autenticación multi-factor con SMS
 * @param user Usuario para el que se configurará MFA
 * @param phoneNumber Número de teléfono en formato internacional
 * @param recaptchaContainerId ID del elemento HTML que contendrá el reCAPTCHA
 * @returns Promise que resuelve cuando la configuración está completa
 */
export const enrollMfaPhone = async (user: any, phoneNumber: string, recaptchaContainerId: string) => {
  try {
    // Si estamos en modo desarrollo, simular el proceso
    if (devMode) {
      console.log("Simulando inscripción MFA en modo desarrollo");
      return true;
    }
    
    // Obtener instancia multiFactor para el usuario
    const multiFactorUser = multiFactor(user);
    
    // Configurar reCAPTCHA para la verificación
    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'normal',
      callback: () => console.log("reCAPTCHA resuelto para MFA"),
      'expired-callback': () => console.log("reCAPTCHA expirado para MFA"),
    });
    
    // Iniciar la inscripción con teléfono
    const phoneInfoOptions = {
      phoneNumber: phoneNumber,
      session: await multiFactorUser.getSession()
    };
    
    // Enviar código de verificación
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneInfoOptions, 
      recaptchaVerifier
    );
    
    // Limpiar reCAPTCHA
    recaptchaVerifier.clear();
    
    return verificationId;
  } catch (error: any) {
    console.error("Error en inscripción MFA:", error);
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    throw error;
  }
};

/**
 * Completa la inscripción MFA verificando el código SMS
 * @param user Usuario actual
 * @param verificationId ID de verificación obtenido de enrollMfaPhone
 * @param verificationCode Código SMS ingresado por el usuario
 * @param displayName Nombre a mostrar para este factor (opcional)
 */
export const completeMfaEnrollment = async (
  user: any, 
  verificationId: string, 
  verificationCode: string, 
  displayName: string = "Mi teléfono"
) => {
  try {
    // Si estamos en modo desarrollo, simular el proceso
    if (devMode) {
      console.log(`Simulando completar MFA con código ${verificationCode} en modo desarrollo`);
      return true;
    }
    
    // Crear credenciales con el código verificado
    const phoneAuthCredential = PhoneAuthProvider.credential(
      verificationId, 
      verificationCode
    );
    
    // Crear sesión multi-factor
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
    
    // Completar inscripción en multi-factor
    const multiFactorUser = multiFactor(user);
    await multiFactorUser.enroll(multiFactorAssertion, displayName);
    
    console.log("Inscripción MFA completada exitosamente");
    return true;
  } catch (error: any) {
    console.error("Error completando inscripción MFA:", error);
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
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