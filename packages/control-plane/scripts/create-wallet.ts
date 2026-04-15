import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Generate new devnet wallet
const keypair = Keypair.generate();

const walletData = {
  publicKey: keypair.publicKey.toString(),
  secretKey: Array.from(keypair.secretKey),
};

fs.writeFileSync('devnet-wallet.json', JSON.stringify(walletData, null, 2));

console.log('Devnet wallet created:');
console.log('Public Key:', keypair.publicKey.toString());
console.log('\nTo fund this wallet, visit: https://faucet.solana.com/');
console.log('Or use: solana airdrop 2 ' + keypair.publicKey.toString() + ' --url devnet');
