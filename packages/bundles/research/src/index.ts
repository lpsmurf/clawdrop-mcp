/**
 * @clawdrop/research — Research tool bundle
 *
 * Exports three MCP-compatible tools:
 *  - web_search   (Brave if BRAVE_API_KEY set, else DuckDuckGo)
 *  - summarize_url
 *  - get_news
 */

export { webSearchTool, handleWebSearch } from './tools/search.js';
export { summarizeUrlTool, handleSummarizeUrl } from './tools/fetch.js';
export { getNewsTool, handleGetNews } from './tools/news.js';

import { webSearchTool, handleWebSearch } from './tools/search.js';
import { summarizeUrlTool, handleSummarizeUrl } from './tools/fetch.js';
import { getNewsTool, handleGetNews } from './tools/news.js';

export const researchTools = [webSearchTool, summarizeUrlTool, getNewsTool];

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
    default:
      return { error: `Unknown research tool: ${toolName}` };
  }
}
