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
  updateDoc,
  limit
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
  PhoneMultiFactorGenerator,
  sendEmailVerification,
  reload
} from "firebase/auth";

// Verificamos si estamos en modo de desarrollo en Replit
const isReplitDev = window.location.hostname.includes('.replit.dev') || 
                   window.location.hostname.includes('.id.repl.co') ||
                   window.location.hostname === 'localhost' ||
                   window.location.hostname.includes('replit.app');

// Opción para forzar el uso de Firebase real incluso en entorno de desarrollo
const useRealFirebase = localStorage.getItem('useRealFirebase') === 'true';

// FIXED: Usar Firebase real siempre - no más localStorage para proyectos
export const devMode = false; // FORZADO: Usar Firebase real para proyectos siempre

// Debug: Verificar modo de desarrollo
console.log("🔧 FIREBASE MODE CONFIG:", { 
  isReplitDev, 
  useRealFirebase, 
  devMode: false, 
  hostname: window.location.hostname,
  note: "FORCING FIREBASE REAL MODE FOR PROJECTS"
});

// Auto login en modo desarrollo
if (devMode) {
  console.log("Modo de desarrollo detectado. Activando auto-login.");
  // Disparar evento después de un pequeño retraso para asegurar que todo está cargado
  setTimeout(() => {
    const devUser = createDevUser();
    window.dispatchEvent(new CustomEvent('dev-auth-change', { 
      detail: { user: devUser }
    }));
  }, 1000);
} else {
  console.log("Usando autenticación real de Firebase.");
}

// Función para alternar entre modo de desarrollo y Firebase real
export const toggleFirebaseMode = () => {
  const currentMode = localStorage.getItem('useRealFirebase') === 'true';
  localStorage.setItem('useRealFirebase', (!currentMode).toString());
  console.log(`Modo Firebase actualizado. Usando ${!currentMode ? 'Firebase real' : 'modo de desarrollo'}.`);
  // Recarga la página para aplicar los cambios
  window.location.reload();
};

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
  apiKey: "AIzaSyBkiNyJNG-uGBO3-w4g-q5SbqDxvTdCRSk",
  authDomain: "owl-fenc.firebaseapp.com",
  projectId: "owl-fenc",
  storageBucket: "owl-fenc.firebasestorage.app",
  messagingSenderId: "610753147271",
  appId: "1:610753147271:web:b720b293ba1f4d2f456322",
  measurementId: "G-Z2PWQXHEN0"
};

// Lista de dominios autorizados para desarrollo
const authorizedDomains = [
  'owl-fenc.firebaseapp.com',
  'owl-fenc.web.app',
  '4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev',
  window.location.hostname
];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Proveedores de autenticación
const googleProvider = new GoogleAuthProvider();

// Email verification functions
export const sendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }
    
    if (user.emailVerified) {
      console.log('Email ya está verificado');
      return { success: true, message: 'Email ya está verificado' };
    }
    
    await sendEmailVerification(user);
    console.log('Email de verificación enviado');
    return { success: true, message: 'Email de verificación enviado' };
  } catch (error: any) {
    console.error('Error enviando email de verificación:', error);
    return { success: false, message: error.message };
  }
};

export const checkEmailVerification = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { verified: false, message: 'No hay usuario autenticado' };
    }
    
    // Recargar el usuario para obtener el estado más reciente
    await reload(user);
    
    return { 
      verified: user.emailVerified, 
      email: user.email,
      message: user.emailVerified ? 'Email verificado' : 'Email no verificado'
    };
  } catch (error: any) {
    console.error('Error verificando email:', error);
    return { verified: false, message: error.message };
  }
};

