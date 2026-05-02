// Minimal Lua-ish parser for fxmanifest.lua / __resource.lua.
//
// fxmanifest is technically Lua, but in practice it uses a narrow subset:
//
//   fx_version 'cerulean'
//   game 'gta5'
//   author 'Name'
//   description [[multi-line description]]
//   shared_scripts { '@ox_lib/init.lua', 'config.lua' }
//   client_scripts { 'client/main.lua' }
//   server_scripts { 'server/main.lua' }
//   dependencies { 'qb-core', 'oxmysql' }
//   dependency 'qb-core'
//   ui_page 'html/index.html'
//   files { 'html/*.html' }
//   -- single-line comment
//   --[[ multi-line
//        comment ]]
//
// We tokenise + recursive-descent against this subset. Anything we don't
// recognise is kept as a raw key with an unknown shape, never crashes the
// parser. Real-world fxmanifests sometimes have full Lua (loops, functions);
// we ignore that gracefully — they're rare enough that our linter just
// won't validate those resources.

export type FxValue =
  | { kind: 'string'; value: string }
  | { kind: 'array';  value: string[] }
  | { kind: 'unknown' };

export interface FxManifest {
  /** Map from key (lowercased) to its parsed value */
  fields: Map<string, FxValue>;
  /** All keys we saw, in source order — useful for "duplicate key" warnings */
  order: string[];
  /** Issues found while parsing — typically lexer errors */
  parseIssues: string[];
}

interface Token {
  type: 'ident' | 'string' | 'lbrace' | 'rbrace' | 'comma' | 'eof';
  value: string;
  line: number;
  col: number;
}

class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;
  readonly issues: string[] = [];

  constructor(private readonly src: string) {}

  peek(n = 0): string {
    return this.src[this.pos + n] ?? '';
  }

  private advance(n = 1): void {
    for (let i = 0; i < n; i++) {
      if (this.src[this.pos] === '\n') {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.pos++;
    }
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]!;
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        this.advance();
        continue;
      }
      // Line comment: -- ... \n
      if (c === '-' && this.peek(1) === '-') {
        // Block comment: --[[ ... ]]
        if (this.peek(2) === '[' && this.peek(3) === '[') {
          this.advance(4);
          while (this.pos < this.src.length) {
            if (this.peek() === ']' && this.peek(1) === ']') {
              this.advance(2);
              break;
            }
            this.advance();
          }
          continue;
        }
        // Line comment
        while (this.pos < this.src.length && this.peek() !== '\n') this.advance();
        continue;
      }
      break;
    }
  }

  private readString(): string | null {
    const quote = this.peek();
    // Long-bracket string: [[ ... ]]
    if (quote === '[' && this.peek(1) === '[') {
      this.advance(2);
      const start = this.pos;
      while (this.pos < this.src.length) {
        if (this.peek() === ']' && this.peek(1) === ']') {
          const value = this.src.slice(start, this.pos);
          this.advance(2);
          return value;
        }
        this.advance();
      }
      this.issues.push(`Unterminated [[long string]] starting at line ${this.line}`);
      return this.src.slice(start);
    }
    if (quote !== "'" && quote !== '"') return null;
    this.advance(); // consume opening quote
    let value = '';
    while (this.pos < this.src.length) {
      const c = this.peek();
      if (c === '\\') {
        const next = this.peek(1);
        if (next === 'n')      { value += '\n'; this.advance(2); }
        else if (next === 't') { value += '\t'; this.advance(2); }
        else if (next === '\\'){ value += '\\'; this.advance(2); }
        else if (next === quote) { value += quote; this.advance(2); }
        else                   { value += next; this.advance(2); }
        continue;
      }
      if (c === quote) {
        this.advance();
        return value;
      }
      if (c === '\n') {
        this.issues.push(`Unterminated string at line ${this.line}`);
        return value;
      }
      value += c;
      this.advance();
    }
    this.issues.push(`Unterminated string at end of file`);
    return value;
  }

  next(): Token {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.src.length) return { type: 'eof', value: '', line: this.line, col: this.col };

    const startLine = this.line;
    const startCol = this.col;
    const c = this.peek();

    if (c === '{') { this.advance(); return { type: 'lbrace', value: '{', line: startLine, col: startCol }; }
    if (c === '}') { this.advance(); return { type: 'rbrace', value: '}', line: startLine, col: startCol }; }
    if (c === ',') { this.advance(); return { type: 'comma',  value: ',', line: startLine, col: startCol }; }

    if (c === "'" || c === '"' || (c === '[' && this.peek(1) === '[')) {
      const value = this.readString();
      if (value === null) {
        this.advance(); // recover
        return { type: 'eof', value: '', line: startLine, col: startCol };
      }
      return { type: 'string', value, line: startLine, col: startCol };
    }

    // Identifier — Lua identifiers are [_a-zA-Z][_a-zA-Z0-9]*
    if (/[A-Za-z_]/.test(c)) {
      let value = '';
      while (this.pos < this.src.length && /[A-Za-z0-9_]/.test(this.peek())) {
        value += this.peek();
        this.advance();
      }
      return { type: 'ident', value, line: startLine, col: startCol };
    }

    // Unknown char — skip and continue (be liberal in what we accept)
    this.advance();
    return this.next();
  }
}

