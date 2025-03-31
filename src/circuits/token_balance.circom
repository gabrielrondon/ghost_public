pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

template TokenBalance() {
    // Private inputs
    signal private input balance;
    signal private input salt;
    
    // Public inputs
    signal input minRequired;
    
    // Output
    signal output isValid;
    signal output hashedBalance;

    // Verify that balance >= minRequired
    component gte = GreaterEqThan(252);
    gte.in[0] <== balance;
    gte.in[1] <== minRequired;

    // Hash the balance with salt for privacy
    component hasher = Poseidon(2);
    hasher.inputs[0] <== balance;
    hasher.inputs[1] <== salt;

    // Set outputs
    isValid <== gte.out;
    hashedBalance <== hasher.out;
}

component main = TokenBalance();