// Configuración correcta del proveedor de Apple - versión simplificada
const createAppleProvider = () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  return provider;
};

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
    // CRITICAL SECURITY: Get current authenticated user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("🔒 SECURITY: No authenticated user - returning empty array");
      return [];
    }

    // Verifica si estamos en modo de desarrollo
    if (devMode) {
      console.log("Cargando proyectos almacenados localmente para usuario:", currentUser.uid);
      
      // Intentamos recuperar primero del localStorage para persistencia entre refreshes
      const savedProjects = localStorage.getItem('owlFenceProjects');
      
      // Si hay proyectos guardados en localStorage, los usamos
      let filteredProjects = savedProjects ? JSON.parse(savedProjects) : [];
      
      // CRITICAL SECURITY: Filter by current user first
      filteredProjects = filteredProjects.filter((project: any) => 
        project.firebaseUserId === currentUser.uid || 
        project.userId === currentUser.uid
      );
      
      // Aplicar filtros adicionales si se proporcionan
      if (filters) {
        if (filters.status) {
          filteredProjects = filteredProjects.filter((project: any) => project.status === filters.status);
        }
        
        if (filters.fenceType) {
          filteredProjects = filteredProjects.filter((project: any) => project.fenceType === filters.fenceType);
        }
      }
      
      // Ordenar por fecha de creación (más reciente primero)
      filteredProjects.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`🔒 SECURITY: Filtered ${filteredProjects.length} projects for user ${currentUser.uid}`);
      return filteredProjects;
    } else {
      // CRITICAL SECURITY: Always filter by authenticated user first
      console.log(`🔒 SECURITY: Loading projects for authenticated user: ${currentUser.uid}`);
      
      const queryConstraints = [
        where("firebaseUserId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      ];

      // Apply additional filters if provided
      if (filters) {
        if (filters.status) {
          queryConstraints.splice(-1, 0, where("status", "==", filters.status));
        }

        if (filters.fenceType) {
          queryConstraints.splice(-1, 0, where("fenceType", "==", filters.fenceType));
        }
      }

      const q = query(collection(db, "projects"), ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const userProjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure status is set, default to "draft" if missing
        status: doc.data().status || "draft"
      }));

      console.log(`🔒 SECURITY: Successfully loaded ${userProjects.length} projects for user ${currentUser.uid}`);
      return userProjects;
    }
  } catch (error) {
    console.error("Error getting projects:", error);
    throw error;
  }
};

export const getProjectById = async (id: string) => {
  try {
    // CRITICAL SECURITY: Get current authenticated user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("🔒 SECURITY: No authenticated user - access denied");
      throw new Error("Authentication required");
    }

    if (devMode) {
      console.log("🔒 SECURITY: Buscando proyecto con ID para usuario:", id, currentUser.uid);
      
      // Intentamos recuperar del localStorage
      const savedProjects = localStorage.getItem('owlFenceProjects');
      
      // Si hay proyectos guardados en localStorage, buscamos ahí
      if (savedProjects) {
        const projects = JSON.parse(savedProjects);
        const project = projects.find((p: any) => p.id === id);
        
        // CRITICAL SECURITY: Verify project belongs to current user
        if (project && (project.firebaseUserId === currentUser.uid || project.userId === currentUser.uid)) {
          console.log("🔒 SECURITY: Project access granted for user:", currentUser.uid);
          return project;
        }
        
        if (project) {
          console.warn("🔒 SECURITY: Project access denied - belongs to different user");
          throw new Error("Access denied - project belongs to different user");
        }
      }
      
      // Si no encontramos el proyecto
      throw new Error("Project not found");
    } else {
      // CRITICAL SECURITY: Código para Firebase en producción con verificación de usuario
      console.log(`🔒 SECURITY: Loading project ${id} for user ${currentUser.uid}`);
      
      const docRef = doc(db, "projects", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const projectData = docSnap.data();
        
        // CRITICAL SECURITY: Verify project belongs to current user
        if (projectData.firebaseUserId === currentUser.uid || projectData.userId === currentUser.uid) {
          console.log("🔒 SECURITY: Project access granted for user:", currentUser.uid);
          return { id: docSnap.id, ...projectData };
        } else {
          console.warn("🔒 SECURITY: Project access denied - belongs to different user");
          throw new Error("Access denied - project belongs to different user");
        }
      } else {
        console.warn("🔒 SECURITY: Project not found:", id);
        throw new Error("Project not found");
      }
    }
  } catch (error) {
    console.error("Error getting project:", error);
    throw error;
  }
};

