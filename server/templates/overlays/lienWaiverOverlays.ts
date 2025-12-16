/**
 * Lien Waiver Legal Overlays - State-Specific Legal Language
 * 
 * Architecture:
 * - One template, multiple legal overlays
 * - Overlay replaces ONLY the waiver body text
 * - Header, summary, footer, and signature logic remain unchanged
 * 
 * Overlay Types:
 * - GENERIC: Default for states with flexible lien waiver rules
 * - SEMI_STRUCTURED: Generic + state notice clause
 * - STATUTORY: Strict statutory language required by law
 */

import { extractStateFromAddress } from '../../utils/jurisdictionDetector';

export type OverlayType = 'GENERIC' | 'SEMI_STRUCTURED' | 'STATUTORY';

export interface LienWaiverOverlay {
  stateCode: string;
  stateName: string;
  overlayType: OverlayType;
  waiverBodyHTML: (data: LienWaiverOverlayData) => string;
  requiredFields?: string[];
  stateNotice?: string;
  statutoryReference?: string;
}

export interface LienWaiverOverlayData {
  claimantName: string;
  claimantAddress?: string;
  claimantLicense?: string;
  ownerName: string;
  customerName: string;
  projectLocation: string;
  throughDate: string;
  paymentAmount: string;
  paymentAmountWords?: string;
  paymentReference?: string;
  paymentMethod?: string;
  exceptions?: string;
  documentDate: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  return numberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
};

/**
 * GENERIC OVERLAY - Default for most states
 * Strong, lender-friendly language with conditional release
 */
const GENERIC_OVERLAY: LienWaiverOverlay = {
  stateCode: 'GENERIC',
  stateName: 'Generic (All States)',
  overlayType: 'GENERIC',
  waiverBodyHTML: (data) => `
    <div class="waiver-body">
      <h3 style="text-align: center; color: #1a365d; margin-bottom: 24px; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
        CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT
      </h3>
      
      <div class="legal-recitals" style="margin-bottom: 24px;">
        <p style="margin-bottom: 16px; text-align: justify; line-height: 1.7;">
          <strong>KNOW ALL PERSONS BY THESE PRESENTS</strong> that the undersigned Claimant, 
          <strong>${data.claimantName}</strong>${data.claimantLicense ? ` (License No. ${data.claimantLicense})` : ''}, 
          having furnished labor, services, equipment, or materials for the improvement of certain real property 
          commonly known as <strong>${data.projectLocation}</strong>, hereby provides this Conditional Waiver 
          and Release on Progress Payment in accordance with applicable law.
        </p>
      </div>

      <div class="payment-acknowledgment" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px 0; color: #1a365d; font-size: 14px;">PROGRESS PAYMENT IDENTIFICATION</h4>
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 40%;">Property Owner:</td>
            <td style="padding: 6px 0; font-weight: 600;">${data.ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Payment From:</td>
            <td style="padding: 6px 0; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Through Date:</td>
            <td style="padding: 6px 0; font-weight: 600;">${data.throughDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Progress Payment Amount:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #059669;">${data.paymentAmount}</td>
          </tr>
          ${data.paymentReference ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Payment Reference:</td>
            <td style="padding: 6px 0;">${data.paymentReference}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div class="conditional-release" style="margin-bottom: 24px;">
        <h4 style="color: #1a365d; font-size: 14px; margin-bottom: 12px; text-transform: uppercase;">Conditional Release Terms</h4>
        <p style="text-align: justify; line-height: 1.7; margin-bottom: 16px;">
          Upon receipt by the undersigned of a check from <strong>${data.customerName}</strong> in the sum of 
          <strong>${data.paymentAmount}</strong> payable to the undersigned, and when the check has been properly 
          endorsed and has been paid by the bank upon which it is drawn, this document shall become effective to 
          release any lien, stop payment notice, or bond right the undersigned has on the job of 
          <strong>${data.ownerName}</strong> located at <strong>${data.projectLocation}</strong> to the following extent:
        </p>
        <p style="text-align: justify; line-height: 1.7; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px;">
          This release covers a progress payment for labor, services, equipment, or materials furnished to that 
          job site <strong>through ${data.throughDate}</strong> only and does not cover any retentions, 
          pending modifications and changes, or items furnished after that date.
        </p>
      </div>

      <div class="reservations" style="margin-bottom: 24px;">
        <h4 style="color: #1a365d; font-size: 14px; margin-bottom: 12px; text-transform: uppercase;">Rights Reserved</h4>
        <p style="text-align: justify; line-height: 1.7; margin-bottom: 12px;">
          The undersigned expressly reserves and does not waive or release any of the following:
        </p>
        <ul style="margin: 0; padding-left: 24px; line-height: 1.8;">
          <li>Rights arising from labor, services, equipment, or materials furnished after <strong>${data.throughDate}</strong></li>
          <li>Retainage or retention amounts not included in this progress payment</li>
          <li>Pending change orders, amendments, or modifications to the contract scope</li>
          <li>Claims or amounts that are in dispute as of the date of this waiver</li>
          <li>Any claim for which this conditional payment has not actually been received and cleared</li>
        </ul>
      </div>

      ${data.exceptions ? `
      <div class="exceptions" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 13px;">EXCEPTIONS TO THIS WAIVER</h4>
        <p style="margin: 0; font-size: 13px;">${data.exceptions}</p>
      </div>
      ` : ''}

      <div class="legal-notice" style="background: #f1f5f9; border-radius: 6px; padding: 16px; margin-bottom: 24px; font-size: 12px; color: #475569;">
        <p style="margin: 0; line-height: 1.6;">
          <strong>NOTICE:</strong> This document is a conditional waiver and release. It is effective only upon 
          the actual receipt of payment by the undersigned and clearance of the check through the banking system. 
          Before any recipient of this document relies on it, said party should verify evidence of payment to the 
          undersigned.
        </p>
      </div>
    </div>
  `
};

