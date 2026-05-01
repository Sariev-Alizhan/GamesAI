// RAG (Retrieval-Augmented Generation) layer for AI Describe.
//
// Walks the knowledge-base/ folder, extracts each markdown entry's frontmatter
// + body, and ranks them against the user's prompt using a simple keyword
// scoring algorithm. Top-K matching entries get injected into Claude's
// system prompt so its YAML output references real game-dev patterns
// instead of generic AI guesses.
//
// Why not embeddings? At 16-50 entries the keyword approach is fast,
// deterministic, debuggable, requires no extra API calls, and gives
// "good enough" recall. When the knowledge base passes ~100 entries we
// switch to embeddings — but not before.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface KnowledgeEntry {
  path: string;
  relPath: string;
  title: string;
  type: string;
  slug: string;
  tags: string[];
  body: string;
}

export interface RankedEntry {
  entry: KnowledgeEntry;
  score: number;
  matchedTerms: string[];
}

// Words too generic to use as match signal. Kept small — overly aggressive
// stoplists hurt recall on a small corpus.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'should', 'could', 'may', 'might', 'must', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', "it's", 'they', 'them', 'их', 'это', 'этот',
  'эта', 'эти', 'для', 'или', 'как', 'что', 'где', 'когда', 'если', 'не',
  'на', 'в', 'и', 'с', 'по', 'из', 'к', 'о', 'у',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

interface ParsedFrontmatter {
  title: string;
  type: string;
  slug: string;
  tags: string[];
}

function parseFrontmatter(content: string): { meta: ParsedFrontmatter; body: string } {
  const empty: ParsedFrontmatter = { title: '', type: '', slug: '', tags: [] };
  if (!content.startsWith('---\n')) return { meta: empty, body: content };
  const endIdx = content.indexOf('\n---\n', 4);
  if (endIdx === -1) return { meta: empty, body: content };
  const fmText = content.slice(4, endIdx);
  const body = content.slice(endIdx + 5);

  const meta: ParsedFrontmatter = { title: '', type: '', slug: '', tags: [] };
  for (const line of fmText.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'title') meta.title = value;
    else if (key === 'type') meta.type = value;
    else if (key === 'slug') meta.slug = value;
    else if (key === 'tags') {
      // tags: [a, b, c] — naive parse, good enough for our format
      const m = value.match(/^\[(.*)\]$/);
      if (m) {
        meta.tags = m[1]!.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      }
    }
  }
  return { meta, body };
}

async function walkMarkdown(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      let st;
      try {
        st = await stat(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        // Skip private folders
        if (name.startsWith('.') || name === 'node_modules') continue;
        await walk(full);
      } else if (name.endsWith('.md') && !name.startsWith('_')) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

export async function loadKnowledgeBase(root: string): Promise<KnowledgeEntry[]> {
  const paths = await walkMarkdown(root);
  const entries: KnowledgeEntry[] = [];
  for (const path of paths) {
    try {
      const content = await readFile(path, 'utf-8');
      const { meta, body } = parseFrontmatter(content);
      entries.push({
        path,
        relPath: path.startsWith(root) ? path.slice(root.length).replace(/^\//, '') : path,
        title: meta.title || path.split('/').pop()!.replace(/\.md$/, ''),
        type: meta.type,
        slug: meta.slug,
        tags: meta.tags,
        body,
      });
    } catch {
      // skip unreadable files silently
    }
  }
  return entries;
}

/**
 * Rank knowledge entries against a user query.
 *
 * Scoring weights (tuned empirically — easy to revisit):
 * - Title match: 5 points per term
 * - Tag match:   4 points per term
 * - Slug match:  3 points per term
 * - Body match:  1 point per term, capped at 5 occurrences per term
 *
 * Plus a relevance boost: entries whose `type` is in `entityTypes` get +3
 * (an entry tagged for the entity type the user is generating is highly
 * likely to be relevant).
 */
export function rankEntries(
  entries: KnowledgeEntry[],
  query: string,
  entityTypes: string[] = [],
): RankedEntry[] {
  const queryTerms = new Set(tokenize(query));
  const entityTermsLower = new Set(entityTypes.map((t) => t.toLowerCase()));
  const ranked: RankedEntry[] = [];

  for (const entry of entries) {
    let score = 0;
    const matched = new Set<string>();

    const titleTokens = new Set(tokenize(entry.title));
    const slugTokens = new Set(tokenize(entry.slug));
    const tagTokens = new Set(entry.tags.flatMap((t) => tokenize(t)));
    const bodyText = entry.body.toLowerCase();

    for (const term of queryTerms) {
      if (titleTokens.has(term)) {
        score += 5;
        matched.add(term);
      }
      if (tagTokens.has(term)) {
        score += 4;
        matched.add(term);
      }
      if (slugTokens.has(term)) {
        score += 3;
        matched.add(term);
      }
      // Body match — count occurrences capped at 5 per term to avoid runaway
      // scoring from one repetitive entry.
      const bodyMatches = (bodyText.match(new RegExp(`\\b${escapeRegex(term)}\\b`, 'g')) || []).length;
      if (bodyMatches > 0) {
        score += Math.min(bodyMatches, 5);
        matched.add(term);
      }
    }

    // Boost if any entity type the user is generating matches a tag/title token
    for (const et of entityTermsLower) {
      if (titleTokens.has(et) || tagTokens.has(et) || slugTokens.has(et)) {
        score += 3;
      }
    }

    if (score > 0) {
      ranked.push({ entry, score, matchedTerms: [...matched] });
    }
  }

  return ranked.sort((a, b) => b.score - a.score);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format the top-K entries as a context block to inject into Claude's
 * system prompt. Trims body to ~600 chars per entry to keep prompt budget
 * reasonable (we want the AI to *reference* patterns, not paraphrase
 * entire docs).
 */
export function formatRagContext(ranked: RankedEntry[], topK = 3): string {
  if (ranked.length === 0) return '';
  const top = ranked.slice(0, topK);
  const sections = top.map((r, i) => {
    const trimmedBody = r.entry.body.length > 600
      ? r.entry.body.slice(0, 600) + '\n[…truncated…]'
      : r.entry.body;
    return `## Reference ${i + 1}: ${r.entry.title}
Source: ${r.entry.relPath}
Matched: ${r.matchedTerms.join(', ')}

${trimmedBody}`;
  });

  return `# Relevant patterns from the Boilergen knowledge base

The following references were retrieved because they relate to the user's request. Use them to ground your YAML schema in real game-dev patterns. If a reference suggests a field structure or convention that fits the user's description, prefer it over inventing one. Cite sources implicitly via field naming consistency, not in the YAML itself.

${sections.join('\n\n---\n\n')}`;
}

/**
 * Convenience wrapper: load KB, rank against query, return top-K formatted
 * for prompt injection plus the source list for UI display.
 */
export async function buildRagContext(
  knowledgeBaseRoot: string,
  query: string,
  entityTypes: string[] = [],
  topK = 3,
): Promise<{ context: string; sources: { title: string; path: string; score: number }[] }> {
  try {
    const entries = await loadKnowledgeBase(knowledgeBaseRoot);
    const ranked = rankEntries(entries, query, entityTypes);
    const context = formatRagContext(ranked, topK);
    const sources = ranked.slice(0, topK).map((r) => ({
      title: r.entry.title,
      path: r.entry.relPath,
      score: r.score,
    }));
    return { context, sources };
  } catch {
    // RAG failure should never block AI Describe — degrade gracefully to no context.
    return { context: '', sources: [] };
  }
}
