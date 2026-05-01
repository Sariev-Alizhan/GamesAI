import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import yaml from 'js-yaml';

function tokenize(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function pascalCase(input: string): string {
  return tokenize(input)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join('');
}

function camelCase(input: string): string {
  const tokens = tokenize(input);
  if (tokens.length === 0) return '';
  const [first, ...rest] = tokens;
  return (
    (first ?? '') +
    rest.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('')
  );
}

function snakeCase(input: string): string {
  return tokenize(input).join('_');
}

function kebabCase(input: string): string {
  return tokenize(input).join('-');
}

function constantCase(input: string): string {
  return tokenize(input).map((t) => t.toUpperCase()).join('_');
}

const handlebars = Handlebars.create();

handlebars.registerHelper('pascalCase', (s: unknown) => pascalCase(String(s)));
handlebars.registerHelper('camelCase', (s: unknown) => camelCase(String(s)));
handlebars.registerHelper('snakeCase', (s: unknown) => snakeCase(String(s)));
handlebars.registerHelper('kebabCase', (s: unknown) => kebabCase(String(s)));
handlebars.registerHelper('constantCase', (s: unknown) => constantCase(String(s)));
handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b);

export function renderString(template: string, data: object): string {
  return handlebars.compile(template, { noEscape: true })(data);
}

export function parseFrontmatter(content: string): {
  frontmatter: unknown;
  body: string;
} {
  if (!content.startsWith('---\n')) {
    return { frontmatter: null, body: content };
  }
  const endIdx = content.indexOf('\n---\n', 4);
  if (endIdx === -1) {
    return { frontmatter: null, body: content };
  }
  const frontmatterText = content.slice(4, endIdx);
  let parsed: unknown;
  try {
    parsed = yaml.load(frontmatterText);
  } catch {
    return { frontmatter: null, body: content };
  }
  return { frontmatter: parsed, body: content.slice(endIdx + 5) };
}

export async function renderFile(absPath: string, data: object): Promise<string> {
  const content = await readFile(absPath, 'utf-8');
  const { body } = parseFrontmatter(content);
  return renderString(body, data);
}
