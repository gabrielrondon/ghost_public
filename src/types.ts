import { Principal } from '@dfinity/principal';

export interface TokenInfo {
  symbol: string;
  balance: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  tokens: TokenInfo[];
}

export interface ZKProof {
  proof: Uint8Array;
  publicSignals: string[];
  reference: string;
}

export interface ProofHistoryItem {
  token: string;
  timestamp: number;
  status: 'pending' | 'verified' | 'failed';
  reference: string;
  proof?: Uint8Array;
  publicSignals?: string[];
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  principal: Principal | null;
  error: string | null;
}