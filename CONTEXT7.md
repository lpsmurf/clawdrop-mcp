# Context7 Integration for Clawdrop MCP

Up-to-date documentation for libraries used in the Poli Expansion project.

## What is Context7?

Context7 pulls version-specific documentation and code examples into your LLM context:
- ✅ No outdated APIs
- ✅ No hallucinated methods  
- ✅ Real code examples from current package versions

## Libraries We Use

| Package | Version | Context7 ID |
|---------|---------|-------------|
| @solana/web3.js | ^1.91.0 | `solana-web3` |
| @modelcontextprotocol/sdk | ^1.0.0 | `mcp-sdk` |
| axios | ^1.6.0 | `axios` |
| pino | ^8.0.0 | `pino` |

## Usage

### In Claude Code / MCP

Ask for current docs:

```
"Use context7 to get the latest Solana web3.js Transaction API"
```

### Via CLI

```bash
npx ctx7 get solana-web3 Transaction
npx ctx7 get mcp-sdk Server
npx ctx7 get axios interceptors
```

### In Code

```typescript
// Ask me (Claude) with context7:
"Show me the current Solana web3.js code for signing a transaction"

// I'll fetch the real API docs, not hallucinate old methods
```

## MCP Server Config

`.claude/mcp.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

## Benefits for Poli Project

1. **Solana Web3.js** — Current transaction/bundle APIs for Jito integration
2. **MCP SDK** — Latest tool definitions and server patterns
3. **Birdeye API** — Up-to-date endpoint documentation
4. **DD.xyz** — Current risk scoring API specs

## Commands

| Task | Command |
|------|---------|
| Get package docs | `npx ctx7 get <package> <topic>` |
| Search packages | `npx ctx7 search <query>` |
| List available | `npx ctx7 list` |

## Links

- https://context7.com
- https://github.com/upstash/context7
