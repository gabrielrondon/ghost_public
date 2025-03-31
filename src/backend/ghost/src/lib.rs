use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;
use std::collections::HashMap;
use std::cell::RefCell;

#[derive(CandidType, Deserialize, Clone)]
struct TokenInfo {
    symbol: String,
    balance: String,
}

#[derive(CandidType, Deserialize)]
struct WalletInfo {
    address: String,
    balance: String,
    tokens: Vec<TokenInfo>,
}

#[derive(CandidType, Deserialize)]
struct ZKProof {
    proof: Vec<u8>,
    public_inputs: Vec<String>,
    reference: String,
}

thread_local! {
    static WALLET_STORE: RefCell<HashMap<String, WalletInfo>> = RefCell::new(HashMap::new());
    static PROOF_STORE: RefCell<HashMap<String, ZKProof>> = RefCell::new(HashMap::new());
}

#[query]
fn get_wallet_info(address: String) -> WalletInfo {
    WALLET_STORE.with(|store| {
        store.borrow()
            .get(&address)
            .cloned()
            .unwrap_or_else(|| {
                // Return default tokens for testing purposes
                WalletInfo {
                    address: address.clone(),
                    balance: "1000".to_string(),
                    tokens: vec![
                        TokenInfo {
                            symbol: "ICP".to_string(),
                            balance: "100".to_string(),
                        },
                        TokenInfo {
                            symbol: "GHOST".to_string(),
                            balance: "500".to_string(),
                        },
                        TokenInfo {
                            symbol: "BTC".to_string(),
                            balance: "0.05".to_string(),
                        },
                        TokenInfo {
                            symbol: "ETH".to_string(),
                            balance: "2.5".to_string(),
                        },
                    ],
                }
            })
    })
}

#[update]
async fn generate_proof(token_id: String, amount: String) -> ZKProof {
    // This will be replaced with actual ZK proof generation using Noir
    let proof = vec![0u8; 32]; // Placeholder
    let reference = hex::encode(&proof);
    
    let zk_proof = ZKProof {
        proof,
        public_inputs: vec![token_id, amount],
        reference: reference.clone(),
    };

    PROOF_STORE.with(|store| {
        store.borrow_mut().insert(reference.clone(), zk_proof.clone());
    });

    zk_proof
}

#[query]
fn verify_proof(reference: String) -> bool {
    PROOF_STORE.with(|store| {
        store.borrow().contains_key(&reference)
    })
}

ic_cdk::export_candid!();