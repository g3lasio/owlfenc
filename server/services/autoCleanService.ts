import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ClientData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  [key: string]: any;
}

interface NormalizationResult {
  original: ClientData;
  normalized: ClientData;
  corrections: CorrectionLog[];
  confidence: number;
  needsAI: boolean;
}

interface CorrectionLog {
  field: string;
  originalValue: string;
  newValue: string;
  reason: string;
  confidence: number;
}

interface AutoCleanMetadata {
  lastCleanedAt: string;
  strategy: 'heuristic' | 'ai' | 'hybrid';
  confidence: number;
  correctionsApplied: number;
}

const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

const STATE_ABBREVIATIONS = new Set(Object.values(US_STATES));

export class NormalizationToolkit {
  private static PHONE_PATTERN = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  private static PHONE_IN_TEXT = /[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}/g;
  private static EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static EMAIL_IN_TEXT = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  private static ZIP_PATTERN = /^\d{5}(-\d{4})?$/;
  private static ZIP_IN_TEXT = /\b\d{5}(-\d{4})?\b/g;
  private static ADDRESS_KEYWORDS = /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|circle|cir|boulevard|blvd|way|place|pl|terrace|ter|highway|hwy|parkway|pkwy)\b/i;
  private static STREET_NUMBER_PATTERN = /^\d+\s+[A-Za-z]/;

  static isPhone(value: string): { isPhone: boolean; confidence: number } {
    if (!value) return { isPhone: false, confidence: 0 };
    const cleaned = value.replace(/[\s\-\.\(\)]/g, '');
    const digitsOnly = cleaned.replace(/\D/g, '');
    
    if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
      if (this.PHONE_PATTERN.test(value) || /^\d{10,11}$/.test(digitsOnly)) {
        return { isPhone: true, confidence: 0.95 };
      }
    }
    
    if (digitsOnly.length >= 7 && digitsOnly.length <= 11 && !value.includes('@')) {
      return { isPhone: true, confidence: 0.7 };
    }
    
    return { isPhone: false, confidence: 0 };
  }

  static isEmail(value: string): { isEmail: boolean; confidence: number } {
    if (!value) return { isEmail: false, confidence: 0 };
    const trimmed = value.trim().toLowerCase();
    
    if (this.EMAIL_PATTERN.test(trimmed)) {
      if (trimmed.includes('.com') || trimmed.includes('.net') || trimmed.includes('.org') || trimmed.includes('.edu')) {
        return { isEmail: true, confidence: 0.98 };
      }
      return { isEmail: true, confidence: 0.9 };
    }
    
    if (trimmed.includes('@') && trimmed.includes('.')) {
      return { isEmail: true, confidence: 0.7 };
    }
    
    return { isEmail: false, confidence: 0 };
  }

  static isAddress(value: string): { isAddress: boolean; confidence: number } {
    if (!value) return { isAddress: false, confidence: 0 };
    
    if (this.STREET_NUMBER_PATTERN.test(value) && this.ADDRESS_KEYWORDS.test(value)) {
      return { isAddress: true, confidence: 0.95 };
    }
    
    if (this.STREET_NUMBER_PATTERN.test(value)) {
      return { isAddress: true, confidence: 0.8 };
    }
    
    if (this.ADDRESS_KEYWORDS.test(value)) {
      return { isAddress: true, confidence: 0.7 };
    }
    
    return { isAddress: false, confidence: 0 };
  }

  static isCity(value: string): { isCity: boolean; confidence: number } {
    if (!value) return { isCity: false, confidence: 0 };
    
    if (/^\d/.test(value)) return { isCity: false, confidence: 0 };
    if (this.ADDRESS_KEYWORDS.test(value)) return { isCity: false, confidence: 0 };
    
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(value.trim())) {
      return { isCity: true, confidence: 0.8 };
    }
    
    if (/^[A-Za-z\s]+$/.test(value.trim()) && value.length < 30) {
      return { isCity: true, confidence: 0.6 };
    }
    
    return { isCity: false, confidence: 0 };
  }

  static isState(value: string): { isState: boolean; normalized: string; confidence: number } {
    if (!value) return { isState: false, normalized: '', confidence: 0 };
    const trimmed = value.trim();
    
    if (STATE_ABBREVIATIONS.has(trimmed.toUpperCase())) {
      return { isState: true, normalized: trimmed.toUpperCase(), confidence: 0.99 };
    }
    
    const lowered = trimmed.toLowerCase();
    if (US_STATES[lowered]) {
      return { isState: true, normalized: US_STATES[lowered], confidence: 0.99 };
    }
    
    return { isState: false, normalized: '', confidence: 0 };
  }

  static isZipCode(value: string): { isZip: boolean; confidence: number } {
    if (!value) return { isZip: false, confidence: 0 };
    const trimmed = value.trim();
    
    if (this.ZIP_PATTERN.test(trimmed)) {
      return { isZip: true, confidence: 0.99 };
    }
    
    if (/^\d{5}$/.test(trimmed)) {
      return { isZip: true, confidence: 0.95 };
    }
    
    return { isZip: false, confidence: 0 };
  }

  static detectConcatenatedData(value: string): { 
    isConcatenated: boolean; 
    parts: string[]; 
    confidence: number;
    suggestedSplit: { address?: string; city?: string; state?: string; zip?: string } | null;
  } {
    if (!value || value.length < 10) {
      return { isConcatenated: false, parts: [], confidence: 0, suggestedSplit: null };
    }

    const patterns = [
      /^(\d+\s+[^,]+?)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)$/,
      /^(.+?),?\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/,
      /^(.+?)\s+([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/,
      /^(\d+\s+\w+(?:\s+\w+)*)\s+([A-Z][a-z]+)\s*,?\s*([A-Z]{2})?\s*(\d{5})?$/,
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        const parts = match.slice(1).filter(Boolean);
        const suggestedSplit: { address?: string; city?: string; state?: string; zip?: string } = {};
        
        for (const part of parts) {
          const stateCheck = this.isState(part);
          if (stateCheck.isState) {
            suggestedSplit.state = stateCheck.normalized;
            continue;
          }
          
          if (this.isZipCode(part).isZip) {
            suggestedSplit.zip = part;
            continue;
          }
          
          if (this.isAddress(part).isAddress) {
            suggestedSplit.address = part;
            continue;
          }
          
          if (this.isCity(part).isCity && !suggestedSplit.city) {
            suggestedSplit.city = part;
          }
        }
        
        return { 
          isConcatenated: true, 
          parts, 
          confidence: 0.85,
          suggestedSplit: Object.keys(suggestedSplit).length > 0 ? suggestedSplit : null
        };
      }
    }

    const hasAddressPart = this.STREET_NUMBER_PATTERN.test(value);
    const hasCityPart = /[A-Z][a-z]+$/.test(value);
    const noDelimiters = !value.includes(',') && !value.includes('\n');
    
    if (hasAddressPart && hasCityPart && noDelimiters && value.length > 20) {
      const cityMatch = value.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)$/);
      if (cityMatch) {
        const address = value.replace(cityMatch[0], '').trim();
        return {
          isConcatenated: true,
          parts: [address, cityMatch[1]],
          confidence: 0.75,
          suggestedSplit: { address, city: cityMatch[1] }
        };
      }
    }

    return { isConcatenated: false, parts: [], confidence: 0, suggestedSplit: null };
  }

  static extractPhoneFromText(text: string): string | null {
    const matches = text.match(this.PHONE_IN_TEXT);
    return matches ? matches[0] : null;
  }

  static extractEmailFromText(text: string): string | null {
    const matches = text.match(this.EMAIL_IN_TEXT);
    return matches ? matches[0].toLowerCase() : null;
  }

  static extractZipFromText(text: string): string | null {
    const matches = text.match(this.ZIP_IN_TEXT);
    return matches ? matches[0] : null;
  }

  static normalizePhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  }

  static normalizeEmail(email: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
  }
}

