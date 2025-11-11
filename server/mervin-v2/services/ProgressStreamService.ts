/**
 * PROGRESS STREAM SERVICE - STREAMING DE PROGRESO EN TIEMPO REAL
 * 
 * Responsabilidades:
 * - Enviar actualizaciones de progreso al cliente
 * - Streaming de mensajes tipo Replit Agent
 * - Estado de la tarea en tiempo real
 */

import type { Response } from 'express';
import type { TaskProgress } from '../types/mervin-types';

export interface ProgressUpdate {
  type: 'progress' | 'message' | 'complete' | 'error';
  content: string;
  progress?: TaskProgress;
  data?: any;
}

export class ProgressStreamService {
  private res: Response | null = null;
  private isStreaming: boolean = false;

  /**
   * Inicializar stream SSE (Server-Sent Events)
   */
  initializeStream(res: Response): void {
    this.res = res;
    this.isStreaming = true;

    // Configurar headers para SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    console.log('📡 [PROGRESS-STREAM] Stream inicializado');
  }

  /**
   * Enviar actualización de progreso
   */
  sendProgress(update: ProgressUpdate): void {
    if (!this.isStreaming || !this.res) {
      return;
    }

    try {
      const data = JSON.stringify(update);
      this.res.write(`data: ${data}\n\n`);
      
      console.log(`📡 [PROGRESS-STREAM] ${update.type}:`, update.content);

    } catch (error) {
      console.error('❌ [PROGRESS-STREAM] Error enviando progreso:', error);
    }
  }

  /**
   * Enviar mensaje de progreso
   */
  sendMessage(message: string): void {
    this.sendProgress({
      type: 'message',
      content: message
    });
  }

  /**
   * Enviar actualización de progreso de tarea
   */
  sendTaskProgress(progress: TaskProgress, message: string): void {
    this.sendProgress({
      type: 'progress',
      content: message,
      progress
    });
  }

  /**
   * Enviar mensaje de completado
   */
  sendComplete(message: string, data?: any): void {
    console.log('📡 [STREAM-COMPLETE] Message length:', message.length);
    console.log('📡 [STREAM-COMPLETE] Preview:', message.substring(0, 150));
    
    this.sendProgress({
      type: 'complete',
      content: message,
      data
    });

    // Cerrar stream
    this.closeStream();
  }

  /**
   * Enviar error
   */
  sendError(error: string): void {
    this.sendProgress({
      type: 'error',
      content: error
    });

    // Cerrar stream
    this.closeStream();
  }

  /**
   * Cerrar stream
   */
  closeStream(): void {
    if (this.res && this.isStreaming) {
      this.res.end();
      this.isStreaming = false;
      console.log('📡 [PROGRESS-STREAM] Stream cerrado');
    }
  }

  /**
   * Verificar si hay un stream activo
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  // ============= HELPERS PARA TAREAS COMUNES =============

  /**
   * Enviar secuencia de inicio de tarea
   */
  async startTask(taskName: string): Promise<void> {
    this.sendMessage(`🚀 Iniciando tarea: ${taskName}`);
    await this.delay(100);
  }

  /**
   * Enviar secuencia de paso de tarea
   */
  async completeStep(stepName: string, currentStep: number, totalSteps: number): Promise<void> {
    const progress: TaskProgress = {
      currentStep,
      totalSteps,
      stepName,
      progress: Math.round((currentStep / totalSteps) * 100),
      estimatedTimeRemaining: (totalSteps - currentStep) * 1000 // Estimación simple
    };

    this.sendTaskProgress(progress, `✅ ${stepName}`);
    await this.delay(100);
  }

  /**
   * Helper de delay para animaciones
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
