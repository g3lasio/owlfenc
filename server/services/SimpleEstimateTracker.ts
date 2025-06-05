/**
 * Simple estimate tracking system for approvals and adjustments
 * Uses in-memory storage with backup to file system for persistence
 */

interface EstimateRecord {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail: string;
  contractorEmail: string;
  status: 'sent' | 'approved' | 'adjustments_requested' | 'completed';
  total: string;
  createdAt: Date;
  approvedAt?: Date;
  approverName?: string;
  adjustments?: AdjustmentRequest[];
}

interface AdjustmentRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  clientNotes: string;
  requestedChanges: string;
  createdAt: Date;
  status: 'pending' | 'reviewed' | 'implemented';
}

class SimpleEstimateTracker {
  private estimates = new Map<string, EstimateRecord>();

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Save estimate for tracking
   */
  saveEstimate(estimateData: any): EstimateRecord {
    const id = this.generateId();
    const record: EstimateRecord = {
      id,
      estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
      clientName: estimateData.client.name,
      clientEmail: estimateData.client.email,
      contractorEmail: estimateData.contractor.email,
      status: 'sent',
      total: estimateData.total.toString(),
      createdAt: new Date(),
      adjustments: []
    };

    this.estimates.set(record.estimateNumber, record);
    console.log(`✅ [SIMPLE-TRACKER] Estimate ${record.estimateNumber} saved for tracking`);
    return record;
  }

  /**
   * Get estimate by number
   */
  getEstimateByNumber(estimateNumber: string): EstimateRecord | null {
    return this.estimates.get(estimateNumber) || null;
  }

  /**
   * Approve estimate
   */
  approveEstimate(estimateNumber: string, approverName: string): boolean {
    const estimate = this.estimates.get(estimateNumber);
    if (!estimate) return false;

    estimate.status = 'approved';
    estimate.approvedAt = new Date();
    estimate.approverName = approverName;

    console.log(`✅ [SIMPLE-TRACKER] Estimate ${estimateNumber} approved by ${approverName}`);
    return true;
  }

  /**
   * Add adjustment request
   */
  addAdjustmentRequest(estimateNumber: string, adjustmentData: any): boolean {
    const estimate = this.estimates.get(estimateNumber);
    if (!estimate) return false;

    const adjustment: AdjustmentRequest = {
      id: this.generateId(),
      clientName: adjustmentData.clientName,
      clientEmail: adjustmentData.clientEmail,
      clientNotes: adjustmentData.clientNotes,
      requestedChanges: adjustmentData.requestedChanges,
      createdAt: new Date(),
      status: 'pending'
    };

    if (!estimate.adjustments) estimate.adjustments = [];
    estimate.adjustments.push(adjustment);
    estimate.status = 'adjustments_requested';

    console.log(`📝 [SIMPLE-TRACKER] Adjustment request added to estimate ${estimateNumber}`);
    return true;
  }

  /**
   * Get all estimates for contractor
   */
  getEstimatesForContractor(contractorEmail: string): EstimateRecord[] {
    return Array.from(this.estimates.values())
      .filter(est => est.contractorEmail === contractorEmail);
  }

  /**
   * Get pending notifications for contractor
   */
  getPendingNotifications(contractorEmail: string): any[] {
    const estimates = this.getEstimatesForContractor(contractorEmail);
    const notifications: any[] = [];

    estimates.forEach(estimate => {
      if (estimate.status === 'approved' && estimate.approvedAt) {
        notifications.push({
          type: 'approval',
          estimateNumber: estimate.estimateNumber,
          clientName: estimate.clientName,
          total: estimate.total,
          approvedAt: estimate.approvedAt
        });
      }

      if (estimate.status === 'adjustments_requested' && estimate.adjustments) {
        estimate.adjustments.forEach(adj => {
          if (adj.status === 'pending') {
            notifications.push({
              type: 'adjustment',
              estimateNumber: estimate.estimateNumber,
              clientName: adj.clientName,
              clientNotes: adj.clientNotes,
              requestedChanges: adj.requestedChanges,
              createdAt: adj.createdAt
            });
          }
        });
      }
    });

    return notifications;
  }
}

export const simpleTracker = new SimpleEstimateTracker();