export class AutoCleanService {
  private processedCache: Map<string, { hash: string; cleanedAt: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60;

  private computeHash(client: ClientData): string {
    const relevant = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
    };
    return JSON.stringify(relevant);
  }

  private shouldProcess(clientId: string, client: ClientData): boolean {
    const cached = this.processedCache.get(clientId);
    if (!cached) return true;
    
    const hash = this.computeHash(client);
    if (cached.hash !== hash) return true;
    
    if (Date.now() - cached.cleanedAt > this.CACHE_TTL) return true;
    
    return false;
  }

  async cleanClient(client: ClientData): Promise<NormalizationResult> {
    const corrections: CorrectionLog[] = [];
    const normalized = { ...client };
    let overallConfidence = 1.0;
    let needsAI = false;

    if (client.phone) {
      const phoneCheck = NormalizationToolkit.isPhone(client.phone);
      
      if (!phoneCheck.isPhone) {
        const addressCheck = NormalizationToolkit.isAddress(client.phone);
        if (addressCheck.isAddress && addressCheck.confidence > 0.7) {
          if (!normalized.address || normalized.address.length < client.phone.length) {
            corrections.push({
              field: 'phone→address',
              originalValue: client.phone,
              newValue: client.phone,
              reason: 'Address found in phone field',
              confidence: addressCheck.confidence
            });
            normalized.address = client.phone;
            normalized.phone = '';
          }
        }

        const emailInPhone = NormalizationToolkit.extractEmailFromText(client.phone);
        if (emailInPhone) {
          corrections.push({
            field: 'phone→email',
            originalValue: client.phone,
            newValue: emailInPhone,
            reason: 'Email found in phone field',
            confidence: 0.95
          });
          if (!normalized.email) {
            normalized.email = emailInPhone;
          }
          normalized.phone = client.phone.replace(emailInPhone, '').trim();
        }
      } else {
        normalized.phone = NormalizationToolkit.normalizePhone(client.phone);
        if (normalized.phone !== client.phone) {
          corrections.push({
            field: 'phone',
            originalValue: client.phone,
            newValue: normalized.phone,
            reason: 'Phone number normalized',
            confidence: 0.99
          });
        }
      }
    }

    if (client.address) {
      const concat = NormalizationToolkit.detectConcatenatedData(client.address);
      
      if (concat.isConcatenated && concat.suggestedSplit) {
        const split = concat.suggestedSplit;
        
        if (split.address && split.address !== client.address) {
          corrections.push({
            field: 'address',
            originalValue: client.address,
            newValue: split.address,
            reason: 'Extracted address from concatenated data',
            confidence: concat.confidence
          });
          normalized.address = split.address;
        }
        
        if (split.city && !normalized.city) {
          corrections.push({
            field: 'city',
            originalValue: '',
            newValue: split.city,
            reason: 'Extracted city from concatenated address',
            confidence: concat.confidence
          });
          normalized.city = split.city;
        }
        
        if (split.state && !normalized.state) {
          corrections.push({
            field: 'state',
            originalValue: '',
            newValue: split.state,
            reason: 'Extracted state from concatenated address',
            confidence: concat.confidence
          });
          normalized.state = split.state;
        }
        
        if (split.zip && !normalized.zipCode) {
          corrections.push({
            field: 'zipCode',
            originalValue: '',
            newValue: split.zip,
            reason: 'Extracted ZIP from concatenated address',
            confidence: concat.confidence
          });
          normalized.zipCode = split.zip;
        }
        
        overallConfidence = Math.min(overallConfidence, concat.confidence);
      }

      const phoneInAddress = NormalizationToolkit.extractPhoneFromText(client.address);
      if (phoneInAddress && !normalized.phone) {
        corrections.push({
          field: 'address→phone',
          originalValue: '',
          newValue: NormalizationToolkit.normalizePhone(phoneInAddress),
          reason: 'Phone found in address field',
          confidence: 0.9
        });
        normalized.phone = NormalizationToolkit.normalizePhone(phoneInAddress);
      }
    }

    if (client.city) {
      const concat = NormalizationToolkit.detectConcatenatedData(client.city);
      
      if (concat.isConcatenated && concat.suggestedSplit) {
        if (concat.suggestedSplit.city) {
          corrections.push({
            field: 'city',
            originalValue: client.city,
            newValue: concat.suggestedSplit.city,
            reason: 'Cleaned city from concatenated data',
            confidence: concat.confidence
          });
          normalized.city = concat.suggestedSplit.city;
        }
        
        if (concat.suggestedSplit.address && !normalized.address) {
          normalized.address = concat.suggestedSplit.address;
        }
        
        overallConfidence = Math.min(overallConfidence, concat.confidence);
      }

      const stateCheck = NormalizationToolkit.isState(client.city);
      if (stateCheck.isState) {
        corrections.push({
          field: 'city→state',
          originalValue: client.city,
          newValue: stateCheck.normalized,
          reason: 'State found in city field',
          confidence: stateCheck.confidence
        });
        if (!normalized.state) {
          normalized.state = stateCheck.normalized;
        }
        normalized.city = '';
      }
    }

    if (client.email) {
      const emailCheck = NormalizationToolkit.isEmail(client.email);
      if (emailCheck.isEmail) {
        normalized.email = NormalizationToolkit.normalizeEmail(client.email);
      } else {
        const phoneCheck = NormalizationToolkit.isPhone(client.email);
        if (phoneCheck.isPhone) {
          corrections.push({
            field: 'email→phone',
            originalValue: client.email,
            newValue: NormalizationToolkit.normalizePhone(client.email),
            reason: 'Phone found in email field',
            confidence: phoneCheck.confidence
          });
          if (!normalized.phone) {
            normalized.phone = NormalizationToolkit.normalizePhone(client.email);
          }
          normalized.email = '';
        }
      }
    }

    if (client.state) {
      const stateCheck = NormalizationToolkit.isState(client.state);
      if (stateCheck.isState && stateCheck.normalized !== client.state) {
        corrections.push({
          field: 'state',
          originalValue: client.state,
          newValue: stateCheck.normalized,
          reason: 'State normalized to abbreviation',
          confidence: stateCheck.confidence
        });
        normalized.state = stateCheck.normalized;
      }
    }

    if (overallConfidence < 0.7) {
      needsAI = true;
    }

    return {
      original: client,
      normalized,
      corrections,
      confidence: overallConfidence,
      needsAI
    };
  }

