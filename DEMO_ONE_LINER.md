# Clawdrop — One-Line Setup for Claude Code

## The Line Users Copy from Your Website

```bash
claude mcp add clawdrop -- npx -y github:lpsmurf/clawdrop-mcp
```

That's it. Once pasted in Claude Code terminal, the MCP loads and Claude
guides the user through the full setup walkthrough automatically.

---

## What Happens After Paste

Claude Code detects the new MCP server and immediately starts the walkthrough:

---

### 🐾 Claude's Walkthrough Script

> **Welcome to Clawdrop! I'll get your OpenClaw agent deployed in a few minutes.**
> **Let me walk you through the setup.**

**Step 1 — Choose your plan:**

*[Claude calls `list_tiers` and shows:]*

| Plan | Price | Specs | Best for |
|------|-------|-------|----------|
| 🥉 Starter | $100/mo | 2GB RAM, 1 vCPU | Experiments |
| 🥈 Professional | $200/mo | 4GB RAM, 2 vCPU | Production |
| 🥇 Enterprise | $400/mo | Custom | Scale |

> Which plan would you like? (starter / professional / enterprise)

---

**Step 2 — Telegram bot:**

> Do you have a Telegram bot token? If yes, paste it here.
> (Get one free from @BotFather on Telegram — takes 30 seconds)
> Or type "skip" to deploy without Telegram for now.

---

**Step 3 — LLM Provider:**

> Which AI provider do you want your agent to use?
> 1. Anthropic (Claude) — recommended
> 2. OpenAI (GPT-4)
> 3. OpenRouter (multiple models)
>
> Paste your API key when ready.

---

**Step 4 — Payment:**

*[Claude calls `quote_tier` and shows:]*

> Your **Starter** plan costs **0.5 SOL (~$100)**
>
> Send payment to:
> `CLAWDROP_WALLET_ADDRESS_HERE`
>
> Open Phantom wallet → Send → paste address → 0.5 SOL → Confirm
>
> Once sent, paste the transaction signature here.

---

**Step 5 — Deploy:**

*[Claude calls `deploy_agent` with all collected info]*

> ✅ Payment verified!
> 🚀 Deploying your OpenClaw agent...
> ⏳ This takes ~60 seconds...
>
> ✅ Agent deployed!
> Agent ID: agent_1234abc
> Status: running
> Telegram: connected (@YourBotName)
>
> Your agent is live. Open Telegram and say hello to your bot!

---

## Install Command Variants

```bash
# Standard (recommended)
claude mcp add clawdrop -- npx -y github:lpsmurf/clawdrop-mcp

# From npm (once published)
claude mcp add clawdrop -- npx -y @clawdrop/mcp

# Local dev
claude mcp add clawdrop -- npx tsx /path/to/clawdrop/packages/control-plane/src/index.ts
```

---

## What Gets Deployed

```
User's Agent Container (TENANT VPS - 187.124.173.69)
├── OpenClaw runtime (Ubuntu 24.04 + Node.js 22)
├── Telegram bot (connected to user's bot token)
├── LLM integration (Anthropic/OpenAI/OpenRouter)
├── MCP tools (travel-crypto-pro, solana, research, treasury)
└── Resource limits: 1.5GB RAM, 0.5 vCPU, 100 PIDs
```

---

## Environment Variables Passed to Container

| Variable | Source | Required |
|----------|--------|----------|
| `TELEGRAM_BOT_TOKEN` | User provides in walkthrough | Optional |
| `ANTHROPIC_API_KEY` | User provides in walkthrough | Yes (if Anthropic) |
| `OPENAI_API_KEY` | User provides in walkthrough | Yes (if OpenAI) |
| `OPENROUTER_API_KEY` | User provides in walkthrough | Yes (if OpenRouter) |
| `DUFFEL_API_TOKEN` | Clawdrop platform | Auto-injected |
| `AGENT_ID` | Generated on deploy | Auto-injected |
| `OWNER_WALLET` | User's Phantom wallet | Auto-injected |

---

## Demo Script (For Tomorrow)

1. Open Claude Code
2. Paste: `claude mcp add clawdrop -- npx -y github:lpsmurf/clawdrop-mcp`
3. Say to Claude: *"Set up my OpenClaw agent"*
4. Claude walks through tiers → Telegram → LLM → Payment
5. User pays via Phantom
6. Agent deploys to TENANT VPS
7. Telegram bot is live

**Total time: ~3 minutes**

---

**Status**: Ready pending Kimi's HFSP update (accept telegram_token + llm_api_key)
**Owner**: Both
**Demo Date**: Tomorrow
