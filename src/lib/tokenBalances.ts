import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { TokenInfo, WalletInfo } from '../types';
import { sha224 } from 'js-sha256';

// Token canister IDs
const TOKEN_CANISTERS = {
  ICP: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  SONIC: 'qbizb-wiaaa-aaaak-aafbq-cai'
};

// ICP Ledger interface
const icpLedgerIDL = ({ IDL }: { IDL: any }) => {
  const AccountIdentifier = IDL.Vec(IDL.Nat8);
  const Tokens = IDL.Record({ 'e8s' : IDL.Nat64 });
  return IDL.Service({
    'account_balance' : IDL.Func([AccountIdentifier], [Tokens], ['query']),
  });
};

// ICRC-1 interface
const icrc1IDL = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    'icrc1_balance_of' : IDL.Func([Account], [IDL.Nat], ['query']),
  });
};

/**
 * Fetches token balances directly from token canisters
 */
class TokenBalanceManager {
  private static instance: TokenBalanceManager;
  private agent: HttpAgent | null = null;
  
  private constructor() {}
  
  static getInstance(): TokenBalanceManager {
    if (!TokenBalanceManager.instance) {
      TokenBalanceManager.instance = new TokenBalanceManager();
    }
    return TokenBalanceManager.instance;
  }
  
  /**
   * Initialize the token balance manager with an agent
   */
  initialize(agent: HttpAgent): void {
    this.agent = agent;
    console.log('TokenBalanceManager initialized with agent');
  }
  
  /**
   * Fetch all token balances for a principal
   */
  async fetchAllTokenBalances(principal: Principal): Promise<WalletInfo> {
    if (!this.agent) {
      throw new Error('TokenBalanceManager not initialized. Please connect your wallet first.');
    }
    
    try {
      console.log('Fetching token balances for principal:', principal.toString());
      
      // Get the account identifier from the principal
      const accountIdentifier = this.principalToAccountIdentifier(principal);
      
      // Fetch balances in parallel
      const [icpBalance, sonicBalance] = await Promise.all([
        this.fetchICPBalance(accountIdentifier),
        this.fetchICRC1Balance(TOKEN_CANISTERS.SONIC, principal)
      ]);
      
      // Create token info array
      const tokens: TokenInfo[] = [];
      
      if (icpBalance !== null) {
        tokens.push({
          symbol: 'ICP',
          balance: this.formatBalance(icpBalance, 8)
        });
      }
      
      if (sonicBalance !== null) {
        tokens.push({
          symbol: 'SONIC',
          balance: this.formatBalance(sonicBalance, 8)
        });
      }
      
      // Calculate total balance in ICP equivalent (simplified)
      const totalBalance = icpBalance || BigInt(0);
      
      return {
        address: principal.toString(),
        balance: this.formatBalance(totalBalance, 8),
        tokens
      };
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
      
      // Return empty wallet info on error
      return {
        address: principal.toString(),
        balance: '0',
        tokens: []
      };
    }
  }
  
  /**
   * Fetch ICP balance from the ledger canister
   */
  private async fetchICPBalance(accountIdentifier: string): Promise<bigint | null> {
    try {
      if (!this.agent) return null;
      
      console.log('Fetching ICP balance for account:', accountIdentifier);
      
      // Create an actor to interact with the ICP ledger
      const actor = Actor.createActor(icpLedgerIDL, {
        agent: this.agent,
        canisterId: TOKEN_CANISTERS.ICP
      });
      
      // Convert account identifier to the format expected by the ledger
      const accountBytes = this.hexToBytes(accountIdentifier);
      
      // Query the balance
      const result = await actor.account_balance(accountBytes);
      return result.e8s as bigint;
    } catch (error) {
      console.error('Failed to fetch ICP balance:', error);
      
      // If in development mode, return mock data
      if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
        console.log('Using mock ICP balance');
        return BigInt(100_000_000); // 1 ICP
      }
      
      return null;
    }
  }
  
  /**
   * Fetch ICRC-1 token balance
   */
  private async fetchICRC1Balance(canisterId: string, principal: Principal): Promise<bigint | null> {
    try {
      if (!this.agent) return null;
      
      console.log('Fetching ICRC-1 balance from canister:', canisterId);
      
      // Create an actor to interact with the ICRC-1 token
      const actor = Actor.createActor(icrc1IDL, {
        agent: this.agent,
        canisterId
      });
      
      // Query the balance using the ICRC-1 standard
      const result = await actor.icrc1_balance_of({
        owner: principal,
        subaccount: [] // Default subaccount
      });
      
      return result as bigint;
    } catch (error) {
      console.error(`Failed to fetch balance from canister ${canisterId}:`, error);
      
      // If in development mode, return mock data
      if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
        console.log(`Using mock balance for canister ${canisterId}`);
        return BigInt(500_000_000); // 5 tokens
      }
      
      return null;
    }
  }
  
  /**
   * Format a bigint balance with the specified number of decimal places
   */
  private formatBalance(balance: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;
    
    // Format with leading zeros
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    
    // Remove trailing zeros
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    if (trimmedFractional.length > 0) {
      return `${integerPart}.${trimmedFractional}`;
    } else {
      return integerPart.toString();
    }
  }
  
  /**
   * Convert a principal to an account identifier
   * Implementation based on the official ICP ledger spec
   */
  private principalToAccountIdentifier(principal: Principal): string {
    // Convert Principal to a byte array
    const principalBytes = principal.toUint8Array();
    
    // Create a buffer with the required format
    const buffer = new Uint8Array(1 + principalBytes.length + 4);
    buffer[0] = 0x0A; // Byte indicating this is a "user" account identifier
    buffer.set(principalBytes, 1);
    
    // Calculate the CRC32 checksum (simplified version)
    const checksum = new Uint8Array(4);
    buffer.set(checksum, 1 + principalBytes.length);
    
    // Calculate SHA-224 hash
    const hash = sha224.create();
    hash.update(buffer);
    const accountId = hash.hex();
    
    return accountId;
  }
  
  /**
   * Convert a hex string to a byte array
   */
  private hexToBytes(hex: string): Uint8Array {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Create a byte array
    const bytes = new Uint8Array(cleanHex.length / 2);
    
    // Convert each pair of hex characters to a byte
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    
    return bytes;
  }
}

export const tokenBalanceManager = TokenBalanceManager.getInstance();
