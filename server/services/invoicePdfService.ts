/**
 * Servicio especializado para generar PDFs de facturas usando PDFMonkey
 */

import axios from 'axios';

const PDFMONKEY_API_URL = 'https://api.pdfmonkey.io/api/v1/documents';
const INVOICE_TEMPLATE_ID = '078756DF-77FD-445F-BB68-D46077101677';

export interface InvoiceData {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
  };
  client: {
    name: string;
    address: string;
    contact: string;
  };
  invoice: {
    number: string;
    date: string;
    due_date: string;
    items: Array<{
      code: string;
      description: string;
      qty: number;
      unit_price: string;
      total: string;
    }>;
  };
}

export class InvoicePdfService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PDFMONKEY_API_KEY || '';
    console.log('🔑 [INVOICE-PDF] API Key status:', this.apiKey ? 'Found' : 'Not found');
    if (!this.apiKey) {
      console.warn('PDFMonkey API key not configured for invoice service');
    }
  }

  /**
   * Genera un PDF de factura usando PDFMonkey
   */
  async generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer> {
    try {
      if (!this.apiKey) {
        throw new Error('PDFMonkey API key not configured');
      }

      console.log('🧾 Generating invoice PDF with PDFMonkey...');
      console.log('📋 Invoice data:', {
        invoiceNumber: invoiceData.invoice.number,
        clientName: invoiceData.client.name,
        itemsCount: invoiceData.invoice.items.length
      });

      const response = await axios.post(
        PDFMONKEY_API_URL,
        {
          document: {
            document_template_id: INVOICE_TEMPLATE_ID,
            payload: invoiceData,
            meta: {
              _filename: `Invoice-${invoiceData.invoice.number}.pdf`
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 201) {
        throw new Error(`PDFMonkey returned status ${response.status}`);
      }

      const documentId = response.data.document.id;
      console.log(`📄 Invoice PDF queued with ID: ${documentId}`);

      // Poll for completion
      const pdfBuffer = await this.pollForCompletion(documentId);
      console.log(`✅ Invoice PDF generated successfully: ${pdfBuffer.length} bytes`);
      
      return pdfBuffer;

    } catch (error: any) {
      console.error('❌ Error generating invoice PDF:', error.message);
      throw new Error(`Failed to generate invoice PDF: ${error.message}`);
    }
  }

  /**
   * Espera a que el PDF esté listo y lo descarga
   */
  private async pollForCompletion(documentId: string): Promise<Buffer> {
    const maxAttempts = 60; // 60 seconds max for invoice generation
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        const statusResponse = await axios.get(
          `${PDFMONKEY_API_URL}/${documentId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        const status = statusResponse.data.document.status;
        console.log(`📊 Invoice PDF status: ${status} (attempt ${attempts + 1})`);

        if (status === 'success') {
          const downloadUrl = statusResponse.data.document.download_url;
          
          const pdfResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer'
          });
          
          return Buffer.from(pdfResponse.data);
        } else if (status === 'error') {
          throw new Error('PDFMonkey generation failed');
        }

        // Wait 1 second before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

      } catch (error: any) {
        console.error('Error polling for PDF completion:', error.message);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Timeout waiting for invoice PDF generation');
  }

  /**
   * Convierte datos de estimado a formato de factura
   */
  static convertEstimateToInvoiceData(
    estimateData: any, 
    contractorData: any,
    invoiceNumber?: string
  ): InvoiceData {
    const now = new Date();
    const dueDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now

    // Generar número de factura si no se proporciona
    const invoiceNum = invoiceNumber || `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Formatear dirección del cliente
    const clientAddress = [
      estimateData.client?.address,
      estimateData.client?.city ? `${estimateData.client.city}, ${estimateData.client?.state || ''} ${estimateData.client?.zipCode || ''}`.trim() : null
    ].filter(Boolean).join('\n');

    const clientContact = [
      estimateData.client?.phone ? `Phone: ${estimateData.client.phone}` : null,
      estimateData.client?.email ? `Email: ${estimateData.client.email}` : null
    ].filter(Boolean).join('\n');

    // Formatear dirección de la empresa
    const companyAddress = [
      contractorData?.address,
      contractorData?.city ? `${contractorData.city}, ${contractorData?.state || ''} ${contractorData?.zipCode || ''}`.trim() : null
    ].filter(Boolean).join('\n');

    return {
      company: {
        name: contractorData?.company || contractorData?.name || 'Your Company Name',
        address: companyAddress || 'Company Address',
        phone: contractorData?.phone || 'Phone Number',
        email: contractorData?.email || 'email@company.com',
        website: contractorData?.website || 'www.company.com',
        logo: contractorData?.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjYiPkxvZ288L3RleHQ+PC9zdmc+'
      },
      client: {
        name: estimateData.client?.name || 'Client Name',
        address: clientAddress || 'Client Address',
        contact: clientContact || 'Client Contact'
      },
      invoice: {
        number: invoiceNum,
        date: now.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        due_date: dueDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        items: (estimateData.items || []).map((item: any, index: number) => ({
          code: `ITEM-${String(index + 1).padStart(3, '0')}`,
          description: item.description || item.name || 'Service Item',
          qty: item.quantity || 1,
          unit_price: `$${(item.price || 0).toFixed(2)}`,
          total: `$${(item.total || item.price || 0).toFixed(2)}`
        }))
      }
    };
  }
}

export const invoicePdfService = new InvoicePdfService();