  async cleanClientBatch(clients: ClientData[]): Promise<{
    cleaned: ClientData[];
    stats: {
      total: number;
      corrected: number;
      aiAssisted: number;
      corrections: CorrectionLog[];
    };
  }> {
    const results: ClientData[] = [];
    const allCorrections: CorrectionLog[] = [];
    let correctedCount = 0;
    let aiAssistedCount = 0;
    const lowConfidenceClients: ClientData[] = [];

    for (const client of clients) {
      if (client.id && !this.shouldProcess(client.id, client)) {
        results.push(client);
        continue;
      }

      const result = await this.cleanClient(client);
      
      if (result.corrections.length > 0) {
        correctedCount++;
        allCorrections.push(...result.corrections);
      }
      
      if (result.needsAI) {
        lowConfidenceClients.push(result.normalized);
      }
      
      results.push(result.normalized);
      
      if (client.id) {
        this.processedCache.set(client.id, {
          hash: this.computeHash(result.normalized),
          cleanedAt: Date.now()
        });
      }
    }

    if (lowConfidenceClients.length > 0) {
      try {
        const aiCleaned = await this.cleanWithAI(lowConfidenceClients);
        aiAssistedCount = aiCleaned.corrected;
        
        for (let i = 0; i < results.length; i++) {
          const aiResult = aiCleaned.results.find(r => r.id === results[i].id);
          if (aiResult) {
            results[i] = aiResult;
          }
        }
      } catch (error) {
        console.warn('🤖 [AUTO-CLEAN] AI cleanup fallback - using heuristic results:', error);
      }
    }

    return {
      cleaned: results,
      stats: {
        total: clients.length,
        corrected: correctedCount,
        aiAssisted: aiAssistedCount,
        corrections: allCorrections
      }
    };
  }

