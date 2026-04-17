/**
 * Telegram long-poll bot for deployed OpenClaw agents.
 * Spawned as a background process by index.ts when TELEGRAM_BOT_TOKEN is set.
 * Routes user messages to Claude claude-3-5-haiku-20241022 via Anthropic API.
 */
import axios from 'axios';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const BOT_API = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN) {
  process.stderr.write('[bot] No TELEGRAM_BOT_TOKEN — exiting\n');
  process.exit(0);
}

let lastUpdateId = 0;

// Tool capability description for the system prompt
const SYSTEM_PROMPT = `You are a Clawdrop AI agent with the following capabilities:
- Solana wallet: check balances, swap tokens via Jupiter, send SOL/SPL tokens
- Flight search & booking via Duffel API (search, price, book)
- Web research: search the web, summarize URLs, get news

When users ask about flights, wallets, or research, describe what you would do clearly.
Keep responses concise and under 300 words. Use plain text, not markdown.`;

async function getUpdates(): Promise<any[]> {
  const res = await axios.get(`${BOT_API}/getUpdates`, {
    params: { offset: lastUpdateId + 1, timeout: 30 },
    timeout: 35_000,
  });
  return (res.data.result as any[]) ?? [];
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await axios.post(`${BOT_API}/sendMessage`, {
    chat_id: chatId,
    text: text.slice(0, 4096), // Telegram message limit
  });
}

async function askClaude(userMessage: string, history: Array<{role: string, content: string}>): Promise<string> {
  if (!ANTHROPIC_KEY) return 'No LLM key configured for this agent.';
  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [...history, { role: 'user', content: userMessage }],
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30_000,
      }
    );
    return res.data.content[0].text as string;
  } catch (err: any) {
    return `Error reaching LLM: ${err.message}`;
  }
}

// Per-chat conversation history (last 10 turns)
const chatHistories = new Map<number, Array<{role: string, content: string}>>();

async function poll(): Promise<void> {
  process.stderr.write('[bot] Telegram bot started, polling for messages...\n');
  
  while (true) {
    try {
      const updates = await getUpdates();
      for (const update of updates) {
        lastUpdateId = update.update_id;
        const msg = update.message;
        if (!msg?.text) continue;

        const chatId: number = msg.chat.id;
        const text: string = msg.text;
        const username: string = msg.from?.username ?? msg.from?.first_name ?? 'user';

        process.stderr.write(`[bot] ${username}: ${text}\n`);

        // Maintain conversation history per chat
        const history = chatHistories.get(chatId) ?? [];
        const reply = await askClaude(text, history);

        // Update history (keep last 10 exchanges = 20 messages)
        history.push({ role: 'user', content: text });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) history.splice(0, 2);
        chatHistories.set(chatId, history);

        await sendMessage(chatId, reply);
        process.stderr.write(`[bot] Replied to ${username}\n`);
      }
    } catch (err: any) {
      process.stderr.write(`[bot] Poll error: ${err.message}\n`);
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

poll();
