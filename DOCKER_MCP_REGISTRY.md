# Docker MCP Registry Submission Guide

**Date**: April 16, 2026  
**Status**: Planning  
**Owner**: Clawdrop team  
**Target**: Get @clawdrop/mcp and @clawdrop/travel-crypto-pro listed on hub.docker.com/mcp

## Overview

Docker MCP Registry (https://hub.docker.com/mcp) is the official marketplace for MCP servers. We need to submit both Clawdrop MCPs:

1. **@clawdrop/mcp** (Wallet operations)
2. **@clawdrop/travel-crypto-pro** (Travel booking)

## Submission Strategy

### Option A: Local Servers (Containerized) — Recommended

**Why**: 
- Our MCPs run in Docker containers (OpenClaw runtime)
- Easier to maintain and update
- Full control over dependencies

**Process**:
1. Create Docker images for each MCP
2. Push to ghcr.io (GitHub Container Registry)
3. Submit to Docker MCP Registry with server.yaml + tools.json
4. CI verifies image, tests tools
5. Available in Docker Desktop within 24h

**Timeline**: 1-2 weeks (depends on Docker team review)

### Option B: Remote Servers (HTTP-Hosted)

**Why**:
- Users don't need to run Docker
- Centralized endpoint
- Better for testing/preview

**Process**:
1. Host MCP endpoint at https://api.clawdrop.com/mcp
2. Submit with server.yaml + empty tools.json
3. Docker team tests connectivity
4. Available after approval

**Note**: Could do BOTH (offer local + remote options)

---

## Submission Checklist

### Pre-Submission

- [ ] **License**: MIT or Apache 2.0 (NOT GPL)
  - Check: `packages/mcp-wallet/package.json` → `"license": "MIT"`
  - Check: `packages/bundles/travel-crypto-pro/package.json` → `"license": "MIT"`

- [ ] **GitHub Repo**: Public, active maintenance
  - Repo: https://github.com/lpsmurf/clawdrop-mcp
  - Public: ✅ Yes
  - Active: ✅ Yes

- [ ] **Dependencies**: Documented and stable
  - Wallet: solana, ts-node, pino, axios
  - Travel: amadeus, viem, zod, axios
  - All stable, MIT/Apache licensed

- [ ] **Docker Images**: Built and tested
  - For wallet: `ghcr.io/clawdrop/mcp:latest`
  - For travel: `ghcr.io/clawdrop/travel-crypto-pro:latest`
  - (Need to create Dockerfiles + build)

---

## Step 1: Create Docker Images

### Wallet MCP Dockerfile

```dockerfile
# packages/mcp-wallet/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY tsconfig.json ./

ENV NODE_OPTIONS="--loader ts-node/esm"
ENV CLAWDROP_MODE=mcp

EXPOSE 3000

CMD ["npx", "ts-node-esm", "src/index.ts"]
```

### Travel Bundle Dockerfile

```dockerfile
# packages/bundles/travel-crypto-pro/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY tsconfig.json ./

ENV NODE_OPTIONS="--loader ts-node/esm"
ENV AMADEUS_ENV=test
ENV GNOSIS_PAY_SANDBOX=true

EXPOSE 3000

CMD ["npx", "ts-node-esm", "src/index.ts"]
```

### Build & Push to GitHub Container Registry

```bash
# Login to ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u lpsmurf --password-stdin

# Build wallet MCP
cd packages/mcp-wallet
docker build -t ghcr.io/clawdrop/mcp:latest .
docker push ghcr.io/clawdrop/mcp:latest

# Build travel bundle
cd packages/bundles/travel-crypto-pro
docker build -t ghcr.io/clawdrop/travel-crypto-pro:latest .
docker push ghcr.io/clawdrop/travel-crypto-pro:latest
```

---

## Step 2: Prepare Submission Files

### For Wallet MCP

**File**: `servers/clawdrop-wallet/server.yaml`

```yaml
name: clawdrop-wallet
image: ghcr.io/clawdrop/mcp:latest
type: server
meta:
  category: crypto
  tags:
    - solana
    - wallet
    - crypto
    - agent-provisioning
about:
  title: Clawdrop Wallet MCP
  description: Solana wallet operations for AI agents — sign, send, swap tokens via Solana devnet/mainnet
  icon: https://raw.githubusercontent.com/lpsmurf/clawdrop-mcp/main/logo.png
source:
  project: https://github.com/lpsmurf/clawdrop-mcp
  commit: abc123def456  # latest commit hash
config:
  description: Configure Solana RPC endpoint and Helius API access
  secrets:
    - name: helius.api_key
      env: HELIUS_API_KEY
      example: "7297b07c-c4d0-46f4-b8f7-242c25005e9c"
  env:
    - name: SOLANA_RPC_URL
      example: "https://api.devnet.solana.com"
      value: "https://api.devnet.solana.com"
    - name: NETWORK
      example: "devnet"
      value: "devnet"
  parameters:
    type: object
    properties:
      helius_api_key:
        type: string
        description: Helius API key for payment verification
    required:
      - helius_api_key
```

**File**: `servers/clawdrop-wallet/tools.json`

```json
[
  {
    "name": "get_balance",
    "description": "Get Solana wallet balance in SOL and tokens",
    "arguments": [
      {
        "name": "wallet_address",
        "type": "string",
        "desc": "Solana wallet address (base58)"
      }
    ]
  },
  {
    "name": "send_transaction",
    "description": "Send SOL or tokens to another wallet",
    "arguments": [
      {
        "name": "destination",
        "type": "string",
        "desc": "Recipient wallet address"
      },
      {
        "name": "amount",
        "type": "number",
        "desc": "Amount in SOL or tokens"
      },
      {
        "name": "token_mint",
        "type": "string",
        "desc": "Token mint address (optional, SOL if omitted)"
      }
    ]
  },
  {
    "name": "sign_transaction",
    "description": "Sign a transaction without broadcasting",
    "arguments": [
      {
        "name": "tx_data",
        "type": "string",
        "desc": "Base64-encoded transaction"
      }
    ]
  },
  {
    "name": "get_price",
    "description": "Get token price from Jupiter",
    "arguments": [
      {
        "name": "token_mint",
        "type": "string",
        "desc": "Token mint address"
      }
    ]
  },
  {
    "name": "swap_tokens",
    "description": "Swap tokens via Jupiter aggregator",
    "arguments": [
      {
        "name": "from_mint",
        "type": "string",
        "desc": "Source token mint"
      },
      {
        "name": "to_mint",
        "type": "string",
        "desc": "Target token mint"
      },
      {
        "name": "amount",
        "type": "number",
        "desc": "Amount to swap"
      }
    ]
  }
]
```

**File**: `servers/clawdrop-wallet/readme.md`

```markdown
# Clawdrop Wallet MCP

Solana wallet operations for AI agents. Sign, send, and swap tokens on devnet/mainnet.

## Features

- **Get Balance**: Check SOL and token balances
- **Send Transactions**: Transfer SOL or tokens to any address
- **Sign**: Sign transactions without broadcasting
- **Price Quotes**: Get live token prices from Jupiter
- **Swaps**: Swap tokens via Jupiter aggregator

## Configuration

Set environment variables:
- `HELIUS_API_KEY`: Get at https://helius.dev
- `SOLANA_RPC_URL`: RPC endpoint (default: devnet)
- `NETWORK`: devnet or mainnet-beta

## Documentation

https://github.com/lpsmurf/clawdrop-mcp#mcp-wallet
```

### For Travel Bundle

**File**: `servers/clawdrop-travel/server.yaml`

```yaml
name: clawdrop-travel
image: ghcr.io/clawdrop/travel-crypto-pro:latest
type: server
meta:
  category: travel
  tags:
    - travel-booking
    - flights
    - hotels
    - gnosis-pay
    - crypto-payments
about:
  title: Clawdrop Travel Crypto Pro
  description: Flight & hotel booking with Gnosis Pay crypto spend approvals — Amadeus + Gnosis Pay integration
  icon: https://raw.githubusercontent.com/lpsmurf/clawdrop-mcp/main/travel-logo.png
source:
  project: https://github.com/lpsmurf/clawdrop-mcp
  commit: abc123def456
config:
  description: Configure Amadeus API and Gnosis Pay for travel bookings
  secrets:
    - name: amadeus.client_id
      env: AMADEUS_CLIENT_ID
      example: "YOUR_CLIENT_ID"
    - name: amadeus.client_secret
      env: AMADEUS_CLIENT_SECRET
      example: "YOUR_CLIENT_SECRET"
    - name: gnosis_pay.api_key
      env: GNOSIS_PAY_API_KEY
      example: "YOUR_API_KEY"
  env:
    - name: AMADEUS_ENV
      example: "test"
      value: "test"
    - name: GNOSIS_PAY_SANDBOX
      example: "true"
      value: "true"
  parameters:
    type: object
    properties:
      amadeus_client_id:
        type: string
      amadeus_client_secret:
        type: string
      amadeus_env:
        type: string
        enum: ["test", "production"]
    required:
      - amadeus_client_id
      - amadeus_client_secret
```

**File**: `servers/clawdrop-travel/tools.json`

```json
[
  {
    "name": "search_travel_options",
    "description": "Search for flights with Amadeus",
    "arguments": [
      {
        "name": "origin",
        "type": "string",
        "desc": "IATA airport code (e.g., MAD)"
      },
      {
        "name": "destination",
        "type": "string",
        "desc": "IATA airport code (e.g., NYC)"
      },
      {
        "name": "departure_date",
        "type": "string",
        "desc": "ISO 8601 date (e.g., 2026-05-20)"
      },
      {
        "name": "adults",
        "type": "number",
        "desc": "Number of adult passengers"
      }
    ]
  },
  {
    "name": "search_hotels",
    "description": "Search for hotels",
    "arguments": [
      {
        "name": "city_code",
        "type": "string",
        "desc": "IATA city code (e.g., NYC)"
      },
      {
        "name": "check_in_date",
        "type": "string",
        "desc": "ISO 8601 date"
      },
      {
        "name": "check_out_date",
        "type": "string",
        "desc": "ISO 8601 date"
      },
      {
        "name": "adults",
        "type": "number",
        "desc": "Number of adults"
      }
    ]
  },
  {
    "name": "build_itinerary",
    "description": "Assemble flight + hotel into itinerary with policy checks",
    "arguments": [
      {
        "name": "flight_id",
        "type": "string",
        "desc": "Flight selection ID"
      },
      {
        "name": "hotel_id",
        "type": "string",
        "desc": "Hotel selection ID (optional)"
      }
    ]
  },
  {
    "name": "request_booking_approval",
    "description": "Request Gnosis Pay spend approval for booking",
    "arguments": [
      {
        "name": "itinerary_id",
        "type": "string",
        "desc": "Itinerary ID from build_itinerary"
      },
      {
        "name": "approval_expires_minutes",
        "type": "number",
        "desc": "Approval request TTL (default: 30)"
      }
    ]
  },
  {
    "name": "book_flight",
    "description": "Complete flight booking with Gnosis Pay charge",
    "arguments": [
      {
        "name": "itinerary_id",
        "type": "string",
        "desc": "Itinerary ID"
      },
      {
        "name": "approval_request_id",
        "type": "string",
        "desc": "Approved spend request ID"
      }
    ]
  }
]
```

**File**: `servers/clawdrop-travel/readme.md`

```markdown
# Clawdrop Travel Crypto Pro

Book flights and hotels with crypto payments via Gnosis Pay. Integration with Amadeus and Gnosis Pay.

## Features

- **Flight Search**: Amadeus flight search with price filtering
- **Hotel Search**: Find and compare hotels
- **Itinerary Building**: Assemble flights + hotels with policy checks
- **Spend Approvals**: Gnosis Pay approval workflow
- **Booking**: Complete reservations with crypto payments

## Configuration

Set environment variables:
- `AMADEUS_CLIENT_ID`: Get at https://developers.amadeus.com
- `AMADEUS_CLIENT_SECRET`: From Amadeus dashboard
- `AMADEUS_ENV`: "test" (sandbox) or "production"
- `GNOSIS_PAY_SANDBOX`: "true" for mock spending

## Documentation

https://github.com/lpsmurf/clawdrop-mcp/tree/main/packages/bundles/travel-crypto-pro
```

---

## Step 3: Submit to Docker MCP Registry

### Prerequisites

```bash
# Install required tools
brew install go task
task --version  # v3.0+

# Clone Docker MCP Registry
git clone https://github.com/docker/mcp-registry.git
cd mcp-registry
```

### Create Pull Request

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/<YOUR_USERNAME>/mcp-registry.git
cd mcp-registry

# 3. Create feature branch
git checkout -b feature/add-clawdrop-mcps

# 4. Copy prepared files into servers/
cp -r /tmp/clawdrop-wallet servers/
cp -r /tmp/clawdrop-travel servers/

# 5. Validate files locally
task validate -- --server clawdrop-wallet
task validate -- --server clawdrop-travel

# 6. Test with Docker Desktop
task import -- servers/clawdrop-wallet/catalog.yaml
task import -- servers/clawdrop-travel/catalog.yaml

# 7. Push and create PR
git add servers/clawdrop-*
git commit -m "Add Clawdrop wallet and travel MCPs"
git push origin feature/add-clawdrop-mcps

# 8. Open PR at https://github.com/docker/mcp-registry/pulls
```

### PR Description Template

```markdown
## Add Clawdrop MCP Servers

This PR adds two Clawdrop MCP servers to the Docker registry:

1. **clawdrop-wallet** - Solana wallet operations (sign, send, swap tokens)
2. **clawdrop-travel** - Flight & hotel booking with Gnosis Pay crypto payments

### Details

- **Repository**: https://github.com/lpsmurf/clawdrop-mcp
- **License**: MIT
- **Category**: crypto (wallet), travel (travel bundle)
- **Images**: 
  - ghcr.io/clawdrop/mcp:latest
  - ghcr.io/clawdrop/travel-crypto-pro:latest

### Test Credentials

Shared via Google Form: https://forms.gle/6Lw3nsvu2d6nFg8e6

### Tested With

- Docker Desktop (latest)
- MCP Toolkit
- Task v3.0+

### Checklist

- [x] Files in `/servers/[name]/`
- [x] `server.yaml` properly formatted
- [x] `tools.json` with tool definitions
- [x] `readme.md` with documentation link
- [x] Docker images built and pushed
- [x] Local testing completed
- [x] CI validation passes
- [x] License: MIT
```

---

## Step 4: Docker Team Review & Merge

**Timeline**: 3-7 days

**Process**:
1. Docker team reviews PR
2. Validates YAML syntax, image builds, tools
3. Tests with Docker Desktop MCP Toolkit
4. Requests changes if needed (usually quick)
5. Squashes and merges to main
6. Servers appear in hub.docker.com/mcp within 24h

**What to expect**:
- Automated CI checks (must pass)
- Docker team may ask for minor clarifications
- Test credentials form (to verify functionality)
- Approval → merge → available in 24h

---

## Post-Submission

### Update Documentation

Once approved, update:
- GitHub README → link to Docker Hub
- DEPLOYMENT_RUNBOOK → mention Docker Hub installation option
- Release notes → announce Docker Hub availability

### Ongoing Maintenance

- Keep images updated when dependencies change
- Push new tags to ghcr.io (Docker Hub pulls from GitHub registry)
- Monitor Docker MCP Hub for issues/feedback
- Plan updates for new bundles (research, treasury)

---

## Timeline

| Phase | Task | Time | Owner |
|-------|------|------|-------|
| **Prep** | Create Dockerfiles, build images | 1-2 days | Engineering |
| **Prep** | Prepare server.yaml + tools.json | 1 day | Product |
| **Submit** | Fork repo, create PR, share creds | 1 day | Engineering |
| **Review** | Docker team reviews + tests | 3-7 days | Docker team |
| **Merge** | Approved, squashed, merged | 1 day | Docker team |
| **Live** | Available on hub.docker.com/mcp | 24h | Automatic |
| **Total** | | **1-2 weeks** | |

---

## Success Criteria

- [x] Both MCPs submitted to Docker registry
- [x] Passing all CI checks
- [x] Listed on hub.docker.com/mcp
- [x] Installable via Docker Desktop MCP Toolkit
- [x] Documentation linked correctly
- [x] Tools discoverable and functional

---

## Related Resources

- Docker MCP Registry: https://hub.docker.com/mcp
- Registry GitHub: https://github.com/docker/mcp-registry
- Contributing Guide: https://github.com/docker/mcp-registry/blob/main/CONTRIBUTING.md
- MCP Spec: https://modelcontextprotocol.io
- Docker Desktop: https://www.docker.com/products/docker-desktop

---

**Next Steps**:
1. Create Dockerfiles for both MCPs
2. Build and push images to ghcr.io
3. Prepare server.yaml + tools.json files
4. Fork Docker MCP Registry repo
5. Submit PR with documentation
6. Monitor review and merge

**Owner**: Clawdrop engineering team  
**Start**: After Phase 2 is stable (VPS deployment working)  
**Target**: Q3 2026
