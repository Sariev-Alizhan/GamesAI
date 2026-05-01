// AI-powered natural language → YAML schema conversion using Claude.
// Lets a non-technical user (e.g. a game designer) describe an entity
// in plain Russian/English/whatever, and get back a valid Boilergen YAML.
//
// Uses prompt caching on the system prompt (stable across all requests)
// so repeat invocations cost ~10% of the first one.
//
// Now augmented with a RAG layer: relevant entries from the project
// knowledge-base are retrieved by keyword scoring and injected into the
// system prompt, so the AI grounds its YAML in real game-dev patterns
// (e.g. "RP jobs use tiered grades, not flat baseSalary") instead of
// inventing field shapes.

import Anthropic from '@anthropic-ai/sdk';
import { buildRagContext } from './rag.js';

const SYSTEM_PROMPT_BASE = `You are a YAML schema generator for Boilergen, a code-generation tool for game development.

Your job: convert a natural-language description of a game entity (in any language — Russian, English, etc.) into a valid Boilergen YAML schema.

# Schema format (strict)

\`\`\`yaml
id: snake_case_identifier        # required, lowercase, ASCII letters/digits/underscores only
type: <entity-type>              # required, must match one of the available types provided
name: <human-readable name>      # required, any language (Cyrillic OK), descriptive
data:                            # required, free-form object with entity-specific fields
  field1: value
  field2: value
\`\`\`

# Rules

1. Output ONLY raw YAML. No explanations. No code fences (no \`\`\`). No "Here is your schema:" preamble. Start directly with \`id:\`.
2. \`id\` must be valid snake_case: lowercase ASCII letters, digits, underscores. Translate Russian/Cyrillic IDs to Latin transliteration (e.g. "таксист" → "taxi_driver").
3. \`type\` must be exactly one of the available entity types provided in the user's message. Do NOT invent new types.
4. \`name\` should be the human-readable name in the original language used by the user (preserve Cyrillic).
5. \`data\` fields should match the conventions for the entity type. **If the system prompt includes "Relevant patterns from the Boilergen knowledge base" below, prefer those field shapes** — they reflect real games and will produce more useful generated code than guessed defaults.
6. If the user's description is missing values, choose sensible defaults based on the entity type and any context they gave. Don't invent values for things they explicitly described.
7. Do NOT add fields outside the schema (no extra top-level keys). Boilergen runs in strict mode and will reject unknown keys.

# Examples (fallback patterns when no knowledge-base reference applies)

User: "новая профессия таксиста, базовая зарплата 500, категория транспорт"
Output:
id: taxi_driver
type: profession
name: Таксист
data:
  baseSalary: 500
  category: transport
  description: Возит пассажиров на такси

User: "AK-47 weapon, damage 45, fire rate 600 RPM, 30 round magazine"
Output:
id: ak47
type: weapon
name: AK-47
data:
  category: rifle
  damage: 45
  fireRate: 600
  magazineSize: 30
  range: 350
  reloadTime: 2.4
  price: 15000
  description: Kalashnikov assault rifle

User: "BMW M5 sedan, top speed 305 km/h, 4.4 seconds 0-100, 5 seats"
Output:
id: bmw_m5
type: vehicle
name: BMW M5
data:
  category: sedan
  topSpeed: 305
  acceleration: 4.4
  fuelTank: 68
  fuelConsumption: 12.5
  seats: 5
  trunkCapacity: 530
  price: 3000000
  description: High-performance sport sedan

# Failure mode

If the user's request cannot be turned into a valid schema for the available types (e.g. they describe a "cat" but the plugin only supports profession/weapon/vehicle), output a single line starting with \`# ERROR:\` followed by a one-sentence explanation of why. Do not attempt to force-fit.`;

export interface DescribeOptions {
  prompt: string;
  entityTypes: string[];
  apiKey?: string;
  /**
   * If set, the AI Describe call will pull relevant entries from this folder
   * (the project knowledge-base) and inject them into the system prompt as
   * grounding context. If unset or empty, falls back to no RAG.
   */
  knowledgeBaseRoot?: string;
}

export interface RagSource {
  title: string;
  path: string;
  score: number;
}

export interface DescribeResult {
  yaml: string;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
  /**
   * Knowledge-base entries the AI consulted via RAG. Empty array if RAG
   * was disabled, no KB exists, or no entries matched the query.
   */
  ragSources: RagSource[];
}

let cachedClient: Anthropic | null = null;

function getClient(apiKey?: string): Anthropic {
  if (apiKey) return new Anthropic({ apiKey });
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export async function describeToYaml(opts: DescribeOptions): Promise<DescribeResult> {
  const client = getClient(opts.apiKey);

  // RAG: pull relevant knowledge-base entries based on the prompt + entity types.
  let ragContext = '';
  let ragSources: RagSource[] = [];
  if (opts.knowledgeBaseRoot) {
    const rag = await buildRagContext(opts.knowledgeBaseRoot, opts.prompt, opts.entityTypes, 3);
    ragContext = rag.context;
    ragSources = rag.sources;
  }

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    {
      type: 'text',
      text: SYSTEM_PROMPT_BASE,
      cache_control: { type: 'ephemeral' },
    },
  ];

  // RAG context goes as a separate (uncached) block — it changes per query so
  // caching it would be useless and could thrash the cache for the base prompt.
  if (ragContext) {
    systemBlocks.push({
      type: 'text',
      text: ragContext,
    });
  }

  const userMessage = `Available entity types in this plugin: ${opts.entityTypes.join(', ')}.

Description: ${opts.prompt}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: systemBlocks,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract the text — there may be thinking blocks before it on Opus 4.7.
  let yaml = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      yaml += block.text;
    }
  }

  return {
    yaml: yaml.trim(),
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    ragSources,
  };
}