export const updateProject = async (id: string, projectData: any) => {
  try {
    if (devMode) {
      console.log("Actualizando proyecto con ID:", id, projectData);
      
      // Obtener los proyectos de localStorage
      const savedProjectsStr = localStorage.getItem('owlFenceProjects');
      let allProjects = savedProjectsStr ? JSON.parse(savedProjectsStr) : [];
      
      // Buscar el proyecto en la lista
      const projectIndex = allProjects.findIndex((p: any) => p.id === id);
      
      if (projectIndex === -1) {
        throw new Error(`Project with ID ${id} not found`);
      }
      
      // Actualizar el proyecto
      const currentProject = allProjects[projectIndex];
      const updatedProject = {
        ...currentProject,
        ...projectData,
        updatedAt: typeof Timestamp.now === 'function' ? 
          Timestamp.now() : 
          { toDate: () => new Date(), toMillis: () => Date.now() }
      };
      
      // Actualizar en la lista
      allProjects[projectIndex] = updatedProject;
      
      // Guardar la lista actualizada en localStorage
      localStorage.setItem('owlFenceProjects', JSON.stringify(allProjects));
      
      return updatedProject;
    } else {
      // Código para Firebase en producción
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
    }
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

// Update project progress stage
export const updateProjectProgress = async (id: string, progress: string) => {
  try {
    console.log("🔄 [FIREBASE REAL] Actualizando progreso del proyecto con ID:", id, progress);
    
    // Obtener usuario actual
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Usuario no autenticado");
    }
    
    // Buscar en ambas colecciones de Firebase: owlFenceProjects y owlFenceEstimates
    const collectionsToSearch = ["owlFenceProjects", "owlFenceEstimates"];
    let projectDoc = null;
    let collectionName = null;
    
    for (const collectionNameToCheck of collectionsToSearch) {
      console.log(`🔍 [FIREBASE REAL] Buscando en colección: ${collectionNameToCheck}`);
      
      const projectDocRef = doc(db, collectionNameToCheck, id);
      const projectDocSnap = await getDoc(projectDocRef);
      
      if (projectDocSnap.exists()) {
        const projectData = projectDocSnap.data();
        
        // Verificar que el proyecto pertenece al usuario autenticado
        if (projectData.userId === currentUser.uid) {
          projectDoc = projectDocSnap;
          collectionName = collectionNameToCheck;
          console.log(`✅ [FIREBASE REAL] Proyecto encontrado en colección: ${collectionNameToCheck}`);
          break;
        } else {
          console.log(`🔒 [FIREBASE REAL] Proyecto encontrado pero no pertenece al usuario`);
        }
      }
    }
    
    if (!projectDoc) {
      console.error("🔍 [FIREBASE REAL] Proyecto no encontrado en ninguna colección. ID:", id);
      throw new Error(`Project with ID ${id} not found in any collection`);
    }
    
    // Actualizar el proyecto en la colección correcta
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      projectProgress: progress,
      updatedAt: Timestamp.now()
    });
    
    console.log("✅ [FIREBASE REAL] Progreso actualizado exitosamente:", progress);
    
    // Get updated project
    const updatedDocSnap = await getDoc(docRef);
    return { id, ...updatedDocSnap.data() };
  } catch (error) {
    console.error("❌ [FIREBASE REAL] Error updating project progress:", error);
    throw error;
  }
};

// **************************************
// FUNCIONES DE MANEJO DE ESTIMADOS
// **************************************

