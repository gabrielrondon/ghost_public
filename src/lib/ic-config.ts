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
  };
  getHost: () => string;
  getInternetIdentityUrl: () => string;
  getCanisterId: (canisterName: keyof ICConfig['canisterIds']) => string;
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
    local: 'http://localhost:8000?canisterId=rwlgt-iiaaa-aaaaa-aaaaa-cai',
    ic: 'https://identity.ic0.app',
    development: '/identity' // Proxy path in development
  },
  // Canister IDs
  canisterIds: {
    // Your deployed canister ID
    ghost: 'hi7bu-myaaa-aaaad-aaloa-cai',
  },
  // Get the appropriate host based on the environment
  getHost: () => {
    // Always use the mainnet host for production deployments
    return IC_CONFIG.network.ic;
  },
  // Get the appropriate Internet Identity URL based on the environment
  getInternetIdentityUrl: () => {
    // Always use the mainnet Internet Identity for production deployments
    return IC_CONFIG.internetIdentity.ic;
  },
  // Get the appropriate canister ID based on the environment
  getCanisterId: (canisterName: keyof ICConfig['canisterIds']) => {
    return IC_CONFIG.canisterIds[canisterName];
  },
  // Get auth client options
  getAuthClientOptions: () => {
    return {
      // No special options needed for now
    };
  }
};