/**
 * Parse fxmanifest.lua source into a structured FxManifest.
 *
 * The grammar we recognise:
 *   stmt   := IDENT STRING        # e.g. fx_version 'cerulean'
 *           | IDENT '{' STRING (',' STRING)* ','? '}'  # arrays
 *   we ignore everything else (full Lua — loops, conditionals, fn defs).
 */
export function parseFxManifest(source: string): FxManifest {
  const lex = new Lexer(source);
  const fields = new Map<string, FxValue>();
  const order: string[] = [];

  let tok = lex.next();

  function set(key: string, value: FxValue): void {
    if (!fields.has(key)) order.push(key);
    fields.set(key, value);
  }

  while (tok.type !== 'eof') {
    if (tok.type !== 'ident') {
      tok = lex.next();
      continue;
    }
    const key = tok.value.toLowerCase();
    const next = lex.next();

    if (next.type === 'string') {
      set(key, { kind: 'string', value: next.value });
      tok = lex.next();
      continue;
    }

    if (next.type === 'lbrace') {
      const arr: string[] = [];
      let depth = 1;
      let inner = lex.next();
      while (depth > 0 && inner.type !== 'eof') {
        if (inner.type === 'lbrace') {
          // Nested table — skip without recording. We mark this key 'unknown'.
          depth++;
          set(key, { kind: 'unknown' });
          inner = lex.next();
          continue;
        }
        if (inner.type === 'rbrace') {
          depth--;
          inner = lex.next();
          continue;
        }
        if (inner.type === 'string') {
          arr.push(inner.value);
          inner = lex.next();
          continue;
        }
        // Skip commas, identifiers, anything else
        inner = lex.next();
      }
      if (!fields.has(key) || fields.get(key)!.kind !== 'unknown') {
        set(key, { kind: 'array', value: arr });
      }
      tok = inner;
      continue;
    }

    // Some other shape we don't recognise — record as unknown, advance.
    set(key, { kind: 'unknown' });
    tok = next;
  }

  return { fields, order, parseIssues: lex.issues };
}

/** Convenience: get a string field, undefined if absent or wrong shape. */
export function getString(m: FxManifest, key: string): string | undefined {
  const v = m.fields.get(key.toLowerCase());
  return v?.kind === 'string' ? v.value : undefined;
}

/** Convenience: get an array field as string[]; falls back to single-string treated as 1-element. */
export function getArray(m: FxManifest, key: string): string[] {
  const v = m.fields.get(key.toLowerCase());
  if (!v) return [];
  if (v.kind === 'array')  return v.value;
  if (v.kind === 'string') return [v.value];
  return [];
}
