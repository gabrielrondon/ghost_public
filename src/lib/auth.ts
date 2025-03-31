import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { IC_CONFIG } from './ic-config';

interface AuthSubscriber {
  onStateChange: (isAuthenticated: boolean) => void;
}

export enum AuthMethod {
  INTERNET_IDENTITY = 'internet_identity',
  PLUG_WALLET = 'plug_wallet'
}

// Type definitions for Plug wallet
interface PlugAgent {
  getPrincipal: () => Principal;
  fetchRootKey: () => Promise<void>;
  [key: string]: unknown;
}

interface PlugTokenBalance {
  amount: number;
  canisterId: string | null;
  image: string;
  name: string;
  symbol: string;
  value: number | null;
}

interface PlugTransferParams {
  to: string;
  amount: number;
  opts?: {
    fee?: number;
    memo?: number;
    from_subaccount?: number;
    created_at_time?: {
      timestamp_nanos: number;
    };
  };
}

interface PlugWallet {
  agent: PlugAgent;
  principalId: string;
  createActor: <T>(canisterId: string, interfaceFactory: unknown) => T;
  requestConnect: (options?: {
    whitelist?: string[];
    host?: string;
  }) => Promise<boolean>;
  isConnected: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  createAgent: (options?: {
    whitelist?: string[];
    host?: string;
  }) => Promise<PlugAgent>;
  requestBalance: () => Promise<Array<PlugTokenBalance>>;
  requestTransfer: (params: PlugTransferParams) => Promise<{ height: number }>;
}

// Add TypeScript interface for Plug wallet
declare global {
  interface Window {
    ic?: {
      plug?: PlugWallet;
    };
  }
}

class AuthManager {
  private authClient: AuthClient | null = null;
  private subscribers: AuthSubscriber[] = [];
  private mockIdentity: boolean = false;
  private mockPrincipal: Principal | null = null;
  private mockAuthenticated: boolean = false;
  private loginInProgress: boolean = false;
  private currentAuthMethod: AuthMethod | null = null;
  private plugPrincipal: Principal | null = null;

  async initialize(): Promise<void> {
    // Check if we're in mock mode
    if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
      console.log('Using mock authentication');
      this.mockIdentity = true;
      this.mockPrincipal = Principal.fromText('2vxsx-fae');
      this.mockAuthenticated = false; // Start as not authenticated
      return;
    }

    console.log('Initializing authentication with Internet Computer configuration');
    
