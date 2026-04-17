/**
 * summarize_url tool
 * Fetches a URL, strips HTML, and returns the first 2000 chars of clean text + title.
 */

import axios from 'axios';

export const summarizeUrlTool = {
  name: 'summarize_url',
  description: 'Fetch a URL and return cleaned text content (first 2000 chars) and page title',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'URL to fetch and summarize' },
    },
    required: ['url'],
  },
};

function stripHtml(html: string): string {
  // Remove <script> and <style> blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '');

  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|article|section)>/gi, '\n');

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ');

  // Normalize whitespace
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

export async function handleSummarizeUrl(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const url = input.url as string;

    const res = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ClawdropBot/1.0; +https://clawdrop.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
      maxRedirects: 5,
      responseType: 'text',
    });

    const html = res.data as string;
    const title = extractTitle(html);
    const clean = stripHtml(html);
    const excerpt = clean.slice(0, 2000);

    return {
      url,
      title,
      excerpt,
      total_chars: clean.length,
      truncated: clean.length > 2000,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