// Guardar un estimado
export const saveEstimate = async (estimateData: any) => {
  try {
    // Verificar modo de desarrollo
    if (devMode) {
      console.log("Guardando estimado en modo desarrollo:", estimateData);
      
      // Generar un ID único para el estimado
      const estimateId = `estimate-${Date.now()}`;
      
      // Obtener estimados existentes de localStorage o inicializar un array vacío
      const savedEstimatesStr = localStorage.getItem('owlFenceEstimates');
      const savedEstimates = savedEstimatesStr ? JSON.parse(savedEstimatesStr) : [];
      
      // Preparar el estimado con timestamps
      const estimateWithTimestamp = {
        ...estimateData,
        id: estimateId,
        createdAt: typeof Timestamp.now === 'function' ? 
          Timestamp.now() : 
          { toDate: () => new Date(), toMillis: () => Date.now() },
        updatedAt: typeof Timestamp.now === 'function' ? 
          Timestamp.now() : 
          { toDate: () => new Date(), toMillis: () => Date.now() }
      };
      
      // Añadir el nuevo estimado al array
      savedEstimates.push(estimateWithTimestamp);
      
      // Guardar el array actualizado en localStorage
      localStorage.setItem('owlFenceEstimates', JSON.stringify(savedEstimates));
      
      console.log("Estimado guardado exitosamente en localStorage con ID:", estimateId);
      return estimateWithTimestamp;
    } else {
      // En producción, usar Firestore
      const estimateWithTimestamp = {
        ...estimateData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, "estimates"), estimateWithTimestamp);
      console.log("Estimado guardado exitosamente en Firestore con ID:", docRef.id);
      return { id: docRef.id, ...estimateWithTimestamp };
    }
  } catch (error) {
    console.error("Error al guardar estimado:", error);
    throw error;
  }
};

