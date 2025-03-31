import type { ActorMethod } from '@dfinity/agent';

export interface Token {
  symbol: string;
  balance: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  tokens: Token[];
}

export interface ZKProof {
  proof: Uint8Array;
  publicInputs: string[];
  reference: string;
}

export interface _SERVICE {
  getWalletInfo: ActorMethod<[string], WalletInfo>;
  generateProof: ActorMethod<[string, string], ZKProof>;
  verifyProof: ActorMethod<[string], boolean>;
}

export declare const idlFactory: ({ IDL }: { IDL: any }) => any;
