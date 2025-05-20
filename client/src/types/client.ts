
export interface Client {
  id?: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  notes?: string;
  classification: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  alternativePhone?: string;
  alternativeEmail?: string;
  address2?: string;
  [key: string]: any; // Para campos dinámicos adicionales
}