  private async cleanWithAI(clients: ClientData[]): Promise<{
    results: ClientData[];
    corrected: number;
  }> {
    if (clients.length === 0) {
      return { results: [], corrected: 0 };
    }

    const batchSize = 10;
    const results: ClientData[] = [];
    let corrected = 0;

    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      
      try {
        const prompt = `You are a data cleaning expert. Clean and normalize these contact records.
Fix any data that appears to be in the wrong field (e.g., addresses in phone fields, concatenated city+address).

INPUT RECORDS:
${JSON.stringify(batch.map(c => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  city: c.city,
  state: c.state,
  zipCode: c.zipCode
})), null, 2)}

RULES:
1. Phone numbers should be US format: (XXX) XXX-XXXX
2. States should be 2-letter abbreviations (CA, TX, etc.)
3. Split concatenated address+city data
4. Move data to correct fields if in wrong field
5. Preserve original data if unsure

Return ONLY valid JSON array with cleaned records:
[{ "id": "...", "name": "...", "email": "...", "phone": "...", "address": "...", "city": "...", "state": "...", "zipCode": "..." }]`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const cleanedBatch = Array.isArray(parsed) ? parsed : parsed.records || parsed.clients || [];
          
          for (const cleaned of cleanedBatch) {
            const original = batch.find(c => c.id === cleaned.id);
            if (original) {
              const merged = { ...original, ...cleaned };
              results.push(merged);
              
              if (JSON.stringify(original) !== JSON.stringify(merged)) {
                corrected++;
              }
            }
          }
        }
      } catch (error) {
        console.error('🤖 [AUTO-CLEAN] AI batch error:', error);
        results.push(...batch);
      }
    }

    return { results, corrected };
  }
}

export const autoCleanService = new AutoCleanService();
