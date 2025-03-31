import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from './ghost.did';

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ 
    host: options.host || "https://ic0.app",
    ...options.agentOptions 
  });

  if (options.agent && options.agentOptions) {
    console.warn(
      "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and using the provided agent."
    );
  }

  // Fetch root key for certificate validation during development
  if (process.env.NODE_ENV !== "production") {
    agent.fetchRootKey().catch(err => {
      console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
      console.error(err);
    });
  }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

// Create a default actor using the canister ID from environment variables
export const ghost = createActor(process.env.VITE_GHOST_CANISTER_ID || "hi7bu-myaaa-aaaad-aaloa-cai");
