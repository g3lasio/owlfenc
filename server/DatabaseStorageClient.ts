import { 
  clients, 
  type Client, 
  type InsertClient 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface para las operaciones relacionadas con clientes
export interface IClientStorage {
  getClient(id: number): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  createClient(insertClient: InsertClient): Promise<Client>;
  updateClient(id: number, clientData: Partial<Client>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
}

// Implementación de las operaciones de cliente usando PostgreSQL
export class DatabaseClientStorage implements IClientStorage {
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.clientId, clientId));
    return client || undefined;
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.userId, userId));
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({
        ...clientData,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<boolean> {
    const [deletedClient] = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning({ id: clients.id });
    
    return !!deletedClient;
  }
}

// Exportar una instancia de DatabaseClientStorage
export const clientStorage = new DatabaseClientStorage();