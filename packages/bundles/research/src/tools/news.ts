/**
 * get_news tool
 * Fetches news results from DuckDuckGo news endpoint.
 */

import axios from 'axios';

export const getNewsTool = {
  name: 'get_news',
  description: 'Get top news stories for a query — returns title, URL, source, and date',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'News search query' },
      count: { type: 'number', description: 'Number of results (max 5, default 5)' },
    },
    required: ['query'],
  },
};

interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string | null;
}

export async function handleGetNews(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const query = input.query as string;
    const count = Math.min((input.count as number) ?? 5, 5);

    const res = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', t: 'news', no_html: '1', no_redirect: '1' },
      timeout: 10000,
    });

    const data = res.data;
    const items: NewsItem[] = [];

    // News results appear in RelatedTopics for news queries
    const topics: Array<{
      Text?: string;
      FirstURL?: string;
      Name?: string;
      Result?: string;
    }> = data.RelatedTopics ?? [];

    for (const topic of topics) {
      if (items.length >= count) break;
      if (topic.Text && topic.FirstURL) {
        // Try to extract source from URL hostname
        let source = '';
        try {
          source = new URL(topic.FirstURL).hostname.replace(/^www\./, '');
        } catch {
          source = 'unknown';
        }

        items.push({
          title: topic.Text.slice(0, 120),
          url: topic.FirstURL,
          source,
          date: null, // DDG doesn't reliably expose dates in the free API
        });
      }
    }

    // Also check top-level Results
    if (data.Results?.length) {
      for (const r of data.Results) {
        if (items.length >= count) break;
        let source = '';
        try {
          source = new URL(r.FirstURL).hostname.replace(/^www\./, '');
        } catch {
          source = 'unknown';
        }
        items.push({
          title: r.Text?.slice(0, 120) ?? '',
          url: r.FirstURL ?? '',
          source,
          date: null,
        });
      }
    }

    return { query, count: items.length, items };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
