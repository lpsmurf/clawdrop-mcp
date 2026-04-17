/**
 * @clawdrop/research — Research tool bundle
 *
 * Exports tools:
 *  - web_search         (Brave if BRAVE_API_KEY set, else DuckDuckGo)
 *  - summarize_url
 *  - get_news
 *  - get_token_info     (DexScreener)
 *  - get_trending_tokens (DexScreener)
 *  - search_token       (DexScreener)
 */

export { webSearchTool, handleWebSearch } from './tools/search.js';
export { summarizeUrlTool, handleSummarizeUrl } from './tools/fetch.js';
export { getNewsTool, handleGetNews } from './tools/news.js';
export {
  dexscreenerTools,
  handleGetTokenInfo,
  handleGetTrendingTokens,
  handleSearchToken,
} from './tools/dexscreener.js';

import { webSearchTool, handleWebSearch } from './tools/search.js';
import { summarizeUrlTool, handleSummarizeUrl } from './tools/fetch.js';
import { getNewsTool, handleGetNews } from './tools/news.js';
import {
  dexscreenerTools,
  handleGetTokenInfo,
  handleGetTrendingTokens,
  handleSearchToken,
} from './tools/dexscreener.js';

export const researchTools = [
  webSearchTool,
  summarizeUrlTool,
  getNewsTool,
  ...dexscreenerTools,
];

export async function handleResearchTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'web_search':
      return handleWebSearch(input);
    case 'summarize_url':
      return handleSummarizeUrl(input);
    case 'get_news':
      return handleGetNews(input);
    case 'get_token_info':
      return handleGetTokenInfo(input);
    case 'get_trending_tokens':
      return handleGetTrendingTokens(input);
    case 'search_token':
      return handleSearchToken(input);
    default:
      return { error: `Unknown research tool: ${toolName}` };
  }
}
