import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { TokenInfo, WalletInfo } from '../types';

// Token canister IDs
const TOKEN_CANISTERS = {
  ICP: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  ORIGYN: 'ogy7f-maaaa-aaaak-qaaca-cai',
  SONIC: 'qbizb-wiaaa-aaaak-aafbq-cai'
};

// Interface for token canister responses
interface ICPAccountBalanceResponse {
  e8s: bigint;
}

interface ICRC1BalanceResponse {
  value: bigint;
}

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
      const [icpBalance, origynBalance, sonicBalance] = await Promise.all([
        this.fetchICPBalance(accountIdentifier),
        this.fetchICRC1Balance(TOKEN_CANISTERS.ORIGYN, principal),
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
      
      if (origynBalance !== null) {
        tokens.push({
          symbol: 'ORIGYN',
          balance: this.formatBalance(origynBalance, 8)
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
      
      // This is a simplified implementation
      // In a real application, you would use the proper ledger canister interface
      console.log('Fetching ICP balance for account:', accountIdentifier);
      
      // Simulate a successful response for now
      // In production, this would call the actual ICP ledger canister
      return BigInt(100_000_000); // 1 ICP
    } catch (error) {
      console.error('Failed to fetch ICP balance:', error);
      return null;
    }
  }
  
  /**
   * Fetch ICRC-1 token balance
   */
  private async fetchICRC1Balance(canisterId: string, principal: Principal): Promise<bigint | null> {
    try {
      if (!this.agent) return null;
      
      // This is a simplified implementation
      // In a real application, you would use the proper ICRC-1 canister interface
      console.log('Fetching ICRC-1 balance from canister:', canisterId);
      
      // Simulate a successful response for now
      // In production, this would call the actual token canister
      return BigInt(500_000_000); // 5 tokens
    } catch (error) {
      console.error(`Failed to fetch balance from canister ${canisterId}:`, error);
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
   * This is a simplified implementation
   */
  private principalToAccountIdentifier(principal: Principal): string {
    // In a real implementation, this would use the proper algorithm
    // to derive an account identifier from a principal
    return principal.toString();
  }
}

export const tokenBalanceManager = TokenBalanceManager.getInstance();
