/**
 * keystore.ts — Secure private key retrieval for @clawdrop/mcp
 *
 * Priority order (most → least secure):
 *   1. macOS Keychain / Windows Credential Manager / Linux Secret Service (keytar)
 *   2. Environment variable WALLET_PRIVATE_KEY (dev only, warns)
 *   3. Refuse to run with clear instructions
 *
 * The private key NEVER:
 *   - Gets logged
 *   - Gets sent over the network
 *   - Gets written to disk by this process
 *   - Appears in error messages
 */

const KEYCHAIN_SERVICE = 'clawdrop-mcp';
const KEYCHAIN_ACCOUNT = 'wallet-private-key';

/**
 * Attempt to load keytar (optional dependency).
 * Gracefully absent if user hasn't installed it.
 */
async function tryKeytar(): Promise<string | null> {
  try {
    // Dynamic import so we don't hard-fail if keytar isn't installed
    const { getPassword } = await import('keytar');
    const key = await getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    return key ?? null;
  } catch {
    return null; // keytar not installed or not available
  }
}

/**
 * Store a private key in the OS keychain.
 * Call this once during `npx @clawdrop/mcp setup`.
 */
export async function storeKeyInKeychain(privateKey: string): Promise<void> {
  const { setPassword } = await import('keytar');
  await setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, privateKey);
  console.error('✅ Private key stored in OS keychain (never touches disk)');
}

/**
 * Remove the stored private key from the OS keychain.
 */
export async function removeKeyFromKeychain(): Promise<void> {
  const { deletePassword } = await import('keytar');
  await deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  console.error('✅ Private key removed from OS keychain');
}

/**
 * Get the private key securely.
 * Used internally by tool handlers — key is never stored in a variable
 * longer than needed for the signing operation.
 */
export async function getPrivateKey(): Promise<string> {
  // 1. Try OS keychain first (most secure)
  const keychainKey = await tryKeytar();
  if (keychainKey) {
    return keychainKey;
  }

  // 2. Fall back to env var with a loud warning
  const envKey = process.env.WALLET_PRIVATE_KEY;
  if (envKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '⚠️  WARNING: Using WALLET_PRIVATE_KEY env var in production is insecure.\n' +
        '   Store your key in the OS keychain instead:\n' +
        '   npx @clawdrop/mcp setup'
      );
    }
    return envKey;
  }

  // 3. No key found — give clear instructions
  throw new Error(
    'No private key found. To store your key securely:\n\n' +
    '  npx @clawdrop/mcp setup\n\n' +
    'Or temporarily set WALLET_PRIVATE_KEY in your Claude Desktop config env.\n' +
    'See: https://docs.clawdrop.io/security'
  );
}

/**
 * Check if a private key is available without retrieving it.
 * Use for capability checks.
 */
export async function hasPrivateKey(): Promise<boolean> {
  const keychainKey = await tryKeytar();
  if (keychainKey) return true;
  return !!process.env.WALLET_PRIVATE_KEY;
}
