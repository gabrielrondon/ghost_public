import { zKey } from 'snarkjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CIRCUIT_DIR = path.join(__dirname, '../public/circuits/token_balance_js');

async function main() {
  try {
    console.log("Setting up ZK circuits...");
    
    // Ensure the circuits directory exists
    if (!fs.existsSync(CIRCUIT_DIR)) {
      fs.mkdirSync(CIRCUIT_DIR, { recursive: true });
    }

    const r1csPath = path.join(CIRCUIT_DIR, "token_balance.r1cs");
    const zkeyPath = path.join(CIRCUIT_DIR, "token_balance.zkey");
    const vkeyPath = path.join(CIRCUIT_DIR, "verification_key.json");

    // Check if r1cs file exists
    if (!fs.existsSync(r1csPath)) {
      throw new Error("token_balance.r1cs not found. Please run compile-circuit first.");
    }

    // Generate the circuit
    console.log("Generating zkey...");
    await zKey.newZKey(
      r1csPath,
      "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau",
      zkeyPath
    );

    // Export verification key
    console.log("Exporting verification key...");
    const vKey = await zKey.exportVerificationKey(zkeyPath);
    
    fs.writeFileSync(
      vkeyPath,
      JSON.stringify(vKey, null, 2)
    );

    console.log("Circuit setup complete!");
  } catch (error) {
    console.error("Error setting up circuits:", error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));