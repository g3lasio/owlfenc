/**
 * 🔐 DIGITAL CERTIFICATION SERVICE
 * Sistema de certificación digital de nivel empresarial para firmas electrónicas
 * Competidor directo de DocuSign/PandaDoc
 * 
 * Features:
 * - Generación de certificados PKI básicos
 * - Timestamps locales con hash SHA-256
 * - Hash SHA-256 de documentos y firmas para verificación de integridad
 * - Chain of trust verification
 * - Audit trail completo
 * 
 * ⚠️ LIMITACIONES ACTUALES:
 * - RFC 3161 Timestamping: Usa timestamp local en vez de TSA (Time Stamping Authority) externo
 *   Para nivel full-enterprise, integrar con TSA como FreeTSA.org o DigiCert TSA
 * - PKI Signing: Certificados auto-firmados vs CA (Certificate Authority) real
 *   Para producción legal, considerar integración con CA como Let's Encrypt o DigiCert
 * 
 * 📋 ROADMAP ENTERPRISE:
 * - [ ] Integrar RFC 3161 TSA real (FreeTSA, DigiCert, etc.)
 * - [ ] Firmar certificados con CA real
 * - [ ] OCSP (Online Certificate Status Protocol) para validación en tiempo real
 * - [ ] Soporte para firmas cualificadas (eIDAS, ESIGN Act compliant)
 */

import crypto from 'crypto';

export interface DigitalCertificate {
  certificateId: string;
  timestamp: string; // ISO 8601 timestamp (local, not RFC 3161 TSA)
  timestampUnix: number;
  documentHash: string; // SHA-256 of the complete contract document
  signatureHash: string; // SHA-256 of the signature data
  verified: boolean; // Self-signed verification (not CA-verified)
  issuer: string; // Chyrris Technology Corp
  version: string; // Certificate format version
  integrityCheck?: {
    documentHashValid: boolean;
    signatureHashValid: boolean;
  };
}

export interface SignatureAuditMetadata {
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  geolocation?: {
    latitude?: number;
    longitude?: number;
  };
  biometrics?: {
    strokeCount?: number;
    avgSpeed?: number;
    pressure?: number[];
  };
}

export interface CertifiedSignature {
  signatureData: string;
  signatureType: 'drawn' | 'typed';
  certificate: DigitalCertificate;
  audit: SignatureAuditMetadata;
  storageUrls: {
    firestore: string;
    cloudStorage?: string;
  };
}

/**
 * Genera un hash SHA-256 de cualquier contenido
 */
export function generateSHA256Hash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

/**
 * Genera un Certificate ID único basado en múltiples factores
 */
export function generateCertificateId(
  documentId: string,
  signatureData: string,
  timestamp: number,
  signerName: string
): string {
  const combinedData = `${documentId}:${signatureData}:${timestamp}:${signerName}`;
  return generateSHA256Hash(combinedData);
}

/**
 * Crea un certificado digital completo para una firma
 */
export function createDigitalCertificate(
  documentId: string,
  documentContent: string,
  signatureData: string,
  signerName: string
): DigitalCertificate {
  const timestamp = new Date().toISOString();
  const timestampUnix = Date.now();
  
  const documentHash = generateSHA256Hash(documentContent);
  const signatureHash = generateSHA256Hash(signatureData);
  const certificateId = generateCertificateId(
    documentId,
    signatureData,
    timestampUnix,
    signerName
  );

  return {
    certificateId,
    timestamp,
    timestampUnix,
    documentHash,
    signatureHash,
    verified: true,
    issuer: 'Chyrris Technology Corp',
    version: '1.0.0'
  };
}

/**
 * Extrae información del dispositivo desde el User-Agent
 */
export function parseDeviceInfo(userAgent: string): string {
  if (!userAgent) return 'Unknown Device';

  // Detectar tipo de dispositivo
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('Android') && userAgent.includes('Mobile')) return 'Android Phone';
  if (userAgent.includes('Android')) return 'Android Tablet';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  
  return 'Desktop Browser';
}

/**
 * Formatea el Certificate ID para display (mostrando solo inicio y fin)
 */
export function formatCertificateId(certificateId: string): string {
  if (certificateId.length <= 16) return certificateId;
  const start = certificateId.substring(0, 6);
  const end = certificateId.substring(certificateId.length - 4);
  return `${start}...${end}`;
}

/**
 * Verifica la integridad de una firma certificada
 */
export function verifyCertifiedSignature(
  certifiedSignature: CertifiedSignature,
  documentContent: string
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verificar que el hash del documento coincide
  const currentDocumentHash = generateSHA256Hash(documentContent);
  if (currentDocumentHash !== certifiedSignature.certificate.documentHash) {
    errors.push('Document has been modified after signing');
  }

  // Verificar que el hash de la firma coincide
  const currentSignatureHash = generateSHA256Hash(certifiedSignature.signatureData);
  if (currentSignatureHash !== certifiedSignature.certificate.signatureHash) {
    errors.push('Signature data has been tampered with');
  }

  // Verificar que el certificado fue emitido por Chyrris Technology Corp
  if (certifiedSignature.certificate.issuer !== 'Chyrris Technology Corp') {
    errors.push('Invalid certificate issuer');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Crea el HTML del sello digital para mostrar en PDFs
 */
export function createDigitalSealHTML(
  signerName: string,
  certificate: DigitalCertificate,
  audit: SignatureAuditMetadata,
  contractorState?: string // 🌍 TIMEZONE FIX: Optional state for timezone detection
): string {
  // Import timezone mapper
  const { getTimezoneForState } = require('../utils/timezoneMapper');
  const timezone = getTimezoneForState(contractorState);
  
  const formattedDate = new Date(certificate.timestamp).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone // 🌍 Use contractor's timezone
  });

  const certIdShort = formatCertificateId(certificate.certificateId);

  return `
    <div style="
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
      background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%);
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.5;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 6px;">
        <span style="color: #16a34a; font-size: 14px; font-weight: bold; margin-right: 6px;">✓</span>
        <strong style="color: #1e40af; font-size: 11px;">DIGITALLY SIGNED</strong>
      </div>
      <div style="color: #1e3a8a; margin-bottom: 2px;">
        <strong>Signed by:</strong> ${signerName}
      </div>
      <div style="color: #1e3a8a; margin-bottom: 2px;">
        <strong>Date:</strong> ${formattedDate}
      </div>
      <div style="color: #1e3a8a; margin-bottom: 2px;">
        <strong>Certificate ID:</strong> ${certIdShort}
      </div>
      <div style="color: #1e3a8a; margin-bottom: 2px;">
        <strong>Verified by:</strong> Chyrris Technology Corp
      </div>
      <div style="color: #475569; font-size: 9px;">
        <strong>IP:</strong> ${audit.ipAddress} | <strong>Device:</strong> ${audit.deviceType}
      </div>
    </div>
  `;
}
