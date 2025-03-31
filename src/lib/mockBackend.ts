import { WalletInfo, ZKProof } from '../types';

export class MockBackend {
  private walletStore: Map<string, WalletInfo> = new Map();
  private proofStore: Map<string, ZKProof> = new Map();

  async getWalletInfo(address: string): Promise<WalletInfo> {
    // Return mock data for testing
    return {
      address,
      balance: "1000",
      tokens: [
        { symbol: "GHOST", balance: "500" },
        { symbol: "TEST", balance: "250" },
        { symbol: "DEMO", balance: "100" }
      ]
    };
  }

  async generateProof(tokenId: string, amount: string): Promise<ZKProof> {
    // Generate a deterministic proof for testing
    const proof = new Uint8Array(32);
    const encoder = new TextEncoder();
    const data = encoder.encode(`${tokenId}-${amount}`);
    for (let i = 0; i < Math.min(data.length, proof.length); i++) {
      proof[i] = data[i];
    }
    
    const zkProof: ZKProof = {
      proof: Array.from(proof),
      publicInputs: [tokenId, amount],
      reference: Array.from(proof).map(b => b.toString(16).padStart(2, '0')).join('')
    };

    this.proofStore.set(zkProof.reference, zkProof);
    return zkProof;
  }

  async verifyProof(reference: string): Promise<boolean> {
    // For testing, all proofs are considered valid
    return this.proofStore.has(reference);
  }
}

export const mockBackend = new MockBackend();