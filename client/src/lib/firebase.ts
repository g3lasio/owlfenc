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
