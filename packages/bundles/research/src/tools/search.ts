/**
 * web_search tool
 * Uses Brave Search API if BRAVE_API_KEY is set, otherwise falls back to DuckDuckGo instant answer.
 */

import axios from 'axios';

export const webSearchTool = {
  name: 'web_search',
  description: 'Search the web and return top results with title, URL, and snippet',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Number of results to return (max 5, default 5)' },
    },
    required: ['query'],
  },
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchBrave(query: string, count: number): Promise<SearchResult[]> {
  const res = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': process.env.BRAVE_API_KEY!,
    },
    params: { q: query, count },
    timeout: 10000,
  });

  const results = res.data?.web?.results ?? [];
  return results.slice(0, count).map((r: { title?: string; url?: string; description?: string }) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.description ?? '',
  }));
}

async function searchDuckDuckGo(query: string, count: number): Promise<SearchResult[]> {
  const res = await axios.get('https://api.duckduckgo.com/', {
    params: { q: query, format: 'json', no_html: '1', no_redirect: '1' },
    timeout: 10000,
  });

  const data = res.data;
  const results: SearchResult[] = [];

  // Abstract (top answer)
  if (data.AbstractURL && data.Abstract) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.Abstract,
    });
  }

  // Related topics
  const topics: Array<{ Text?: string; FirstURL?: string; Name?: string }> = data.RelatedTopics ?? [];
  for (const topic of topics) {
    if (results.length >= count) break;
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Name || topic.Text.slice(0, 60),
        url: topic.FirstURL,
        snippet: topic.Text,
      });
    }
  }

  // Results from Infobox if still short
  if (results.length === 0 && data.Results?.length) {
    for (const r of data.Results.slice(0, count)) {
      results.push({
        title: r.Text || '',
        url: r.FirstURL || '',
        snippet: r.Text || '',
      });
    }
  }

  return results.slice(0, count);
}

export async function handleWebSearch(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const query = input.query as string;
    const count = Math.min((input.count as number) ?? 5, 5);

    let results: SearchResult[];
    let source: string;

    if (process.env.BRAVE_API_KEY) {
      results = await searchBrave(query, count);
      source = 'brave';
    } else {
      results = await searchDuckDuckGo(query, count);
      source = 'duckduckgo';
    }

    return { query, source, count: results.length, results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
