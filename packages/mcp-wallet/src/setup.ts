#!/usr/bin/env node
/**
 * setup.ts — One-time key setup wizard for @clawdrop/mcp
 *
 * Run: npx @clawdrop/mcp setup
 *
 * Stores your private key in the OS keychain so you never need to
 * paste it into config files again.
 */
import readline from 'readline';
import { storeKeyInKeychain, removeKeyFromKeychain } from './keystore.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

function question(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  const cmd = process.argv[3]; // npx @clawdrop/mcp setup [clear]

  if (cmd === 'clear') {
    await removeKeyFromKeychain();
    console.error('Key removed from keychain.');
    rl.close();
    return;
  }

  console.error('\n🔐 Clawdrop Wallet Setup\n');
  console.error('Your private key will be stored in your OS keychain.');
  console.error('It will never be written to disk or sent over the network.\n');

  // Disable terminal echo for key entry
  process.stderr.write('Paste your base58 private key (input hidden): ');

  // stdin raw mode to hide input
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  let key = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    if (chunk === '\n' || chunk === '\r' || chunk === '\r\n') break;
    if (chunk === '\u0003') { process.exit(1); } // Ctrl+C
    if (chunk === '\u007f') { key = key.slice(0, -1); continue; } // Backspace
    key += chunk;
    process.stderr.write('*');
  }
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stderr.write('\n');

  key = key.trim();

  // Basic validation
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(key)) {
    console.error('❌ That does not look like a valid Solana private key (base58, 64-88 chars).');
    console.error('   Get your key from Phantom: Settings → Security & Privacy → Export Private Key');
    rl.close();
    process.exit(1);
  }

  await storeKeyInKeychain(key);
  key = ''; // Clear from memory immediately

  console.error('\n✅ Done! Your key is now in the OS keychain.');
  console.error('   Claude will use it automatically — no env var needed.\n');
  console.error('   To remove it later: npx @clawdrop/mcp setup clear\n');

  rl.close();
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
