import { Actor } from '@dfinity/agent';
import { _SERVICE } from './ghost.did.d';

export declare const idlFactory: ({ IDL }: { IDL: any }) => any;
export declare const createActor: (canisterId: string, options?: {
  agentOptions?: Record<string, any>;
  actorOptions?: Record<string, any>;
  agent?: any;
  host?: string;
}) => Actor;
export declare const ghost: Actor & _SERVICE;
