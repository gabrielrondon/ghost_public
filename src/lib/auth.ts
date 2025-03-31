import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { IC_CONFIG } from './ic-config';

interface AuthSubscriber {
  onStateChange: (isAuthenticated: boolean) => void;
}

class AuthManager {
  private authClient: AuthClient | null = null;
  private subscribers: AuthSubscriber[] = [];
  private mockIdentity: boolean = false;
  private mockPrincipal: Principal | null = null;
  private mockAuthenticated: boolean = false;
  private loginInProgress: boolean = false;

  async initialize(): Promise<void> {
    // Check if we're in mock mode
    if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
      console.log('Using mock authentication');
      this.mockIdentity = true;
      this.mockPrincipal = Principal.fromText('2vxsx-fae');
      this.mockAuthenticated = false; // Start as not authenticated
      return;
    }

    console.log('Initializing AuthClient with Internet Computer configuration');
    
    try {
      this.authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true
        }
      });
      
      console.log('AuthClient initialized successfully');
      
      // Check if already authenticated
      const isAuthenticated = await this.authClient.isAuthenticated();
      if (isAuthenticated) {
        console.log('User is already authenticated');
        this.notifySubscribers(true);
      }
    } catch (error) {
      console.error('Failed to initialize AuthClient:', error);
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

  private async checkSession(): Promise<void> {
    if (this.mockIdentity) return;
    if (!this.authClient) return;

    const isAuthenticated = await this.authClient.isAuthenticated();
    this.notifySubscribers(isAuthenticated);
  }

  async login(): Promise<void> {
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
        
        // Create a dedicated login button that will be programmatically clicked
        const loginButton = document.createElement('button');
        loginButton.style.display = 'none';
        document.body.appendChild(loginButton);
        
        const handleAuthenticated = async (success: boolean) => {
          document.body.removeChild(loginButton);
          this.loginInProgress = false;
          
          if (success) {
            console.log('Authentication successful');
            this.notifySubscribers(true);
            resolve();
          } else {
            console.error('Authentication failed');
            reject(new Error('Authentication failed'));
          }
        };
        
        // Use the render method which is more reliable
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
    } catch (error) {
      this.loginInProgress = false;
      console.error('Login failed:', error);
      throw error;
    }
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

    if (!this.authClient) throw new Error('Auth client not initialized');

    await this.authClient.logout();
    this.notifySubscribers(false);
  }

  async isAuthenticated(): Promise<boolean> {
    if (this.mockIdentity) {
      return this.mockAuthenticated; // Use mock authentication state
    }
    return this.authClient?.isAuthenticated() ?? false;
  }

  getPrincipal(): Principal | null {
    if (this.mockIdentity && this.mockAuthenticated) {
      return this.mockPrincipal;
    }
    if (this.mockIdentity && !this.mockAuthenticated) {
      return null;
    }
    return this.authClient?.getIdentity()?.getPrincipal() ?? null;
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
    return this.authClient?.getIdentity() ?? null;
  }

  subscribe(subscriber: AuthSubscriber): void {
    this.subscribers.push(subscriber);
    // Immediately notify the subscriber of the current state
    if (this.mockIdentity) {
      subscriber.onStateChange(this.mockAuthenticated);
      return;
    }
    
    if (this.authClient) {
      this.authClient.isAuthenticated().then(isAuthenticated => {
        subscriber.onStateChange(isAuthenticated);
      });
    }
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