    try {
      // Initialize Internet Identity auth client
      this.authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true
        }
      });
      
      console.log('AuthClient initialized successfully');
      
      // Check if already authenticated with Internet Identity
      const isAuthenticated = await this.authClient.isAuthenticated();
      if (isAuthenticated) {
        console.log('User is already authenticated with Internet Identity');
        this.currentAuthMethod = AuthMethod.INTERNET_IDENTITY;
        this.notifySubscribers(true);
      }
      
      // Check if Plug wallet is available and connected
      await this.checkPlugWalletConnection();
      
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
    }
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkSession();
      }
    });

    // Handle online status
    window.addEventListener('online', () => {
      this.checkSession();
    });
  }

  private async checkPlugWalletConnection(): Promise<boolean> {
    // Check if Plug wallet is available
    if (window.ic?.plug) {
      try {
        // Check if already connected
        const connected = await window.ic.plug.isConnected();
        if (connected) {
          console.log('Plug wallet is already connected');
          this.plugPrincipal = Principal.fromText(window.ic.plug.principalId);
          this.currentAuthMethod = AuthMethod.PLUG_WALLET;
          this.notifySubscribers(true);
          return true;
        }
      } catch (error) {
        console.error('Error checking Plug wallet connection:', error);
      }
    }
    return false;
  }

  private async checkSession(): Promise<void> {
    if (this.mockIdentity) return;
    
    // Check Internet Identity session
    if (this.currentAuthMethod === AuthMethod.INTERNET_IDENTITY && this.authClient) {
      const isAuthenticated = await this.authClient.isAuthenticated();
      if (!isAuthenticated && this.currentAuthMethod === AuthMethod.INTERNET_IDENTITY) {
        this.currentAuthMethod = null;
        this.notifySubscribers(false);
      }
    }
    
    // Check Plug wallet connection
    if (this.currentAuthMethod === AuthMethod.PLUG_WALLET) {
      const connected = await this.checkPlugWalletConnection();
      if (!connected && this.currentAuthMethod === AuthMethod.PLUG_WALLET) {
        this.currentAuthMethod = null;
        this.plugPrincipal = null;
        this.notifySubscribers(false);
      }
    }
  }

  async login(method: AuthMethod = AuthMethod.INTERNET_IDENTITY): Promise<void> {
    if (this.loginInProgress) {
      console.log('Login already in progress');
      return;
    }
    
    this.loginInProgress = true;
    
    try {
      if (this.mockIdentity) {
        // Simulate a successful login in mock mode
        this.mockAuthenticated = true;
        setTimeout(() => {
          this.notifySubscribers(true);
          this.loginInProgress = false;
        }, 500);
        return;
      }

      if (method === AuthMethod.PLUG_WALLET) {
        return this.loginWithPlugWallet();
      } else {
        return this.loginWithInternetIdentity();
      }
    } catch (error) {
      this.loginInProgress = false;
      console.error('Login failed:', error);
      throw error;
    }
  }

  private async loginWithPlugWallet(): Promise<void> {
    if (!window.ic?.plug) {
      this.loginInProgress = false;
      throw new Error('Plug wallet not available. Please install the Plug extension first.');
    }

    try {
      console.log('Connecting to Plug wallet...');
      
      // Request connection to Plug wallet
      const connected = await window.ic.plug.requestConnect({
        whitelist: [IC_CONFIG.getZkCanisterId()], // Your ZK canister ID
        host: IC_CONFIG.getHost()
      });
      
      if (connected) {
        console.log('Successfully connected to Plug wallet');
        this.plugPrincipal = Principal.fromText(window.ic.plug.principalId);
        this.currentAuthMethod = AuthMethod.PLUG_WALLET;
        this.notifySubscribers(true);
      } else {
        console.log('User rejected Plug wallet connection');
        throw new Error('Plug wallet connection was rejected');
      }
    } catch (error) {
      console.error('Error connecting to Plug wallet:', error);
      throw error;
    } finally {
      this.loginInProgress = false;
    }
  }

  private async loginWithInternetIdentity(): Promise<void> {
    if (!this.authClient) {
      console.log('Creating new AuthClient...');
      this.authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true
        }
      });
    }

    // Direct approach using delegations
    return new Promise<void>((resolve, reject) => {
      const identityProviderUrl = IC_CONFIG.getInternetIdentityUrl();
      console.log('Using Internet Identity at:', identityProviderUrl);
      
      const handleAuthenticated = async (success: boolean) => {
        this.loginInProgress = false;
        
        if (success) {
          console.log('Authentication successful with Internet Identity');
          this.currentAuthMethod = AuthMethod.INTERNET_IDENTITY;
          this.notifySubscribers(true);
          resolve();
        } else {
          console.error('Authentication failed with Internet Identity');
          reject(new Error('Authentication failed'));
        }
      };
      
      // Use the login method which is more reliable
      this.authClient!.login({
        identityProvider: identityProviderUrl,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: () => handleAuthenticated(true),
        onError: (error) => {
          console.error('Authentication error:', error);
          handleAuthenticated(false);
          reject(error);
        }
      });
    });
  }

  async logout(): Promise<void> {
    if (this.mockIdentity) {
      // Simulate a successful logout in mock mode
      this.mockAuthenticated = false;
      setTimeout(() => {
        this.notifySubscribers(false);
      }, 500);
      return;
    }

    if (this.currentAuthMethod === AuthMethod.INTERNET_IDENTITY) {
      if (!this.authClient) throw new Error('Auth client not initialized');
      await this.authClient.logout();
    } else if (this.currentAuthMethod === AuthMethod.PLUG_WALLET) {
      if (window.ic?.plug) {
        try {
          await window.ic.plug.disconnect();
          this.plugPrincipal = null;
        } catch (error) {
          console.error('Error disconnecting from Plug wallet:', error);
        }
      }
    }
    
    this.currentAuthMethod = null;
    this.notifySubscribers(false);
  }

  async isAuthenticated(): Promise<boolean> {
    if (this.mockIdentity) {
      return this.mockAuthenticated; // Use mock authentication state
    }
    
    if (this.currentAuthMethod === AuthMethod.INTERNET_IDENTITY) {
      return this.authClient?.isAuthenticated() ?? false;
    } else if (this.currentAuthMethod === AuthMethod.PLUG_WALLET) {
      return window.ic?.plug?.isConnected() ?? false;
    }
    
    return false;
  }

  getPrincipal(): Principal | null {
    if (this.mockIdentity && this.mockAuthenticated) {
      return this.mockPrincipal;
    }
    if (this.mockIdentity && !this.mockAuthenticated) {
      return null;
    }
    
    if (this.currentAuthMethod === AuthMethod.INTERNET_IDENTITY) {
      return this.authClient?.getIdentity()?.getPrincipal() ?? null;
    } else if (this.currentAuthMethod === AuthMethod.PLUG_WALLET) {
      return this.plugPrincipal;
    }
    
    return null;
  }

  getIdentity(): Identity | null {
    if (this.mockIdentity && this.mockAuthenticated) {
      // Return a mock identity
      return {
        getPrincipal: () => this.mockPrincipal!,
        transformRequest: async (request: unknown) => request,
      } as unknown as Identity;
    }
    if (this.mockIdentity && !this.mockAuthenticated) {
      return null;
    }
    
    if (this.currentAuthMethod === AuthMethod.INTERNET_IDENTITY) {
      return this.authClient?.getIdentity() ?? null;
    } else if (this.currentAuthMethod === AuthMethod.PLUG_WALLET && this.plugPrincipal) {
      // Create a basic identity for Plug wallet
      return {
        getPrincipal: () => this.plugPrincipal!,
        transformRequest: async (request: unknown) => request,
      } as unknown as Identity;
    }
    
    return null;
  }

  getCurrentAuthMethod(): AuthMethod | null {
    return this.currentAuthMethod;
  }

  subscribe(subscriber: AuthSubscriber): void {
    this.subscribers.push(subscriber);
    // Immediately notify the subscriber of the current state
    if (this.mockIdentity) {
      subscriber.onStateChange(this.mockAuthenticated);
      return;
    }
    
    this.isAuthenticated().then(isAuthenticated => {
      subscriber.onStateChange(isAuthenticated);
    });
  }

  unsubscribe(subscriber: AuthSubscriber): void {
    const index = this.subscribers.indexOf(subscriber);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  private notifySubscribers(isAuthenticated: boolean): void {
    this.subscribers.forEach(subscriber => {
      subscriber.onStateChange(isAuthenticated);
    });
  }
}

export const authManager = new AuthManager();