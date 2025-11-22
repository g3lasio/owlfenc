/**
 * Completion Queue Service
 * 
 * ASYNC BACKGROUND JOB SYSTEM FOR CONTRACT COMPLETION
 * 
 * Responsibilities:
 * - Enqueue contract completion jobs
 * - Process jobs asynchronously (non-blocking)
 * - Prevent duplicate job processing
 * - Track job status
 * - Emit events for monitoring
 * 
 * Key Features:
 * - ✅ In-memory queue (no external dependencies)
 * - ✅ Duplicate prevention
 * - ✅ Event-driven architecture
 * - ✅ Error handling
 * - ✅ Job status tracking
 */

import { EventEmitter } from 'events';
import { completionWorker } from './completionWorker';

/**
 * Job status
 */
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Job data
 */
export interface CompletionJob {
  contractId: string;
  finalSigningIp: string;
  enqueuedAt: Date;
  status: JobStatus;
  error?: string;
}

/**
 * Completion Queue
 * 
 * Handles asynchronous processing of contract completions
 */
class CompletionQueue extends EventEmitter {
  // In-memory job tracking
  private processing = new Set<string>();
  private jobs = new Map<string, CompletionJob>();
  
  /**
   * Enqueue a contract for completion
   * 
   * This method is NON-BLOCKING - it returns immediately after enqueueing the job.
   * The actual completion happens in the background.
   * 
   * ✅ FIX: Added deduplication to prevent duplicate jobs from Firestore transaction retries
   * 
   * @param contractId - Contract to complete
   * @param finalSigningIp - IP address of final signer
   */
  async enqueue(contractId: string, finalSigningIp: string): Promise<void> {
    // ✅ FIX: Check if already processing (prevent duplicates from transaction retries)
    if (this.processing.has(contractId)) {
      console.log(`⚠️ [QUEUE] Contract ${contractId} already in queue - skipping duplicate (transaction retry protection)`);
      return;
    }
    
    // ✅ FIX: Check if job already exists and is processing
    const existingJob = this.jobs.get(contractId);
    if (existingJob && (existingJob.status === JobStatus.PROCESSING || existingJob.status === JobStatus.QUEUED)) {
      console.log(`⚠️ [QUEUE] Contract ${contractId} is already ${existingJob.status} - skipping duplicate`);
      return;
    }
    
    // Create job
    const job: CompletionJob = {
      contractId,
      finalSigningIp,
      enqueuedAt: new Date(),
      status: JobStatus.QUEUED,
    };
    
    this.jobs.set(contractId, job);
    this.processing.add(contractId);
    
    console.log(`✅ [QUEUE] Contract ${contractId} enqueued for completion`);
    this.emit('job:enqueued', contractId);
    
    // Process asynchronously (don't await)
    this.processJob(contractId, finalSigningIp)
      .catch(error => {
        console.error(`❌ [QUEUE] Error processing ${contractId}:`, error);
        this.emit('job:error', contractId, error);
      })
      .finally(() => {
        this.processing.delete(contractId);
      });
  }
  
  /**
   * Process a completion job
   * 
   * This runs in the background and doesn't block the caller
   */
  private async processJob(contractId: string, finalSigningIp: string): Promise<void> {
    try {
      // Update job status
      const job = this.jobs.get(contractId);
      if (job) {
        job.status = JobStatus.PROCESSING;
      }
      
      console.log(`🔄 [QUEUE] Processing completion for ${contractId}`);
      this.emit('job:processing', contractId);
      
      // Call CompletionWorker
      const result = await completionWorker.processCompletion(contractId, finalSigningIp);
      
      if (result.success) {
        console.log(`✅ [QUEUE] Completion succeeded for ${contractId}`);
        
        // Update job status
        if (job) {
          job.status = JobStatus.COMPLETED;
        }
        
        this.emit('job:completed', contractId);
      } else {
        throw new Error(result.message);
      }
      
    } catch (error: any) {
      console.error(`❌ [QUEUE] Completion failed for ${contractId}:`, error);
      
      // Update job status
      const job = this.jobs.get(contractId);
      if (job) {
        job.status = JobStatus.FAILED;
        job.error = error.message;
      }
      
      this.emit('job:failed', contractId, error);
      throw error;
    }
  }
  
  /**
   * Get job status
   */
  getJobStatus(contractId: string): CompletionJob | undefined {
    return this.jobs.get(contractId);
  }
  
  /**
   * Get all jobs
   */
  getAllJobs(): CompletionJob[] {
    return Array.from(this.jobs.values());
  }
  
  /**
   * Get processing jobs count
   */
  getProcessingCount(): number {
    return this.processing.size;
  }
  
  /**
   * Check if contract is being processed
   */
  isProcessing(contractId: string): boolean {
    return this.processing.has(contractId);
  }
  
  /**
   * Clear completed jobs (cleanup)
   * Call this periodically to prevent memory leaks
   */
  clearCompletedJobs(): void {
    const completedJobs: string[] = [];
    
    for (const [contractId, job] of this.jobs.entries()) {
      if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
        // Only clear jobs older than 1 hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        if (job.enqueuedAt < oneHourAgo) {
          completedJobs.push(contractId);
        }
      }
    }
    
    completedJobs.forEach(contractId => {
      this.jobs.delete(contractId);
    });
    
    if (completedJobs.length > 0) {
      console.log(`🧹 [QUEUE] Cleared ${completedJobs.length} old jobs`);
    }
  }
}

