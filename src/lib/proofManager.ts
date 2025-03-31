import { ProofHistoryItem, ZKProof } from '../types';
import { Actor } from '@dfinity/agent';
import type { _SERVICE } from '../declarations/ghost/ghost.did.d';

interface MockProofResult {
  success: boolean;
  reference: string;
  error?: string;
}

// Mock implementation for development
class MockActor {
  async getWalletInfo(principal: string) {
    return {
      address: '0x123...abc',
      balance: '1000',
      tokens: [
        { symbol: 'TEST', balance: '500' },
        { symbol: 'GHOST', balance: '250' }
      ]
    };
  }

  async generateProof(tokenId: string, balance: string): Promise<MockProofResult> {
    console.log('Mock generating proof for:', { tokenId, balance });
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      reference: `proof-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
    };
  }

  async verifyProof(reference: string) {
    console.log('Mock verifying proof:', reference);
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  }
}

class ProofManager {
  private static instance: ProofManager;
  private actor: Actor | null = null;
  private mockActor: MockActor | null = null;
  private proofs: Map<string, ProofHistoryItem> = new Map();
  
  private constructor() {
    // Initialize mock actor if in mock mode
    if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
      this.mockActor = new MockActor();
    }
  }
  
  static getInstance(): ProofManager {
    if (!ProofManager.instance) {
      ProofManager.instance = new ProofManager();
    }
    return ProofManager.instance;
  }

  setActor(actor: Actor | null): void {
    this.actor = actor;
  }
  
  async generateProof(
    tokenId: string,
    balance: bigint
  ): Promise<{ success: boolean; proof?: ZKProof; error?: string }> {
    try {
      // Use mock actor if in mock mode
      if (import.meta.env.VITE_MOCK_BACKEND === 'true' && this.mockActor) {
        const result = await this.mockActor.generateProof(
          tokenId,
          balance.toString()
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to generate proof');
        }
        
        return {
          success: true,
          proof: {
            proof: new Uint8Array(),
            publicSignals: [],
            reference: result.reference,
          },
        };
      }
      
      // Use real actor if not in mock mode
      if (!this.actor) {
        throw new Error('Actor not initialized. Please connect your wallet first.');
      }

      console.log('Generating proof with real canister:', {
        tokenId,
        balance: balance.toString()
      });

      // Use the canister to generate the proof
      const result = await (this.actor as unknown as _SERVICE).generateProof(
        tokenId,
        balance.toString()
      );

      console.log('Proof generated successfully:', result);
      
      return {
        success: true,
        proof: {
          proof: result.proof,
          publicSignals: result.publicInputs,
          reference: result.reference,
        },
      };
    } catch (error) {
      console.error('Failed to generate proof:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async verifyProof(reference: string): Promise<boolean> {
    try {
      // Use mock actor if in mock mode
      if (import.meta.env.VITE_MOCK_BACKEND === 'true' && this.mockActor) {
        return await this.mockActor.verifyProof(reference);
      }
      
      // Use real actor if not in mock mode
      if (!this.actor) {
        throw new Error('Actor not initialized. Please connect your wallet first.');
      }

      console.log('Verifying proof with real canister:', reference);
      
      // Use the canister to verify the proof
      return await (this.actor as unknown as _SERVICE).verifyProof(reference);
    } catch (error) {
      console.error('Failed to verify proof:', error);
      return false;
    }
  }
  
  getProofHistory(): ProofHistoryItem[] {
    return Array.from(this.proofs.values());
  }
}

export const proofManager = ProofManager.getInstance();