// Obtener todos los estimados
export const getEstimates = async (userId: string) => {
  try {
    console.log("Obteniendo estimados para usuario:", userId);
    
    // Verificar modo de desarrollo
    if (devMode) {
      console.log("Obteniendo estimados desde localStorage en modo desarrollo");
      
      // Obtener estimados de localStorage
      const savedEstimatesStr = localStorage.getItem('owlFenceEstimates');
      
      if (!savedEstimatesStr) {
        console.log("No hay estimados guardados en localStorage");
        return [];
      }
      
      // Parsear los estimados y filtrar por userId
      const allEstimates = JSON.parse(savedEstimatesStr);
      const userEstimates = allEstimates.filter((est: any) => est.userId === userId);
      
      // Ordenar por fecha de creación (más reciente primero)
      userEstimates.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`Encontrados ${userEstimates.length} estimados para el usuario`);
      return userEstimates;
    } else {
      // En producción, usar Firestore
      const estimatesRef = collection(db, "estimates");
      const q = query(
        estimatesRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Encontrados ${querySnapshot.size} estimados en Firestore`);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  } catch (error) {
    console.error("Error al obtener estimados:", error);
    throw error;
  }
};

// Obtener un estimado por su ID
export const getEstimateById = async (id: string) => {
  try {
    console.log("Buscando estimado con ID:", id);
    
    // Verificar modo de desarrollo
    if (devMode) {
      console.log("Buscando estimado en localStorage");
      
      // Obtener estimados de localStorage
      const savedEstimatesStr = localStorage.getItem('owlFenceEstimates');
      
      if (!savedEstimatesStr) {
        throw new Error("No hay estimados guardados");
      }
      
      // Buscar el estimado por ID
      const allEstimates = JSON.parse(savedEstimatesStr);
      const estimate = allEstimates.find((est: any) => est.id === id);
      
      if (!estimate) {
        throw new Error("Estimado no encontrado");
      }
      
      return estimate;
    } else {
      // En producción, usar Firestore
      const docRef = doc(db, "estimates", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Estimado no encontrado");
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (error) {
    console.error("Error al obtener estimado:", error);
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
// FUNCIONES DE MANEJO DE PERFIL DE USUARIO
// **************************************

// Obtener perfil de usuario
export const getUserProfile = async (userId: string) => {
  try {
    const q = query(
      collection(db, "userProfiles"),
      where("userId", "==", userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { 
      id: doc.id, 
      ...doc.data() 
    };
  } catch (error) {
    console.error("Error al obtener perfil de usuario:", error);
    throw error;
  }
};

// Guardar o actualizar perfil de usuario
export const saveUserProfile = async (userId: string, profileData: any) => {
  try {
    // Primero buscar si ya existe un perfil para este usuario
    const q = query(
      collection(db, "userProfiles"),
      where("userId", "==", userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // No existe, crear nuevo perfil
      const profileWithMeta = {
        ...profileData,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, "userProfiles"), profileWithMeta);
      return { id: docRef.id, ...profileWithMeta };
    } else {
      // Ya existe, actualizar
      const docRef = doc(db, "userProfiles", querySnapshot.docs[0].id);
      const updatedData = {
        ...profileData,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updatedData);
      return { id: docRef.id, ...updatedData };
    }
  } catch (error) {
    console.error("Error al guardar perfil de usuario:", error);
    throw error;
  }
};

// **************************************
// FUNCIONES DE AUTENTICACIÓN
// **************************************

// Registrar un nuevo usuario
export const registerUser = async (email: string, password: string) => {
  try {
    // Verificar si no estamos en modo de desarrollo antes de intentar el registro
    if (!devMode) {
      console.log("Intentando registrar usuario real en Firebase:", email);
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Usuario registrado exitosamente:", userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error("Error registrando usuario:", error);
    
    // Traducir errores de Firebase a mensajes más amigables
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión o usa otro correo.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('El formato del correo electrónico es inválido. Por favor, verifica e intenta de nuevo.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('La contraseña es demasiado débil. Usa al menos 6 caracteres que incluyan letras y números.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('El registro con email y contraseña no está habilitado. Contacta al administrador.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Problema de conexión. Verifica tu internet e intenta de nuevo.');
    } else {
      throw new Error(error.message || 'Error al crear cuenta. Por favor, intenta de nuevo más tarde.');
    }
  }
};

// Iniciar sesión con email y contraseña
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error("Error iniciando sesión:", error);
    
    // Traducir errores de Firebase a mensajes más amigables
    if (error.code === 'auth/user-not-found') {
      throw new Error('No existe una cuenta con este correo electrónico. Por favor, regístrate primero.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Contraseña incorrecta. Por favor, intenta de nuevo o usa "Olvidé mi contraseña".');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos fallidos. Por favor, intenta más tarde o restablece tu contraseña.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('El formato del correo electrónico es inválido. Por favor, revisa e intenta de nuevo.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
    } else {
      throw new Error(error.message || 'Error al iniciar sesión. Por favor, intenta de nuevo más tarde.');
    }
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

// Función para autenticación con Repl Auth (fallback)
const initReplAuth = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log("=== INICIANDO REPL AUTH COMO FALLBACK ===");
      
      // Listener para el mensaje de autenticación completa
      const authCompleteHandler = (e: MessageEvent) => {
        if (e.data !== "auth_complete") {
          return;
        }
        
        console.log("Repl Auth completado exitosamente");
        window.removeEventListener("message", authCompleteHandler);
        
        if (authWindow) {
          authWindow.close();
        }
        
        // Crear usuario simulado para Repl Auth
        const replUser = {
          uid: `repl-user-${Date.now()}`,
          email: "user@replit.dev",
          displayName: "Usuario Replit",
          photoURL: null,
          phoneNumber: null,
          emailVerified: true,
          getIdToken: () => Promise.resolve(`repl-token-${Date.now()}`),
          toJSON: () => ({
            uid: `repl-user-${Date.now()}`,
            email: "user@replit.dev",
            displayName: "Usuario Replit"
          })
        };
        
        resolve(replUser);
      };
      
      window.addEventListener("message", authCompleteHandler);
      
      // Configurar ventana de autenticación
      const h = 500;
      const w = 350;
      const left = (screen.width / 2) - (w / 2);
      const top = (screen.height / 2) - (h / 2);
      
      const authWindow = window.open(
        `https://replit.com/auth_with_repl_site?domain=${location.host}`,
        "_blank",
        `modal=yes, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${top}, left=${left}`
      );
      
      if (!authWindow) {
        window.removeEventListener("message", authCompleteHandler);
        reject(new Error("No se pudo abrir la ventana de autenticación de Replit"));
        return;
      }
      
      // Timeout de seguridad
      setTimeout(() => {
        if (authWindow && !authWindow.closed) {
          authWindow.close();
          window.removeEventListener("message", authCompleteHandler);
          reject(new Error("Timeout en autenticación de Replit"));
        }
      }, 30000); // 30 segundos timeout
      
    } catch (error) {
      console.error("Error iniciando Repl Auth:", error);
      reject(error);
    }
  });
};

