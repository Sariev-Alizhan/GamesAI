// Tests for the RAG retrieval layer that feeds AI Describe.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadKnowledgeBase,
  rankEntries,
  formatRagContext,
  buildRagContext,
} from '../src/ai/rag.js';

let kbRoot: string;

beforeEach(async () => {
  kbRoot = await mkdtemp(join(tmpdir(), 'boilergen-rag-test-'));
});

afterEach(async () => {
  if (kbRoot) await rm(kbRoot, { recursive: true, force: true });
});

async function writeEntry(rel: string, content: string): Promise<void> {
  const full = join(kbRoot, rel);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf-8');
}

describe('loadKnowledgeBase', () => {
  it('loads markdown entries with frontmatter', async () => {
    await writeEntry(
      'engines/godot.md',
      `---
type: engine
slug: godot
title: Godot Resources
tags: [godot, tres, codegen]
---

# Godot Resources

Godot uses .tres files for data.`,
    );
    const entries = await loadKnowledgeBase(kbRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe('Godot Resources');
    expect(entries[0]?.type).toBe('engine');
    expect(entries[0]?.tags).toEqual(['godot', 'tres', 'codegen']);
    expect(entries[0]?.body).toContain('.tres files for data');
  });

  it('walks subdirectories', async () => {
    await writeEntry('games/factorio.md', '---\ntitle: Factorio\n---\nFactorio body');
    await writeEntry('engines/unity.md', '---\ntitle: Unity\n---\nUnity body');
    await writeEntry('patterns/data-driven.md', '---\ntitle: Data-Driven\n---\nDD body');
    const entries = await loadKnowledgeBase(kbRoot);
    expect(entries.map((e) => e.title).sort()).toEqual(['Data-Driven', 'Factorio', 'Unity']);
  });

  it('skips files starting with underscore (templates)', async () => {
    await writeEntry('_template.md', '---\ntitle: Template\n---\nIgnore me');
    await writeEntry('real.md', '---\ntitle: Real\n---\nReal body');
    const entries = await loadKnowledgeBase(kbRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe('Real');
  });

  it('skips hidden directories like .git', async () => {
    await writeEntry('.git/config.md', '---\ntitle: Git\n---\nignored');
    await writeEntry('real.md', '---\ntitle: Real\n---\nreal');
    const entries = await loadKnowledgeBase(kbRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe('Real');
  });

  it('returns empty array when root does not exist', async () => {
    const entries = await loadKnowledgeBase('/nonexistent/path/xyz');
    expect(entries).toEqual([]);
  });
});

describe('rankEntries', () => {
  it('ranks entries by keyword overlap with query', async () => {
    await writeEntry(
      'a.md',
      '---\ntitle: FiveM Resources\nslug: fivem\ntags: [fivem, lua, jobs]\n---\nFiveM jobs and grades pattern body content here',
    );
    await writeEntry(
      'b.md',
      '---\ntitle: Godot Tres\nslug: godot\ntags: [godot, tres]\n---\nGodot resource format body',
    );
    const entries = await loadKnowledgeBase(kbRoot);
    const ranked = rankEntries(entries, 'I want to add a new fivem job with grades');
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.entry.title).toBe('FiveM Resources');
    expect(ranked[0]?.matchedTerms).toEqual(expect.arrayContaining(['fivem']));
  });

  it('weights title and tag matches higher than body', async () => {
    await writeEntry(
      'high.md',
      '---\ntitle: Weapon Schemas\ntags: [weapon, balance]\n---\nbody content here',
    );
    await writeEntry(
      'low.md',
      '---\ntitle: Generic Patterns\ntags: [patterns]\n---\nThis body mentions weapon weapon weapon a few times',
    );
    const entries = await loadKnowledgeBase(kbRoot);
    const ranked = rankEntries(entries, 'weapon');
    expect(ranked[0]?.entry.title).toBe('Weapon Schemas');
  });

  it('boosts entries matching entity types', async () => {
    await writeEntry(
      'profession.md',
      '---\ntitle: Profession Patterns\ntags: [profession, jobs]\n---\nbody',
    );
    await writeEntry(
      'unrelated.md',
      '---\ntitle: Audio System\ntags: [audio, sound]\n---\nbody',
    );
    const entries = await loadKnowledgeBase(kbRoot);
    // Generic query that doesn't directly match either, but entity types should boost.
    const ranked = rankEntries(entries, 'I need help', ['profession']);
    expect(ranked[0]?.entry.title).toBe('Profession Patterns');
  });

  it('returns empty array when nothing matches', async () => {
    await writeEntry('x.md', '---\ntitle: Apple\ntags: [fruit]\n---\nfruit body');
    const entries = await loadKnowledgeBase(kbRoot);
    const ranked = rankEntries(entries, 'completely unrelated zorbax');
    expect(ranked).toEqual([]);
  });

  it('filters stopwords from the query', async () => {
    await writeEntry('x.md', '---\ntitle: Real Entry\ntags: [real]\n---\nbody');
    const entries = await loadKnowledgeBase(kbRoot);
    // "the" and "is" alone shouldn't match anything (stopwords).
    const ranked = rankEntries(entries, 'the is on at');
    expect(ranked).toEqual([]);
  });
});

describe('formatRagContext', () => {
  it('formats top-K entries as a system prompt block', async () => {
    await writeEntry('a.md', '---\ntitle: A\ntags: [foo]\n---\nA body');
    await writeEntry('b.md', '---\ntitle: B\ntags: [foo]\n---\nB body');
    const entries = await loadKnowledgeBase(kbRoot);
    const ranked = rankEntries(entries, 'foo');
    const ctx = formatRagContext(ranked, 2);
    expect(ctx).toContain('Reference 1:');
    expect(ctx).toContain('Reference 2:');
    expect(ctx).toContain('Boilergen knowledge base');
  });

  it('returns empty string when no entries match', () => {
    const ctx = formatRagContext([], 3);
    expect(ctx).toBe('');
  });

  it('truncates long bodies to keep prompt budget reasonable', async () => {
    const longBody = 'lorem '.repeat(500); // ~3000 chars
    await writeEntry('long.md', `---\ntitle: Long\ntags: [foo]\n---\n${longBody}`);
    const entries = await loadKnowledgeBase(kbRoot);
    const ranked = rankEntries(entries, 'foo');
    const ctx = formatRagContext(ranked, 1);
    expect(ctx).toContain('truncated');
    expect(ctx.length).toBeLessThan(2000);
  });
});

describe('buildRagContext (integration)', () => {
  it('end-to-end: load + rank + format with sources', async () => {
    await writeEntry(
      'engines/fivem.md',
      `---
type: engine
title: FiveM Resources
slug: fivem
tags: [fivem, lua, jobs, rp, grades]
---

# FiveM

Jobs in FiveM use tiered grades.`,
    );
    await writeEntry(
      'engines/godot.md',
      `---
type: engine
title: Godot Resources
slug: godot
tags: [godot, tres]
---

Godot uses .tres files.`,
    );
    const result = await buildRagContext(kbRoot, 'new fivem job with grades');
    expect(result.context).toContain('FiveM');
    expect(result.context).toContain('grades');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]?.title).toBe('FiveM Resources');
    expect(result.sources[0]?.score).toBeGreaterThan(0);
  });

  it('degrades gracefully when KB does not exist (RAG must never block AI Describe)', async () => {
    const result = await buildRagContext('/nonexistent/path', 'anything');
    expect(result.context).toBe('');
    expect(result.sources).toEqual([]);
  });
});