// Export singleton instance
export const completionQueue = new CompletionQueue();

/**
 * ✅ FIX: Process pending jobs from Firestore on startup
 * 
 * This ensures jobs are not lost if server crashes or restarts.
 * Implements the "read side" of the transactional outbox pattern.
 */
async function processPendingJobsFromFirestore() {
  try {
    console.log('🔄 [QUEUE] Processing pending jobs from Firestore...');
    
    const { db: firebaseDb } = await import('../lib/firebase-admin');
    
    // ✅ CRITICAL FIX: Also recover stale 'processing' jobs (crash recovery)
    // A job is stale if it's been processing for >5 minutes (worker probably crashed)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Query all pending, failed, OR stale processing jobs
    const pendingJobs = await firebaseDb
      .collection('completionJobs')
      .where('status', 'in', ['pending', 'failed'])
      .limit(100)
      .get();
    
    // Also query stale processing jobs separately (can't use IN with < operator)
    const staleProcessingJobs = await firebaseDb
      .collection('completionJobs')
      .where('status', '==', 'processing')
      .where('claimedAt', '<', fiveMinutesAgo)
      .limit(50)
      .get();
    
    // Combine both result sets
    const allJobs = [...pendingJobs.docs, ...staleProcessingJobs.docs];
    
    if (allJobs.length === 0) {
      console.log('✅ [QUEUE] No pending jobs found in Firestore');
      return;
    }
    
    console.log(`📋 [QUEUE] Found ${allJobs.length} jobs in Firestore (${pendingJobs.size} pending/failed, ${staleProcessingJobs.size} stale processing)`);
    
    // Enqueue all pending jobs with distributed locking
    for (const doc of allJobs) {
      const job = doc.data();
      
      // Skip if retry count exceeded
      if (job.retryCount >= 5) {
        console.warn(`🚨 [QUEUE] Job ${job.contractId} exceeded max retries - marking as failed`);
        await doc.ref.update({
          status: 'max_retries_exceeded',
          updatedAt: new Date(),
        });
        continue;
      }
      
      try {
        // ✅ CRITICAL FIX: Use Firestore transaction with compare-and-set for distributed locking
        // This prevents multiple server instances from processing the same job
        const claimed = await firebaseDb.runTransaction(async (transaction) => {
          const freshJob = await transaction.get(doc.ref);
          
          if (!freshJob.exists) {
            return false; // Job deleted
          }
          
          const freshData = freshJob.data()!;
          
          // Only claim if:
          // 1. Status is 'pending' or 'failed', OR
          // 2. Status is 'processing' but claim is stale (>5 min old)
          const isStale = freshData.status === 'processing' && 
                         freshData.claimedAt && 
                         (Date.now() - freshData.claimedAt.toDate().getTime()) > 5 * 60 * 1000;
          
          if (freshData.status !== 'pending' && freshData.status !== 'failed' && !isStale) {
            console.log(`⏭️ [QUEUE] Job ${job.contractId} already claimed by another worker (status: ${freshData.status})`);
            return false;
          }
          
          if (isStale) {
            console.log(`🔄 [QUEUE] Job ${job.contractId} has stale claim - recovering (crashed worker)`);
          }
          
          // Claim the job atomically (compare-and-set)
          transaction.update(doc.ref, {
            status: 'processing',
            claimedAt: new Date(),
            updatedAt: new Date(),
          });
          
          return true; // Successfully claimed
        });
        
        if (!claimed) {
          continue; // Job already claimed by another worker
        }
        
        console.log(`⏩ [QUEUE] Job ${job.contractId} claimed successfully - enqueueing`);
        
        // Enqueue job (already claimed, safe to process)
        await completionQueue.enqueue(job.contractId, job.finalSigningIp);
        
      } catch (claimError: any) {
        console.error(`❌ [QUEUE] Failed to claim job ${job.contractId}:`, claimError);
        // Continue to next job
      }
    }
    
    console.log(`✅ [QUEUE] Processed ${allJobs.length} jobs from Firestore`);
    
  } catch (error: any) {
    console.error('❌ [QUEUE] Error processing pending jobs from Firestore:', error);
  }
}

// Process pending jobs on startup (after 5 seconds to allow server to fully initialize)
setTimeout(() => {
  processPendingJobsFromFirestore();
}, 5000);

// Also process pending jobs every 5 minutes (catch any jobs that were missed)
setInterval(() => {
  processPendingJobsFromFirestore();
}, 5 * 60 * 1000);

// Auto-cleanup every hour
setInterval(() => {
  completionQueue.clearCompletedJobs();
}, 60 * 60 * 1000);

// Log queue statistics every 5 minutes (for monitoring)
setInterval(() => {
  const processingCount = completionQueue.getProcessingCount();
  const totalJobs = completionQueue.getAllJobs().length;
  
  if (totalJobs > 0) {
    console.log(`📊 [QUEUE] Stats: ${processingCount} processing, ${totalJobs} total jobs`);
  }
}, 5 * 60 * 1000);