// Iniciar sesión con Apple - VERSIÓN CORREGIDA
export const loginWithApple = async () => {
  try {
    // Si estamos en modo de desarrollo, usar autenticación simulada
    if (devMode) {
      console.log("Usando login de desarrollo (sin Firebase - Apple)");
      const devUser = createDevUser();
      
      setTimeout(() => {
        const event = new CustomEvent('dev-auth-change', { detail: { user: devUser } });
        window.dispatchEvent(event);
      }, 500);
      
      return devUser;
    }
    
    console.log("=== APPLE SIGN-IN CORREGIDO ===");
    console.log("Dominio:", window.location.hostname);
    console.log("AuthDomain:", auth.app.options.authDomain);
    
    // Crear proveedor con configuración limpia
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    // Configurar parámetros específicos para Replit
    provider.setCustomParameters({
      'locale': 'en_US'
    });
    
    // Guardar estado para el callback
    sessionStorage.setItem('apple_auth_redirect', JSON.stringify({
      timestamp: Date.now(),
      from: window.location.href,
      domain: window.location.hostname
    }));
    
    console.log("Iniciando autenticación optimizada con Apple...");
    
    // Verificar conectividad básica
    if (!navigator.onLine) {
      throw new Error('NO_INTERNET');
    }
    
    // Implementar reintentos con timeouts progresivos
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Intento ${attempts}/${maxAttempts} de conectar con Apple`);
      
      try {
        const timeoutDuration = 5000 + (attempts * 2000); // 5s, 7s, 9s
        
        const redirectPromise = signInWithRedirect(auth, provider);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutDuration);
        });
        
        await Promise.race([redirectPromise, timeoutPromise]);
        console.log("Redirección a Apple iniciada exitosamente");
        return null;
        
      } catch (attemptError: any) {
        console.log(`Intento ${attempts} falló:`, attemptError.message);
        
        if (attempts === maxAttempts) {
          throw new Error('APPLE_UNRESPONSIVE');
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    throw new Error('MAX_ATTEMPTS_REACHED');
    
  } catch (error: any) {
    console.error("Error en Apple Sign-In:", error);
    console.error("Código:", error.code);
    console.error("Mensaje:", error.message);
    
    // Manejo específico de errores de Apple
    if (error.message === 'APPLE_UNRESPONSIVE' || error.message === 'MAX_ATTEMPTS_REACHED' || error.message === 'NO_INTERNET') {
      console.log("Apple no responde después de múltiples intentos - activando fallback");
      if (isReplitDev) {
        console.log("Usando sistema alternativo de autenticación");
        try {
          return await initReplAuth();
        } catch (replError) {
          console.error("Error en sistema alternativo:", replError);
          throw new Error("Apple ID no responde. Por favor, intenta con Google o ingresa con email y contraseña.");
        }
      }
      throw new Error("Apple ID no responde después de varios intentos. Intenta con otro método de autenticación.");
    }
    
    // Para otros errores en entornos de desarrollo, usar fallback
    if (isReplitDev && (error.code === 'auth/unauthorized-domain' || error.code === 'auth/network-request-failed')) {
      console.log("Error de conectividad con Apple - usando fallback");
      return await initReplAuth();
    }
    
    // Proporcionar error específico para producción
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error("Dominio no autorizado en Apple Developer Console");
    } else if (error.code === 'auth/invalid-oauth-provider') {
      throw new Error("Apple Sign-In no está configurado correctamente");
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