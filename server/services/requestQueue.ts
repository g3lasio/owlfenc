
class RequestQueue {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;
  private rateLimit = 2; // requests per second
  private lastRequest = 0;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      
      if (timeSinceLastRequest < (1000 / this.rateLimit)) {
        await new Promise(resolve => 
          setTimeout(resolve, (1000 / this.rateLimit) - timeSinceLastRequest)
        );
      }

      const request = this.queue.shift();
      if (!request) continue;

      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      this.lastRequest = Date.now();
    }

    this.isProcessing = false;
  }
}

export const requestQueue = new RequestQueue();
