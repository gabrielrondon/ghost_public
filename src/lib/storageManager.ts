import { ProofHistoryItem } from '../types';

class StorageManager {
  private static instance: StorageManager;
  private readonly DB_NAME = 'ghost_proofs';
  private readonly STORE_NAME = 'proofs';
  private db: IDBDatabase | null = null;
  
  private constructor() {}
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }
  
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      
      request.onerror = () => {
        console.error('Failed to open database');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create the proofs object store
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'reference' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('status', 'status');
        }
      };
    });
  }
  
  async saveProof(proof: ProofHistoryItem): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(proof);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }
  
  async getProof(reference: string): Promise<ProofHistoryItem | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.get(reference);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }
  
  async getAllProofs(): Promise<ProofHistoryItem[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      
      const request = index.getAll();
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }
  
  async updateProofStatus(reference: string, status: 'pending' | 'verified' | 'failed'): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const getRequest = store.get(reference);
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
      
      getRequest.onsuccess = () => {
        const proof = getRequest.result;
        if (proof) {
          proof.status = status;
          const updateRequest = store.put(proof);
          
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
          
          updateRequest.onsuccess = () => {
            resolve();
          };
        } else {
          reject(new Error('Proof not found'));
        }
      };
    });
  }
  
  async deleteProof(reference: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.delete(reference);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

export const storageManager = StorageManager.getInstance();
