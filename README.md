# ZK Proof System

A zero-knowledge proof system for token balance verification on the Internet Computer.

## Features

- Connect to Internet Identity
- Generate ZK proofs for token balances
- Verify proofs
- Share proofs with others
- View proof history

## Technology Stack

- Frontend: React + TypeScript
- ZK: Internet Computer canister-based implementation
- Deployment: Netlify

## Deployed Canister

This application interacts with a deployed canister on the Internet Computer:
- Canister ID: `hi7bu-myaaa-aaaad-aaloa-cai`

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server
npm run dev
```

Note: Some features like Internet Identity authentication may not work properly in local development mode due to CORS and security restrictions.

### Building for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### Deploying to Netlify

1. Push this repository to GitHub
2. Connect your GitHub repository to Netlify
3. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

The included `netlify.toml` file contains all necessary configuration for deployment.

## Environment Variables

The application uses the following environment variables:

- `VITE_MOCK_BACKEND`: Set to "true" to use mock data instead of real canister
- `VITE_IC_HOST`: Internet Computer host (default: "https://ic0.app")
- `VITE_II_URL`: Internet Identity URL (default: "https://identity.ic0.app")
- `VITE_GHOST_CANISTER_ID`: Canister ID for the ZK proof system (default: "hi7bu-myaaa-aaaad-aaloa-cai")

## License

MIT