/**
 * CALIFORNIA STATUTORY OVERLAY
 * Civil Code Section 8132 - Conditional Waiver and Release on Progress Payment
 */
const CALIFORNIA_OVERLAY: LienWaiverOverlay = {
  stateCode: 'CA',
  stateName: 'California',
  overlayType: 'STATUTORY',
  statutoryReference: 'California Civil Code Section 8132',
  requiredFields: ['claimantName', 'ownerName', 'projectLocation', 'throughDate', 'paymentAmount'],
  waiverBodyHTML: (data) => `
    <div class="waiver-body statutory-form">
      <div class="statutory-header" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a365d;">
        <h3 style="color: #1a365d; margin: 0 0 8px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
          CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT
        </h3>
        <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
          California Civil Code Section 8132
        </p>
      </div>

      <div class="statutory-notice" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6; text-align: center; font-weight: 600; color: #92400e;">
          NOTICE: THIS DOCUMENT WAIVES THE CLAIMANT'S LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS 
          EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED 
          THAT THE CLAIMANT HAS RECEIVED PAYMENT.
        </p>
      </div>

      <div class="form-fields" style="margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; width: 35%; color: #64748b;">Name of Claimant:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.claimantName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Name of Customer:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Job Location:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.projectLocation}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Owner:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Through Date:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.throughDate}</td>
          </tr>
        </table>
      </div>

      <div class="conditional-statement" style="margin-bottom: 24px;">
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          This document waives and releases lien, stop payment notice, and payment bond rights the claimant 
          has for labor and service provided, and equipment and material delivered, to the customer on this job 
          through <strong>${data.throughDate}</strong>. Rights based upon labor or service provided, or equipment 
          or material delivered, pursuant to a written change order that has been fully executed by the parties 
          prior to the date that this document is signed by the claimant, are waived and released by this document, 
          unless listed as an Exception below.
        </p>
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          This document is effective only on the claimant's receipt of payment from the financial institution 
          on which the following check is drawn:
        </p>
      </div>

      <div class="payment-info" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #166534; width: 35%;">Maker of Check:</td>
            <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #166534;">Amount of Check:</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 16px;">${data.paymentAmount}</td>
          </tr>
          ${data.paymentReference ? `
          <tr>
            <td style="padding: 8px 0; color: #166534;">Check Payable to:</td>
            <td style="padding: 8px 0;">${data.claimantName}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${data.exceptions ? `
      <div class="exceptions" style="margin-bottom: 24px;">
        <h4 style="color: #1a365d; font-size: 14px; margin-bottom: 8px;">Exceptions:</h4>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px;">
          <p style="margin: 0; font-size: 13px;">${data.exceptions}</p>
        </div>
      </div>
      ` : `
      <div class="exceptions" style="margin-bottom: 24px;">
        <h4 style="color: #1a365d; font-size: 14px; margin-bottom: 8px;">Exceptions:</h4>
        <p style="font-size: 13px; color: #64748b; font-style: italic;">None</p>
      </div>
      `}
    </div>
  `
};

/**
 * TEXAS STATUTORY OVERLAY
 * Texas Property Code Chapter 53
 */
const TEXAS_OVERLAY: LienWaiverOverlay = {
  stateCode: 'TX',
  stateName: 'Texas',
  overlayType: 'STATUTORY',
  statutoryReference: 'Texas Property Code Section 53.284',
  requiredFields: ['claimantName', 'ownerName', 'projectLocation', 'throughDate', 'paymentAmount'],
  waiverBodyHTML: (data) => `
    <div class="waiver-body statutory-form">
      <div class="statutory-header" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a365d;">
        <h3 style="color: #1a365d; margin: 0 0 8px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
          CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT
        </h3>
        <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
          Texas Property Code Section 53.284
        </p>
      </div>

      <div class="statutory-notice" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6; text-align: center; font-weight: 600; color: #92400e;">
          NOTICE: THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR 
          GIVING UP THOSE RIGHTS. IT IS NOT VALID UNTIL YOU RECEIVE THE STATED PAYMENT. THIS DOCUMENT IS 
          ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, 
          USE A CONDITIONAL RELEASE FORM.
        </p>
      </div>

      <div class="form-fields" style="margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; width: 35%; color: #64748b;">Project:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.projectLocation}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Owner:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Claimant:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.claimantName}</td>
          </tr>
        </table>
      </div>

      <div class="conditional-statement" style="margin-bottom: 24px;">
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          On receipt by the undersigned of a check from <strong>${data.customerName}</strong> in the sum of 
          <strong>${data.paymentAmount}</strong> payable to <strong>${data.claimantName}</strong> and when the 
          check has been properly endorsed and has been paid by the bank on which it is drawn, this document 
          becomes effective to release any mechanic's lien right, any right arising from a payment bond that 
          complies with a state or federal statute, any common law payment bond right, any claim for payment, 
          and any rights under any similar ordinance, rule, or statute related to claim or payment rights for 
          persons in the claimant's position that the claimant has on the property of <strong>${data.ownerName}</strong> 
          located at <strong>${data.projectLocation}</strong> to the following extent:
        </p>
        
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; text-align: justify; line-height: 1.7;">
            This release covers a progress payment for all labor, services, equipment, or materials furnished to 
            the property or to <strong>${data.customerName}</strong> as of <strong>${data.throughDate}</strong> only and does 
            not cover labor, services, equipment, or materials not compensated by this progress payment.
          </p>
        </div>
      </div>

      ${data.exceptions ? `
      <div class="exceptions" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 13px;">EXCEPTIONS</h4>
        <p style="margin: 0; font-size: 13px;">${data.exceptions}</p>
      </div>
      ` : ''}
    </div>
  `
};

/**
 * ARIZONA STATUTORY OVERLAY
 * ARS Title 33 Chapter 7
 */
const ARIZONA_OVERLAY: LienWaiverOverlay = {
  stateCode: 'AZ',
  stateName: 'Arizona',
  overlayType: 'STATUTORY',
  statutoryReference: 'Arizona Revised Statutes 33-1008',
  requiredFields: ['claimantName', 'ownerName', 'projectLocation', 'throughDate', 'paymentAmount'],
  waiverBodyHTML: (data) => `
    <div class="waiver-body statutory-form">
      <div class="statutory-header" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a365d;">
        <h3 style="color: #1a365d; margin: 0 0 8px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
          CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT
        </h3>
        <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
          Arizona Revised Statutes Section 33-1008
        </p>
      </div>

      <div class="statutory-notice" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6; text-align: center; font-weight: 600; color: #92400e;">
          NOTICE TO CLAIMANT: THIS DOCUMENT WAIVES AND RELEASES LIEN RIGHTS AND PAYMENT BOND RIGHTS UNCONDITIONALLY 
          ON RECEIPT OF THE PAYMENT INDICATED. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS THE PERSON HAS 
          VERIFIED EVIDENCE OF PAYMENT TO THE CLAIMANT.
        </p>
      </div>

      <div class="form-fields" style="margin-bottom: 24px; background: #f8fafc; border-radius: 6px; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 10px 0; color: #64748b; width: 35%;">Claimant's Name:</td>
            <td style="padding: 10px 0; font-weight: 600;">${data.claimantName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">Customer's Name:</td>
            <td style="padding: 10px 0; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">Owner's Name:</td>
            <td style="padding: 10px 0; font-weight: 600;">${data.ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">Job Description:</td>
            <td style="padding: 10px 0; font-weight: 600;">${data.projectLocation}</td>
          </tr>
        </table>
      </div>

      <div class="conditional-statement" style="margin-bottom: 24px;">
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          This document waives and releases lien and payment bond rights the claimant has for labor and service 
          provided, and equipment and material delivered, to the customer on this job through <strong>${data.throughDate}</strong>.
        </p>
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          This document is effective only on the claimant's receipt of payment from the financial institution 
          on which the following check is drawn:
        </p>
      </div>

      <div class="payment-info" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #166534; width: 35%;">Maker of Check:</td>
            <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #166534;">Amount of Check:</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 16px;">${data.paymentAmount}</td>
          </tr>
        </table>
      </div>

      ${data.exceptions ? `
      <div class="exceptions" style="margin-bottom: 24px;">
        <h4 style="color: #1a365d; font-size: 14px; margin-bottom: 8px;">Exceptions:</h4>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px;">
          <p style="margin: 0; font-size: 13px;">${data.exceptions}</p>
        </div>
      </div>
      ` : ''}
    </div>
  `
};

/**
 * NEVADA STATUTORY OVERLAY
 * NRS Chapter 108
 */
const NEVADA_OVERLAY: LienWaiverOverlay = {
  stateCode: 'NV',
  stateName: 'Nevada',
  overlayType: 'STATUTORY',
  statutoryReference: 'Nevada Revised Statutes 108.2457',
  requiredFields: ['claimantName', 'ownerName', 'projectLocation', 'throughDate', 'paymentAmount'],
  waiverBodyHTML: (data) => `
    <div class="waiver-body statutory-form">
      <div class="statutory-header" style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a365d;">
        <h3 style="color: #1a365d; margin: 0 0 8px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
          WAIVER AND RELEASE ON PROGRESS PAYMENT
        </h3>
        <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
          Nevada Revised Statutes Section 108.2457
        </p>
      </div>

      <div class="statutory-notice" style="background: #dbeafe; border: 2px solid #3b82f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; line-height: 1.6; text-align: center; font-weight: 600; color: #1e40af;">
          NOTICE: THIS IS A WAIVER AND RELEASE. SIGNING IT AND ACCEPTING PAYMENT WAIVES IMPORTANT RIGHTS. 
          READ IT CAREFULLY BEFORE SIGNING.
        </p>
      </div>

      <div class="form-fields" style="margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; width: 35%; color: #64748b;">Project:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.projectLocation}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Owner:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.ownerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Claimant:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.claimantName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Through Date:</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${data.throughDate}</td>
          </tr>
        </table>
      </div>

      <div class="conditional-statement" style="margin-bottom: 24px;">
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          On receipt by the undersigned of a check from <strong>${data.customerName}</strong> in the sum of 
          <strong>${data.paymentAmount}</strong>, and when the check has been properly endorsed and has been 
          paid by the bank on which it is drawn, this document becomes effective to release any lien right, 
          any stop notice right, any payment bond right, or any right to assert a claim against a bonded 
          payment bond or against a licensed contractor in this state for any claims of nonpayment that the 
          undersigned has for labor, services, equipment, or materials furnished through <strong>${data.throughDate}</strong> 
          on the job of <strong>${data.ownerName}</strong> located at <strong>${data.projectLocation}</strong>.
        </p>

        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; text-align: justify; line-height: 1.7;">
            <strong>This release covers a progress payment only.</strong> It does not cover retainage, 
            extra labor, services, equipment, or materials furnished after <strong>${data.throughDate}</strong>, 
            or the following disputed items:
          </p>
        </div>
      </div>

      ${data.exceptions ? `
      <div class="exceptions" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #b91c1c; font-size: 13px;">DISPUTED ITEMS / EXCEPTIONS</h4>
        <p style="margin: 0; font-size: 13px;">${data.exceptions}</p>
      </div>
      ` : `
      <div class="exceptions" style="margin-bottom: 24px;">
        <p style="font-size: 13px; color: #64748b;">Disputed Items: <em>None</em></p>
      </div>
      `}
    </div>
  `
};

/**
 * Semi-Structured State Overlays
 * Uses generic language + state compliance notice
 */
const createSemiStructuredOverlay = (stateCode: string, stateName: string): LienWaiverOverlay => ({
  stateCode,
  stateName,
  overlayType: 'SEMI_STRUCTURED',
  stateNotice: `This waiver is intended to comply with the laws of the State of ${stateName}.`,
  waiverBodyHTML: (data) => {
    const genericHTML = GENERIC_OVERLAY.waiverBodyHTML(data);
    const stateNotice = `
      <div class="state-compliance-notice" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin-top: 16px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 12px; color: #1e40af; text-align: center;">
          <strong>STATE COMPLIANCE:</strong> This waiver is intended to comply with the laws of the State of ${stateName}.
        </p>
      </div>
    `;
    // Insert state notice before the closing </div> of waiver-body to keep HTML structure valid
    const lastDivClose = genericHTML.lastIndexOf('</div>');
    if (lastDivClose !== -1) {
      return genericHTML.slice(0, lastDivClose) + stateNotice + genericHTML.slice(lastDivClose);
    }
    return genericHTML + stateNotice;
  }
});

/**
 * Overlay Registry - Maps state codes to overlays
 */
const OVERLAY_REGISTRY: Map<string, LienWaiverOverlay> = new Map([
  ['GENERIC', GENERIC_OVERLAY],
  ['CA', CALIFORNIA_OVERLAY],
  ['TX', TEXAS_OVERLAY],
  ['AZ', ARIZONA_OVERLAY],
  ['NV', NEVADA_OVERLAY],
  ['FL', createSemiStructuredOverlay('FL', 'Florida')],
  ['GA', createSemiStructuredOverlay('GA', 'Georgia')],
  ['NC', createSemiStructuredOverlay('NC', 'North Carolina')],
  ['SC', createSemiStructuredOverlay('SC', 'South Carolina')],
  ['TN', createSemiStructuredOverlay('TN', 'Tennessee')],
]);

/**
 * Jurisdiction Detection Priority Order:
 * 1. Project location state
 * 2. Linked contract location (future)
 * 3. Company primary state (future)
 * 4. GENERIC fallback
 */
export interface JurisdictionContext {
  projectLocation?: string;
  contractLocation?: string;
  companyState?: string;
}

export function detectJurisdictionForLienWaiver(context: JurisdictionContext): {
  stateCode: string;
  stateName: string;
  source: 'project' | 'contract' | 'company' | 'fallback';
} {
  console.log('🗺️ [LIEN-WAIVER-OVERLAY] Detecting jurisdiction...', context);

  // Priority 1: Project location
  if (context.projectLocation) {
    const stateCode = extractStateFromAddress(context.projectLocation);
    if (stateCode) {
      const overlay = OVERLAY_REGISTRY.get(stateCode);
      const stateName = overlay?.stateName || stateCode;
      console.log(`✅ [LIEN-WAIVER-OVERLAY] Detected from project: ${stateCode} (${stateName})`);
      return { stateCode, stateName, source: 'project' };
    }
  }

  // Priority 2: Contract location (if different from project)
  if (context.contractLocation) {
    const stateCode = extractStateFromAddress(context.contractLocation);
    if (stateCode) {
      const overlay = OVERLAY_REGISTRY.get(stateCode);
      const stateName = overlay?.stateName || stateCode;
      console.log(`✅ [LIEN-WAIVER-OVERLAY] Detected from contract: ${stateCode} (${stateName})`);
      return { stateCode, stateName, source: 'contract' };
    }
  }

  // Priority 3: Company primary state
  if (context.companyState) {
    const stateCode = context.companyState.toUpperCase();
    if (stateCode.length === 2) {
      const overlay = OVERLAY_REGISTRY.get(stateCode);
      const stateName = overlay?.stateName || stateCode;
      console.log(`✅ [LIEN-WAIVER-OVERLAY] Using company state: ${stateCode} (${stateName})`);
      return { stateCode, stateName, source: 'company' };
    }
  }

  // Fallback: GENERIC
  console.log('⚠️ [LIEN-WAIVER-OVERLAY] No jurisdiction detected, using GENERIC fallback');
  return { stateCode: 'GENERIC', stateName: 'Generic (All States)', source: 'fallback' };
}

/**
 * Get the appropriate legal overlay for a state
 */
export function getLienWaiverOverlay(stateCode: string): LienWaiverOverlay {
  const overlay = OVERLAY_REGISTRY.get(stateCode.toUpperCase());
  
  if (overlay) {
    console.log(`📜 [LIEN-WAIVER-OVERLAY] Using ${overlay.overlayType} overlay for ${overlay.stateName}`);
    return overlay;
  }
  
  console.log(`📜 [LIEN-WAIVER-OVERLAY] No specific overlay for ${stateCode}, using GENERIC`);
  return GENERIC_OVERLAY;
}

/**
 * Validate required fields for statutory states
 */
export function validateStatutoryRequirements(
  stateCode: string, 
  data: Partial<LienWaiverOverlayData>
): { valid: boolean; missingFields: string[] } {
  const overlay = getLienWaiverOverlay(stateCode);
  
  if (overlay.overlayType !== 'STATUTORY' || !overlay.requiredFields) {
    return { valid: true, missingFields: [] };
  }

  const missingFields: string[] = [];
  
  for (const field of overlay.requiredFields) {
    const value = data[field as keyof LienWaiverOverlayData];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Get overlay metadata for all supported states
 */
export function getSupportedStateOverlays(): Array<{
  stateCode: string;
  stateName: string;
  overlayType: OverlayType;
  statutoryReference?: string;
}> {
  const overlays: Array<{
    stateCode: string;
    stateName: string;
    overlayType: OverlayType;
    statutoryReference?: string;
  }> = [];
  
  OVERLAY_REGISTRY.forEach((overlay) => {
    overlays.push({
      stateCode: overlay.stateCode,
      stateName: overlay.stateName,
      overlayType: overlay.overlayType,
      statutoryReference: overlay.statutoryReference
    });
  });
  
  return overlays;
}
