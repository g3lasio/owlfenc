import { 
  User, 
  InsertUser, 
  Project, 
  InsertProject, 
  Template, 
  InsertTemplate, 
  Settings, 
  InsertSettings, 
  ChatLog, 
  InsertChatLog,
  Client,
  InsertClient,
  SubscriptionPlan,
  InsertSubscriptionPlan,
  UserSubscription,
  InsertUserSubscription,
  PaymentHistory,
  InsertPaymentHistory,
  Material,
  InsertMaterial,
  PromptTemplate,
  InsertPromptTemplate
} from "@shared/schema";

import { IStorage } from './storage';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

// Convertir Timestamp de Firestore a Date de JavaScript
const convertTimestampToDate = (obj: any): any => {
  if (!obj) return obj;

  if (obj instanceof Timestamp) {
    return obj.toDate();
  }

  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = convertTimestampToDate(obj[key]);
      }
    }
  }

  return obj;
};

export class FirebaseStorage implements IStorage {
  constructor() {
    // No necesita inicialización especial
  }
  
  async healthCheck(): Promise<boolean> {
    return this.checkFirebaseConnection();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const userRef = doc(db, 'users', id.toString());
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return convertTimestampToDate(userSnap.data()) as User;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(userData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as User;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Generar un ID para el usuario
      const id = Date.now();
      
      // Preparar los datos del usuario
      const userData = {
        ...insertUser,
        id,
        createdAt: serverTimestamp()
      };
      
      // Guardar el usuario en Firestore
      const userRef = doc(db, 'users', id.toString());
      await setDoc(userRef, userData);
      
      // Retornar el usuario creado
      return {
        ...userData,
        createdAt: new Date()
      } as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  private async checkFirebaseConnection(): Promise<boolean> {
    try {
      const testRef = doc(db, '_connection_test', 'test');
      await setDoc(testRef, { timestamp: serverTimestamp() });
      await deleteDoc(testRef);
      return true;
    } catch (error) {
      console.error('Firebase connection check failed:', error);
      return false;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Verificar conexión
        const isConnected = await this.checkFirebaseConnection();
        if (!isConnected) {
          throw new Error('No hay conexión con Firebase');
        }

        const userRef = doc(db, 'users', id.toString());
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          throw new Error(`Usuario con ID ${id} no encontrado`);
        }
        
        // Actualizar los datos del usuario
        await updateDoc(userRef, {
          ...userData,
          updatedAt: serverTimestamp()
        });
        
        // Verificar que los datos se actualizaron correctamente
        const updatedUserSnap = await getDoc(userRef);
        const updatedData = updatedUserSnap.data();
        
        if (!updatedData) {
          throw new Error('Error al verificar la actualización');
        }
        
        return {
          ...convertTimestampToDate(updatedData),
          id
        } as User;
      } catch (error: any) {
        console.error(`Error updating user (attempt ${retryCount + 1}/${maxRetries}):`, error);
        
        if (retryCount === maxRetries - 1) {
          throw new Error(`Error al actualizar usuario: ${error.message}`);
        }
        
        retryCount++;
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    throw new Error('Error inesperado al actualizar usuario');
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    try {
      const projectRef = doc(db, 'projects', id.toString());
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        return {
          ...convertTimestampToDate(projectSnap.data()),
          id
        } as Project;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching project:', error);
      return undefined;
    }
  }

  async getProjectByProjectId(projectId: string): Promise<Project | undefined> {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('projectId', '==', projectId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const projectData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(projectData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as Project;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching project by projectId:', error);
      return undefined;
    }
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(
        projectsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...convertTimestampToDate(doc.data()),
        id: parseInt(doc.id, 10)
      })) as Project[];
    } catch (error) {
      console.error('Error fetching projects by userId:', error);
      return [];
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    try {
      // Generar un ID para el proyecto
      const id = Date.now();
      
      // Preparar los datos del proyecto
      const projectData = {
        ...insertProject,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Guardar el proyecto en Firestore
      const projectRef = doc(db, 'projects', id.toString());
      await updateDoc(projectRef, projectData);
      
      // Retornar el proyecto creado
      return {
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    try {
      const projectRef = doc(db, 'projects', id.toString());
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        throw new Error(`Project with ID ${id} not found`);
      }
      
      // Actualizar los datos del proyecto
      const updatedData = {
        ...projectData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(projectRef, updatedData);
      
      // Obtener los datos actualizados
      const updatedProjectSnap = await getDoc(projectRef);
      
      return {
        ...convertTimestampToDate(updatedProjectSnap.data()),
        id
      } as Project;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Template methods
  async getTemplate(id: number): Promise<Template | undefined> {
    try {
      const templateRef = doc(db, 'templates', id.toString());
      const templateSnap = await getDoc(templateRef);
      
      if (templateSnap.exists()) {
        return {
          ...convertTimestampToDate(templateSnap.data()),
          id
        } as Template;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching template:', error);
      return undefined;
    }
  }

  async getTemplatesByType(userId: number, type: string): Promise<Template[]> {
    try {
      const templatesRef = collection(db, 'templates');
      const q = query(
        templatesRef, 
        where('userId', '==', userId),
        where('type', '==', type)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...convertTimestampToDate(doc.data()),
        id: parseInt(doc.id, 10)
      })) as Template[];
    } catch (error) {
      console.error('Error fetching templates by type:', error);
      return [];
    }
  }

  async getDefaultTemplate(userId: number, type: string): Promise<Template | undefined> {
    try {
      const templatesRef = collection(db, 'templates');
      const q = query(
        templatesRef, 
        where('userId', '==', userId),
        where('type', '==', type),
        where('isDefault', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const templateData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(templateData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as Template;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching default template:', error);
      return undefined;
    }
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    try {
      // Generar un ID para la plantilla
      const id = Date.now();
      
      // Preparar los datos de la plantilla
      const templateData = {
        ...insertTemplate,
        id,
        createdAt: serverTimestamp()
      };
      
      // Guardar la plantilla en Firestore
      const templateRef = doc(db, 'templates', id.toString());
      await updateDoc(templateRef, templateData);
      
      // Retornar la plantilla creada
      return {
        ...templateData,
        createdAt: new Date()
      } as Template;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(id: number, templateData: Partial<Template>): Promise<Template> {
    try {
      const templateRef = doc(db, 'templates', id.toString());
      const templateSnap = await getDoc(templateRef);
      
      if (!templateSnap.exists()) {
        throw new Error(`Template with ID ${id} not found`);
      }
      
      // Actualizar los datos de la plantilla
      await updateDoc(templateRef, templateData);
      
      // Obtener los datos actualizados
      const updatedTemplateSnap = await getDoc(templateRef);
      
      return {
        ...convertTimestampToDate(updatedTemplateSnap.data()),
        id
      } as Template;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | undefined> {
    try {
      const settingsRef = collection(db, 'settings');
      const q = query(settingsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const settingsData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(settingsData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as Settings;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return undefined;
    }
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    try {
      // Generar un ID para las configuraciones
      const id = Date.now();
      
      // Preparar los datos de las configuraciones
      const settingsData = {
        ...insertSettings,
        id,
        updatedAt: serverTimestamp()
      };
      
      // Guardar las configuraciones en Firestore
      const settingsRef = doc(db, 'settings', id.toString());
      await updateDoc(settingsRef, settingsData);
      
      // Retornar las configuraciones creadas
      return {
        ...settingsData,
        updatedAt: new Date()
      } as Settings;
    } catch (error) {
      console.error('Error creating settings:', error);
      throw error;
    }
  }

  async updateSettings(userId: number, settingsData: Partial<Settings>): Promise<Settings> {
    try {
      // Primero verificamos si existen configuraciones para este usuario
      const existingSettings = await this.getSettings(userId);
      
      if (!existingSettings) {
        // Si no existen, las creamos con los datos proporcionados
        return this.createSettings({
          userId,
          ...settingsData,
        } as InsertSettings);
      }
      
      // Si existen, las actualizamos
      const settingsRef = doc(db, 'settings', existingSettings.id.toString());
      
      // Actualizar los datos de las configuraciones
      const updatedData = {
        ...settingsData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(settingsRef, updatedData);
      
      // Obtener los datos actualizados
      const updatedSettingsSnap = await getDoc(settingsRef);
      
      return {
        ...convertTimestampToDate(updatedSettingsSnap.data()),
        id: existingSettings.id
      } as Settings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Chat log methods
  async getChatLog(projectId: number): Promise<ChatLog | undefined> {
    try {
      const chatLogsRef = collection(db, 'chatLogs');
      const q = query(chatLogsRef, where('projectId', '==', projectId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const chatLogData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(chatLogData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as ChatLog;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching chat log:', error);
      return undefined;
    }
  }

  async createChatLog(insertChatLog: InsertChatLog): Promise<ChatLog> {
    try {
      // Generar un ID para el chat log
      const id = Date.now();
      
      // Preparar los datos del chat log
      const chatLogData = {
        ...insertChatLog,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Guardar el chat log en Firestore
      const chatLogRef = doc(db, 'chatLogs', id.toString());
      await updateDoc(chatLogRef, chatLogData);
      
      // Retornar el chat log creado
      return {
        ...chatLogData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as ChatLog;
    } catch (error) {
      console.error('Error creating chat log:', error);
      throw error;
    }
  }

  async updateChatLog(id: number, messages: any): Promise<ChatLog> {
    try {
      const chatLogRef = doc(db, 'chatLogs', id.toString());
      const chatLogSnap = await getDoc(chatLogRef);
      
      if (!chatLogSnap.exists()) {
        throw new Error(`Chat log with ID ${id} not found`);
      }
      
      // Actualizar los mensajes del chat log
      const updatedData = {
        messages,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(chatLogRef, updatedData);
      
      // Obtener los datos actualizados
      const updatedChatLogSnap = await getDoc(chatLogRef);
      
      return {
        ...convertTimestampToDate(updatedChatLogSnap.data()),
        id
      } as ChatLog;
    } catch (error) {
      console.error('Error updating chat log:', error);
      throw error;
    }
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    try {
      const clientRef = doc(db, 'clients', id.toString());
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        return {
          ...convertTimestampToDate(clientSnap.data()),
          id
        } as Client;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching client:', error);
      return undefined;
    }
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('clientId', '==', clientId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const clientData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(clientData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as Client;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching client by clientId:', error);
      return undefined;
    }
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(
        clientsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...convertTimestampToDate(doc.data()),
        id: parseInt(doc.id, 10)
      })) as Client[];
    } catch (error) {
      console.error('Error fetching clients by userId:', error);
      return [];
    }
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      // Generar un ID para el cliente
      const id = Date.now();
      
      // Preparar los datos del cliente
      const clientData = {
        ...insertClient,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Guardar el cliente en Firestore
      const clientRef = doc(db, 'clients', id.toString());
      await updateDoc(clientRef, clientData);
      
      // Retornar el cliente creado
      return {
        ...clientData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    try {
      const clientRef = doc(db, 'clients', id.toString());
      const clientSnap = await getDoc(clientRef);
      
      if (!clientSnap.exists()) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // Actualizar los datos del cliente
      const updatedData = {
        ...clientData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(clientRef, updatedData);
      
      // Obtener los datos actualizados
      const updatedClientSnap = await getDoc(clientRef);
      
      return {
        ...convertTimestampToDate(updatedClientSnap.data()),
        id
      } as Client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      const clientRef = doc(db, 'clients', id.toString());
      const clientSnap = await getDoc(clientRef);
      
      if (!clientSnap.exists()) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      // Eliminar el cliente
      await deleteDoc(clientRef);
      
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Subscription Plan methods
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    try {
      const planRef = doc(db, 'subscriptionPlans', id.toString());
      const planSnap = await getDoc(planRef);
      
      if (planSnap.exists()) {
        return {
          ...convertTimestampToDate(planSnap.data()),
          id
        } as SubscriptionPlan;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      return undefined;
    }
  }

  async getSubscriptionPlanByCode(code: string): Promise<SubscriptionPlan | undefined> {
    try {
      const plansRef = collection(db, 'subscriptionPlans');
      const q = query(plansRef, where('code', '==', code));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const planData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(planData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as SubscriptionPlan;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching subscription plan by code:', error);
      return undefined;
    }
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plansRef = collection(db, 'subscriptionPlans');
      const q = query(
        plansRef, 
        where('isActive', '==', true),
        orderBy('price', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...convertTimestampToDate(doc.data()),
        id: parseInt(doc.id, 10)
      })) as SubscriptionPlan[];
    } catch (error) {
      console.error('Error fetching all subscription plans:', error);
      return [];
    }
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    try {
      // Generar un ID para el plan
      const id = Date.now();
      
      // Preparar los datos del plan
      const planData = {
        ...insertPlan,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Guardar el plan en Firestore
      const planRef = doc(db, 'subscriptionPlans', id.toString());
      await updateDoc(planRef, planData);
      
      // Retornar el plan creado
      return {
        ...planData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as SubscriptionPlan;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  async updateSubscriptionPlan(id: number, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    try {
      const planRef = doc(db, 'subscriptionPlans', id.toString());
      const planSnap = await getDoc(planRef);
      
      if (!planSnap.exists()) {
        throw new Error(`Subscription plan with ID ${id} not found`);
      }
      
      // Actualizar los datos del plan
      const updatedData = {
        ...planData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(planRef, updatedData);
      
      // Obtener los datos actualizados
      const updatedPlanSnap = await getDoc(planRef);
      
      return {
        ...convertTimestampToDate(updatedPlanSnap.data()),
        id
      } as SubscriptionPlan;
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  // User Subscription methods
  async getUserSubscription(id: number): Promise<UserSubscription | undefined> {
    try {
      const subscriptionRef = doc(db, 'userSubscriptions', id.toString());
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (subscriptionSnap.exists()) {
        return {
          ...convertTimestampToDate(subscriptionSnap.data()),
          id
        } as UserSubscription;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return undefined;
    }
  }

  async getUserSubscriptionByUserId(userId: number): Promise<UserSubscription | undefined> {
    try {
      const subscriptionsRef = collection(db, 'userSubscriptions');
      const q = query(subscriptionsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const subscriptionData = querySnapshot.docs[0].data();
        return {
          ...convertTimestampToDate(subscriptionData),
          id: parseInt(querySnapshot.docs[0].id, 10)
        } as UserSubscription;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching user subscription by userId:', error);
      return undefined;
    }
  }

  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    try {
      // Generar un ID para la suscripción
      const id = Date.now();
      
      // Preparar los datos de la suscripción
      const subscriptionData = {
        ...insertSubscription,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Guardar la suscripción en Firestore
      const subscriptionRef = doc(db, 'userSubscriptions', id.toString());
      await updateDoc(subscriptionRef, subscriptionData);
      
      // Retornar la suscripción creada
      return {
        ...subscriptionData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserSubscription;
    } catch (error) {
      console.error('Error creating user subscription:', error);
      throw error;
    }
  }

  async updateUserSubscription(id: number, subscriptionData: Partial<UserSubscription>): Promise<UserSubscription> {
    try {
      const subscriptionRef = doc(db, 'userSubscriptions', id.toString());
      const subscriptionSnap = await getDoc(subscriptionRef);
      
      if (!subscriptionSnap.exists()) {
        throw new Error(`User subscription with ID ${id} not found`);
      }
      
      // Actualizar los datos de la suscripción
      const updatedData = {
        ...subscriptionData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(subscriptionRef, updatedData);
      
      // Obtener los datos actualizados
      const updatedSubscriptionSnap = await getDoc(subscriptionRef);
      
      return {
        ...convertTimestampToDate(updatedSubscriptionSnap.data()),
        id
      } as UserSubscription;
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  // Payment History methods
  async getPaymentHistory(id: number): Promise<PaymentHistory | undefined> {
    try {
      const paymentRef = doc(db, 'paymentHistory', id.toString());
      const paymentSnap = await getDoc(paymentRef);
      
      if (paymentSnap.exists()) {
        return {
          ...convertTimestampToDate(paymentSnap.data()),
          id
        } as PaymentHistory;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return undefined;
    }
  }

  async getPaymentHistoryByUserId(userId: number): Promise<PaymentHistory[]> {
    try {
      const paymentsRef = collection(db, 'paymentHistory');
      const q = query(
        paymentsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...convertTimestampToDate(doc.data()),
        id: parseInt(doc.id, 10)
      })) as PaymentHistory[];
    } catch (error) {
      console.error('Error fetching payment history by userId:', error);
      return [];
    }
  }

  async createPaymentHistory(insertPayment: InsertPaymentHistory): Promise<PaymentHistory> {
    try {
      // Generar un ID para el registro de pago
      const id = Date.now();
      
      // Preparar los datos del registro de pago
      const paymentData = {
        ...insertPayment,
        id,
        createdAt: serverTimestamp()
      };
      
      // Guardar el registro de pago en Firestore
      const paymentRef = doc(db, 'paymentHistory', id.toString());
      await updateDoc(paymentRef, paymentData);
      
      // Retornar el registro de pago creado
      return {
        ...paymentData,
        createdAt: new Date()
      } as PaymentHistory;
    } catch (error) {
      console.error('Error creating payment history:', error);
      throw error;
    }
  }
}