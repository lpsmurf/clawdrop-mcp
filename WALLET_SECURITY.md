# Clawdrop Wallet Security Model

## Threat Model

| Threat | Impact | Mitigated by |
|--------|--------|-------------|
| Private key leaks via logs | Total wallet loss | Logger redacts all `*key*`, `*secret*`, `*password*` fields |
| Key in env var stolen from disk | Total wallet loss | OS Keychain (keytar) — key never on filesystem |
| Supply chain attack reads env vars | Partial exposure | Keychain: env var not set if keychain is used |
| MCP server process dump | Key in memory | Key only loaded for duration of signing op, then cleared |
| Unauthorized agent management | Data leak + cancellation | `owner_wallet` ownership check on every protected tool |
| Fake payment tx accepted | Free services | `NODE_ENV=production` disables test tx bypass |

---

## Layer 1: `@clawdrop/mcp` (User Wallets — Lightweight Package)

### Recommended: OS Keychain (macOS / Windows / Linux)

```bash
# One-time setup — key goes into OS keychain, never a file
npx @clawdrop/mcp setup
```

The key is stored in:
- **macOS**: Keychain Access (encrypted, locked to your login)
- **Windows**: Windows Credential Manager
- **Linux**: libsecret / GNOME Keyring

After setup, your Claude Desktop config needs NO private key:
```json
{
  "mcpServers": {
    "clawdrop-wallet": {
      "command": "npx",
      "args": ["-y", "@clawdrop/mcp@latest"],
      "env": {
        "WALLET_PUBLIC_KEY": "3TyBTeqqN5NpMicX6JXAVAHqUyYLqSNz4EMtQxM34yMw"
      }
    }
  }
}
```

### Fallback: Env Var (Dev Only)
If keytar is not available, set `WALLET_PRIVATE_KEY` in env.
The server will warn loudly if this is used in production.

### What NEVER happens
- Key is never logged (even in debug mode)
- Key is never sent to any Clawdrop API
- Key is never written to disk by the MCP process
- Key is cleared from memory after each signing operation

---

## Layer 2: Clawdrop Control Plane Server

The server wallet (`3TyBTeqqN5NpMicX6JXAVAHqUyYLqSNz4EMtQxM34yMw`) receives 
payments but doesn't need to sign outbound transactions in Phase 1.

### Current (Phase 1 — dev)
- Wallet address in env var (receive-only, no private key needed server-side)
- Helius API key in env var, passed to MCP via config
- `.env` file has `chmod 600` (owner read-only)

### Phase 2 — Production Hardening
```
HashiCorp Vault (self-hosted on separate VPS)
  └── Transit Engine — signs transactions without exposing key
  └── KV Store — API keys with TTL and auto-rotation
  └── Audit Log — every secret access is recorded

Control Plane → Vault → sign tx → broadcast to Solana
              ↑
         short-lived token (1hr TTL, auto-renewed)
```

### .env File Security
```bash
chmod 600 .env              # Owner read-only
chown root .env             # Only root can read it
echo ".env" >> .gitignore   # Never committed
```

---

## Layer 3: Treasuries, DAOs, Projects (Squads Multisig)

For users managing shared funds (Tier B+), recommend Squads Protocol:

```
Treasury DAO wallet (Squads multisig)
  ├── 3 of 5 signers required
  ├── 48-hour timelock on large transfers
  ├── Spending limits per signer
  └── On-chain audit trail
```

The Clawdrop control plane interacts with the Squads vault:
1. Agent requests payment → creates Squads transaction proposal
2. DAO members approve in Squads UI or via MCP tool
3. Transaction executes only after threshold signatures

```typescript
// Future tool: create_multisig_payment
// Creates a Squads proposal instead of executing directly
import { Multisig } from '@sqds/multisig';

const proposal = await Multisig.propose({
  multisig: treasuryAddress,
  transaction: paymentTx,
  memo: `Clawdrop subscription renewal: ${agentId}`,
});
```

---

## Layer 4: Environment Variable Best Practices

### Never do this
```bash
# BAD — key visible in process list to anyone on the system
WALLET_PRIVATE_KEY=abc123 node server.js

# BAD — logged by shell history
export WALLET_PRIVATE_KEY=abc123
```

### Do this instead
```bash
# Good — key loaded from file, not visible in ps aux
node -r dotenv/config server.js   # reads .env with 600 permissions

# Better — key never on disk at all (keychain)
npx @clawdrop/mcp setup           # one time
node server.js                    # no key in env
```

### In production (systemd service)
```ini
[Service]
EnvironmentFile=/etc/clawdrop/secrets  # 600 permissions, owned by service user
ExecStart=/usr/bin/node dist/index.js
User=clawdrop                          # dedicated non-root user
NoNewPrivileges=true
```

---

## Quick Reference

| User Type | How to secure keys |
|-----------|-------------------|
| Developer using `@clawdrop/mcp` | `npx @clawdrop/mcp setup` (keytar → OS keychain) |
| Claude Desktop user | Same — no key in config file after setup |
| Clawdrop server operator | `.env` with 600 perms → Phase 2: HashiCorp Vault |
| DAO / Treasury | Squads multisig — no single private key at all |
| Hardware wallet user | Ledger via Phantom — key never digital |

---

## Red Lines — Things We Never Do

1. **Never log a private key** — even `key.slice(0,4)` in debug logs
2. **Never accept a private key via MCP tool input** — only wallet address (public)
3. **Never store keys in databases** — even encrypted unless we own the KMS
4. **Never commit `.env` to git** — gitignore enforced + CI check
5. **Never fall back silently** — missing key = hard crash with clear instructions
