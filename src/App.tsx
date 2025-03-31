import { FC, useState, useEffect, useCallback } from 'react';
import { Wallet, Wallet as WalletConnect } from 'lucide-react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { authManager } from './lib/auth';
import { proofManager } from './lib/proofManager';
import { storageManager } from './lib/storageManager';
import { tokenBalanceManager } from './lib/tokenBalances';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProofHistoryList } from './components/ProofHistoryList';
import { WalletInfo, AuthState, ProofHistoryItem } from './types';
// Import from the correct path
import { idlFactory } from './declarations/ghost/ghost.did';
import type { _SERVICE } from './declarations/ghost/ghost.did.d';

const App: FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    isAuthenticated: false,
    principal: null,
    error: null,
  });
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [actor, setActor] = useState<Actor | null>(null);
  const [proofStatus, setProofStatus] = useState<string>('');
  const [proofHistory, setProofHistory] = useState<ProofHistoryItem[]>([]);
  const [agent, setAgent] = useState<HttpAgent | null>(null);

  const verifySharedProof = useCallback(async (reference: string) => {
    try {
      setProofStatus('Verifying shared proof...');
      const storedProof = await storageManager.getProof(reference);
      
      if (!storedProof) {
        setProofStatus('Proof not found');
        return;
      }

      const isValid = await proofManager.verifyProof(reference);
      
      if (isValid) {
        await storageManager.updateProofStatus(reference, 'verified');
        setProofStatus('Shared proof verified successfully!');
      } else {
        await storageManager.updateProofStatus(reference, 'failed');
        setProofStatus('Invalid proof');
      }
      
      await loadProofHistory();
    } catch (err) {
      console.error('Failed to verify shared proof:', err);
      setProofStatus('Failed to verify shared proof');
    }
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      await authManager.initialize();
      await storageManager.initialize();
      await loadProofHistory();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize app',
      }));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await initializeApp();
      const params = new URLSearchParams(window.location.search);
      const proofRef = params.get('proof');
      if (proofRef) {
        await verifySharedProof(proofRef);
      }
    };
    init();
  }, [initializeApp, verifySharedProof]);

  const initializeActor = useCallback(async () => {
    try {
      if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
        console.log('Using mock backend - no actor initialization needed');
        return;
      }

      // Use our IC configuration to get the host and canister ID
      const { IC_CONFIG } = await import('./lib/ic-config');
      const canisterHost = IC_CONFIG.getHost();
      const canisterId = IC_CONFIG.getCanisterId('ghost');
      
      console.log('Initializing actor with:');
      console.log('- Host:', canisterHost);
      console.log('- Canister ID:', canisterId);

      const newAgent = new HttpAgent({
        host: canisterHost,
        identity: authManager.getIdentity() || undefined,
      });

      if (import.meta.env.MODE !== 'production') {
        await newAgent.fetchRootKey().catch(e => {
          console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
          console.error(e);
        });
      }

      if (!canisterId) {
        throw new Error('Canister ID not found in configuration');
      }

      const newActor = Actor.createActor<_SERVICE>(idlFactory, {
        agent: newAgent,
        canisterId,
      });

      console.log('Actor initialized successfully');
      setActor(newActor);
      setAgent(newAgent);
      
      // Set the actor in the proofManager
      proofManager.setActor(newActor);
      
      // Initialize the token balance manager with the agent
      tokenBalanceManager.initialize(newAgent);
    } catch (error) {
      console.error('Failed to initialize actor:', error);
      throw error;
    }
  }, []);

  const fetchWalletInfo = useCallback(async () => {
    try {
      let info: WalletInfo;
      
      if (import.meta.env.VITE_MOCK_BACKEND === 'true') {
        info = {
          address: '0x123...abc',
          balance: '1000',
          tokens: [
            { symbol: 'TEST', balance: '500' },
            { symbol: 'GHOST', balance: '250' }
          ]
        };
      } else {
        const principal = authManager.getPrincipal();
        if (!principal) throw new Error('No principal found');
        
        console.log('Fetching wallet info for principal:', principal.toString());
        
        // Use the tokenBalanceManager to fetch balances directly from token canisters
        info = await tokenBalanceManager.fetchAllTokenBalances(principal);
        
        console.log('Wallet info received:', info);
      }
      
      setWalletInfo(info);
    } catch (error) {
      console.error('Failed to fetch wallet info:', error);
      setProofStatus('Failed to fetch wallet info: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, []);

  useEffect(() => {
    // Subscribe to auth state changes
    const subscription = {
      onStateChange: async (isAuthenticated: boolean) => {
        if (isAuthenticated) {
          const principal = authManager.getPrincipal();
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            principal,
            error: null,
          });
          await initializeActor();
          await fetchWalletInfo();
          await loadProofHistory();
        } else {
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            principal: null,
            error: null,
          });
          setWalletInfo(null);
          setActor(null);
          setAgent(null);
          proofManager.setActor(null);
          setProofHistory([]);
        }
      }
    };

    authManager.subscribe(subscription);
    return () => authManager.unsubscribe(subscription);
  }, [fetchWalletInfo, initializeActor]);

  const loadProofHistory = async () => {
    try {
      const history = await storageManager.getAllProofs();
      setProofHistory(history);
    } catch (error) {
      console.error('Failed to load proof history:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      await authManager.login();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  };

  const disconnectWallet = async () => {
    try {
      await authManager.logout();
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        principal: null,
        error: null,
      });
      setWalletInfo(null);
      setActor(null);
      setAgent(null);
      proofManager.setActor(null);
      setProofHistory([]);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
      }));
    }
  };

  const generateProof = async (tokenId: string, amount: string) => {
    try {
      setProofStatus('Generating proof...');
      
      const result = await proofManager.generateProof(
        tokenId, 
        BigInt(amount)
      );
      
      if (!result.success) {
        setProofStatus(`Failed to generate proof: ${result.error}`);
        return;
      }
      
      // Save the proof to storage
      await storageManager.saveProof({
        token: tokenId,
        timestamp: Date.now(),
        status: 'verified',
        reference: result.proof!.reference,
      });
      
      await loadProofHistory();
      setProofStatus('Proof generated successfully!');
    } catch (error) {
      console.error('Failed to generate proof:', error);
      setProofStatus('Failed to generate proof: ' + 
        (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Wallet className="h-6 w-6" />
            <span className="text-xl font-bold">ZK Proof System</span>
          </div>
          {!authState.isAuthenticated ? (
            <button
              onClick={connectWallet}
              disabled={authState.isLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authState.isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <WalletConnect className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-mono">
                  {authState.principal?.toString().slice(0, 10)}...
                </span>
              </div>
              <button
                onClick={disconnectWallet}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
              >
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      </nav>
      
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {authState.error && (
          <div className="bg-red-900/50 text-red-300 p-4 rounded-lg mb-6">
            {authState.error}
          </div>
        )}
        
        {authState.isAuthenticated && walletInfo ? (
          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Generate Proof</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Select Token</label>
                  <select
                    id="token-select"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    defaultValue=""
                    onChange={(e) => {
                      const token = walletInfo.tokens.find(t => t.symbol === e.target.value);
                      if (token) {
                        const amountInput = document.getElementById('amount-input') as HTMLInputElement;
                        if (amountInput) {
                          amountInput.value = token.balance;
                        }
                      }
                    }}
                  >
                    <option value="" disabled>Select a token</option>
                    {walletInfo.tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol} ({token.balance})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Amount</label>
                  <input
                    id="amount-input"
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
                    placeholder="Enter amount"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const tokenSelect = document.getElementById('token-select') as HTMLSelectElement;
                    const amountInput = document.getElementById('amount-input') as HTMLInputElement;
                    
                    if (tokenSelect.value && amountInput.value) {
                      generateProof(tokenSelect.value, amountInput.value);
                    } else {
                      setProofStatus('Please select a token and enter an amount');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors w-full"
                >
                  Generate Proof
                </button>
                
                {proofStatus && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                    {proofStatus}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Proof History</h2>
              <ProofHistoryList proofs={proofHistory} />
            </div>
          </div>
        ) : authState.isAuthenticated ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to generate zero-knowledge proofs of your token balances.
            </p>
            <button
              onClick={connectWallet}
              disabled={authState.isLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authState.isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <WalletConnect className="h-5 w-5" />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;