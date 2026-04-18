/**
 * DD.xyz Risk API Client
 */
import axios from 'axios';
import { pino } from 'pino';
import type { TokenRisk, RiskTier } from './types.js';

const logger = pino({ name: 'ddxyz-api' });

const API_KEY = process.env.DD_XYZ_API_KEY;
const BASE_URL = 'https://dd.xyz/api/v1';

export async function assessTokenRisk(mint: string): Promise<TokenRisk> {
  logger.info({ mint }, 'Assessing token risk');
  
  if (!API_KEY) {
    logger.warn('DD_XYZ_API_KEY not set, returning mock YELLOW risk');
    return {
      mint,
      tier: 'YELLOW',
      confidence: 50,
      flags: ['api_key_missing'],
      reasoning: 'Risk API not configured - proceeding with caution',
      recommendation: 'caution',
    };
  }
  
  try {
    const res = await axios.get(`${BASE_URL}/token_risk?address=${mint}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      timeout: 10000,
    });
    
    return {
      mint,
      tier: mapRiskTier(res.data.tier),
      confidence: res.data.confidence || 80,
      flags: res.data.flags || [],
      reasoning: res.data.reasoning || 'No specific issues detected',
      recommendation: mapRecommendation(res.data.tier),
    };
  } catch (err) {
    logger.error({ err, mint }, 'Failed to assess token risk');
    // Safe fallback: assume YELLOW on error
    return {
      mint,
      tier: 'YELLOW',
      confidence: 50,
      flags: ['api_error'],
      reasoning: 'Unable to assess risk - API error',
      recommendation: 'caution',
    };
  }
}

function mapRiskTier(tier: string): RiskTier {
  switch (tier?.toLowerCase()) {
    case 'green': return 'GREEN';
    case 'red': return 'RED';
    case 'yellow':
    default: return 'YELLOW';
  }
}

function mapRecommendation(tier: string): 'proceed' | 'caution' | 'block' {
  switch (tier?.toLowerCase()) {
    case 'green': return 'proceed';
    case 'red': return 'block';
    case 'yellow':
    default: return 'caution';
  }
}
