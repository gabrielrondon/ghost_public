// Internet Computer configuration types
interface ICConfig {
  network: {
    local: string;
    ic: string;
    development: string;
  };
  internetIdentity: {
    local: string;
    ic: string;
    development: string;
  };
  canisterIds: {
    ghost: string;
    zk: string;  
  };
  getHost: () => string;
  getInternetIdentityUrl: () => string;
  getCanisterId: (canisterName: keyof ICConfig['canisterIds']) => string;
  getZkCanisterId: () => string;  
  getAuthClientOptions: () => Record<string, unknown>;
}

// Internet Computer configuration
export const IC_CONFIG: ICConfig = {
  // Network configuration
  network: {
    local: 'http://localhost:8000',
    ic: 'https://ic0.app',
    development: '/api' // Proxy path in development
  },
  // Internet Identity configuration
  internetIdentity: {
    local: 'http://localhost:8000?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai',
    ic: 'https://identity.ic0.app',
    development: 'https://identity.ic0.app'
  },
  // Canister IDs
  canisterIds: {
    ghost: import.meta.env.VITE_GHOST_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai',
    zk: 'hi7bu-myaaa-aaaad-aaloa-cai'  
  },
  // Get the appropriate host based on the environment
  getHost() {
    return import.meta.env.VITE_IC_HOST || this.network.ic;
  },
  // Get the appropriate Internet Identity URL based on the environment
  getInternetIdentityUrl() {
    return import.meta.env.VITE_II_URL || this.internetIdentity.ic;
  },
  // Get the appropriate canister ID based on the environment
  getCanisterId(canisterName: keyof ICConfig['canisterIds']) {
    return this.canisterIds[canisterName];
  },
  // Get the ZK canister ID
  getZkCanisterId() {
    return this.canisterIds.zk;
  },
  // Get auth client options
  getAuthClientOptions() {
    return {
      idleOptions: {
        disableIdle: true,
        disableDefaultIdleCallback: true
      }
    };
  }
};
