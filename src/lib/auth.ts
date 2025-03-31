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
  private reconnectTimer: number | null = null;
  private readonly RECONNECT_INTERVAL = 5000;
  private mockIdentity: boolean = false;
  private mockPrincipal: Principal | null = null;
  private mockAuthenticated: boolean = false;

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

    // Initial session check
    if (await this.isAuthenticated()) {
      this.notifySubscribers(true);
    } else {
      this.startReconnectTimer();
    }
  }

  private async checkSession(): Promise<void> {
    if (this.mockIdentity) return;
    if (!this.authClient) return;

    const isAuthenticated = await this.authClient.isAuthenticated();
    this.notifySubscribers(isAuthenticated);

    if (!isAuthenticated) {
      this.startReconnectTimer();
    }
  }

  private startReconnectTimer(): void {
    if (this.mockIdentity) return;
    if (this.reconnectTimer !== null) {
      window.clearInterval(this.reconnectTimer);
    }

    this.reconnectTimer = window.setInterval(async () => {
      if (await this.isAuthenticated()) {
        this.notifySubscribers(true);
        if (this.reconnectTimer !== null) {
          window.clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      }
    }, this.RECONNECT_INTERVAL);
  }

  async login(): Promise<void> {
    if (this.mockIdentity) {
      // Simulate a successful login in mock mode
      this.mockAuthenticated = true;
      setTimeout(() => {
        this.notifySubscribers(true);
      }, 500);
      return;
    }

    if (!this.authClient) {
      console.log('Reinitializing AuthClient...');
      try {
        this.authClient = await AuthClient.create({
          idleOptions: {
            disableIdle: true,
            disableDefaultIdleCallback: true
          }
        });
      } catch (error) {
        console.error('Failed to initialize AuthClient:', error);
        throw new Error('Failed to initialize authentication client');
      }
    }

    // Get Internet Identity URL from our configuration
    const identityProviderUrl = IC_CONFIG.getInternetIdentityUrl();
    console.log('Logging in with Internet Identity at:', identityProviderUrl);

    return new Promise<void>((resolve, reject) => {
      try {
        // Open Internet Identity in a new window
        const authWindow = window.open(identityProviderUrl, '_blank', 'width=500,height=600');
        
        if (!authWindow) {
          console.error('Failed to open authentication window. Please check your popup blocker settings.');
          reject(new Error('Failed to open authentication window'));
          return;
        }
        
        // Check if the window was closed
        const checkWindowClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkWindowClosed);
            
            // Check if authentication was successful
            this.authClient!.isAuthenticated().then(isAuthenticated => {
              if (isAuthenticated) {
                console.log('Login successful');
                this.notifySubscribers(true);
                resolve();
              } else {
                console.error('Authentication failed or was cancelled');
                reject(new Error('Authentication failed or was cancelled'));
              }
            });
          }
        }, 500);
        
        // Fallback to standard login if direct window approach doesn't work
        setTimeout(() => {
          if (!authWindow.closed) {
            authWindow.close();
            
            this.authClient!.login({
              identityProvider: identityProviderUrl,
              maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
              onSuccess: () => {
                console.log('Login successful via standard flow');
                this.notifySubscribers(true);
                resolve();
              },
              onError: (error) => {
                console.error('Authentication error:', error);
                reject(error);
              }
            });
          }
        }, 3000);
      } catch (error) {
        console.error('Failed to initiate login:', error);
        reject(error);
      }
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