/**
 * Jito Bundle API Client
 */
import axios from 'axios';
import { pino } from 'pino';

const logger = pino({ name: 'jito-api' });

const JITO_RPC_URL = process.env.JITO_RPC_URL || 'https://mainnet.block-engine.jito.wtf/api/v1';

export async function sendBundle(transactions: string[], tipLamports: number) {
  logger.info({ txCount: transactions.length, tipLamports }, 'Sending Jito bundle');
  
  const res = await axios.post(`${JITO_RPC_URL}/bundles`, {
    jsonrpc: '2.0',
    id: 1,
    method: 'sendBundle',
    params: [transactions, { skipPreflightValidation: false }],
  });
  
  return {
    bundle_id: res.data.result,
    mev_tip_lamports: tipLamports,
  };
}

export async function getBundleStatus(bundleId: string) {
  const res = await axios.get(`${JITO_RPC_URL}/bundles/${bundleId}`);
  return {
    bundle_id: bundleId,
    status: res.data.status,
    slot: res.data.slot,
    timestamp: res.data.timestamp,
  };
}
