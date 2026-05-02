// Validator for FiveM resources. Composes:
//   1. Walk a resources directory, find every fxmanifest.lua (or legacy
//      __resource.lua).
//   2. Parse each manifest.
//   3. Run rules: missing required fields, deps that don't match a folder
//      case-sensitively, referenced script files that don't exist, cross-
//      resource references via '@other/file.lua' without matching dep.
//
// Filesystem-aware. Used by `schema-validator check-fivem <dir>`.

import { access, readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { getArray, getString, parseFxManifest } from './parser.js';
import type { FxIssue, FxResource, FxValidationResult, FxValidatorConfig } from './types.js';

const SCRIPT_FIELDS = ['client_scripts', 'server_scripts', 'shared_scripts', 'files'] as const;
const DEFAULT_ALLOWED_GAMES = ['gta5', 'rdr3', 'common'];

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

/**
 * Pick the manifest file in a resource folder. Modern FiveM uses
 * fxmanifest.lua; legacy resources use __resource.lua. Some shipped
 * resources have both (we pick fxmanifest in that case).
 */
async function findManifestFile(resourceDir: string): Promise<string | null> {
  const candidates = ['fxmanifest.lua', '__resource.lua'];
  for (const c of candidates) {
    if (await fileExists(join(resourceDir, c))) return c;
  }
  return null;
}

/**
 * Discover all resources in a directory tree. We treat any folder containing
 * a manifest file as a resource; subfolders without one are categorisation
 * folders ([qb], [standalone]) and we recurse into them.
 *
 * Returns the resources flat — categorisation folders are not preserved.
 */
async function discoverResources(rootDir: string): Promise<FxResource[]> {
  const out: FxResource[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    // First — is THIS folder a resource?
    const manifestFile = await findManifestFile(dir);
    if (manifestFile) {
      const name = dir.split(sep).filter(Boolean).pop() ?? '';
      const source = await readFile(join(dir, manifestFile), 'utf-8');
      let manifest;
      try { manifest = parseFxManifest(source); } catch { manifest = null; }
      out.push({ name, path: dir, manifestFile, manifest });
      return; // resources don't nest — treat children as resource-internal
    }

    // Otherwise recurse — this is a categorisation folder
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('.')) continue;
      if (e.name === 'node_modules') continue;
      await walk(join(dir, e.name));
    }
  }

  await walk(rootDir);
  return out;
}

function isWildcard(p: string): boolean {
  return p.includes('*') || p.includes('?');
}

/** Strip the resource-prefix from '@other/path.lua' → ['other', 'path.lua']; null if no prefix. */
function parseAtPrefix(scriptPath: string): { resource: string; rest: string } | null {
  if (!scriptPath.startsWith('@')) return null;
  const rest = scriptPath.slice(1);
  const slash = rest.indexOf('/');
  if (slash === -1) return { resource: rest, rest: '' };
  return { resource: rest.slice(0, slash), rest: rest.slice(slash + 1) };
}

export async function validateFiveMResources(
  rootDir: string,
  config: FxValidatorConfig = {},
): Promise<FxValidationResult> {
  const resources = await discoverResources(rootDir);
  const issues: FxIssue[] = [];
  const allowedGames = config.allowedGames ?? DEFAULT_ALLOWED_GAMES;

  // Build a name→resource map (case-sensitive) and a lowercase-name→resources map for case-mismatch detection.
  const byNameExact = new Map<string, FxResource>();
  const byNameLower = new Map<string, FxResource[]>();
  for (const r of resources) {
    if (byNameExact.has(r.name)) {
      // Two folders with the EXACT same name shouldn't happen via filesystem,
      // but with categorisation folders (e.g. [qb]/qb-core AND [standalone]/qb-core) it can.
      issues.push({
        severity: 'error',
        category: 'duplicate-resource',
        resource: r.name,
        message: `Resource folder name "${r.name}" appears more than once in the tree (categorisation folders [qb], [standalone] etc. share the namespace)`,
        path: r.path,
      });
    }
    byNameExact.set(r.name, r);
    const lc = r.name.toLowerCase();
    const list = byNameLower.get(lc) ?? [];
    list.push(r);
    byNameLower.set(lc, list);
  }

  let totalDeps = 0;
  let totalScriptRefs = 0;

  for (const r of resources) {
    if (!r.manifest) {
      issues.push({
        severity: 'error',
        category: 'missing-manifest',
        resource: r.name,
        message: `Could not read manifest at ${r.manifestFile}`,
        path: r.path,
      });
      continue;
    }

    for (const pe of r.manifest.parseIssues) {
      issues.push({
        severity: 'warning',
        category: 'manifest-parse-error',
        resource: r.name,
        message: pe,
        path: join(r.path, r.manifestFile),
      });
    }

    // Required: fx_version, game
    if (getString(r.manifest, 'fx_version') === undefined) {
      issues.push({
        severity: 'error',
        category: 'missing-required-field',
        resource: r.name,
        message: `${r.manifestFile} missing required field "fx_version"`,
        path: join(r.path, r.manifestFile),
        details: { field: 'fx_version' },
      });
    }
    const game = getString(r.manifest, 'game');
    if (game === undefined) {
      issues.push({
        severity: 'error',
        category: 'missing-required-field',
        resource: r.name,
        message: `${r.manifestFile} missing required field "game"`,
        path: join(r.path, r.manifestFile),
        details: { field: 'game' },
      });
    } else if (!allowedGames.includes(game)) {
      issues.push({
        severity: 'warning',
        category: 'unknown-game',
        resource: r.name,
        message: `game "${game}" is not in allowed list (${allowedGames.join(', ')})`,
        path: join(r.path, r.manifestFile),
        details: { value: game, allowed: allowedGames },
      });
    }

    // Dependencies
    const deps = [
      ...getArray(r.manifest, 'dependencies'),
      ...getArray(r.manifest, 'dependency'),
    ];
    totalDeps += deps.length;

    for (const dep of deps) {
      if (byNameExact.has(dep)) continue;
      // Case-insensitive match means folder exists but case is wrong (Linux footgun).
      const lcMatches = byNameLower.get(dep.toLowerCase());
      if (lcMatches && lcMatches.length > 0 && lcMatches[0]!.name !== dep) {
        issues.push({
          severity: 'error',
          category: 'dependency-case-mismatch',
          resource: r.name,
          message: `dependency "${dep}" — actual folder is "${lcMatches[0]!.name}" (case-sensitive on Linux runners)`,
          path: join(r.path, r.manifestFile),
          details: { declared: dep, actual: lcMatches[0]!.name },
        });
      } else {
        issues.push({
          severity: 'error',
          category: 'dependency-not-found',
          resource: r.name,
          message: `dependency "${dep}" — no resource with that name found in tree`,
          path: join(r.path, r.manifestFile),
          details: { dep },
        });
      }
    }

    // Script files: client_scripts, server_scripts, shared_scripts, files
    const declaredDeps = new Set([...deps]);
    for (const fieldName of SCRIPT_FIELDS) {
      const items = getArray(r.manifest, fieldName);
      totalScriptRefs += items.length;
      for (const item of items) {
        if (isWildcard(item)) continue; // skip glob patterns
        const at = parseAtPrefix(item);
        if (at) {
          // Cross-resource reference
          if (!declaredDeps.has(at.resource)) {
            issues.push({
              severity: 'warning',
              category: 'cross-resource-no-dep',
              resource: r.name,
              message: `${fieldName} references "@${at.resource}/..." but "${at.resource}" is not in dependencies`,
              path: join(r.path, r.manifestFile),
              details: { field: fieldName, item, missingDep: at.resource },
            });
          }
          // Verify the file exists in the other resource (if we know about it)
          const otherResource = byNameExact.get(at.resource);
          if (otherResource && at.rest && !isWildcard(at.rest)) {
            const expected = join(otherResource.path, at.rest);
            if (!await fileExists(expected)) {
              issues.push({
                severity: 'error',
                category: 'missing-script-file',
                resource: r.name,
                message: `${fieldName} references "@${at.resource}/${at.rest}" — file does not exist at ${expected}`,
                path: join(r.path, r.manifestFile),
                details: { field: fieldName, item, expected },
              });
            }
          }
          continue;
        }
        // Local script — must exist inside this resource folder
        const localPath = join(r.path, item);
        if (!await fileExists(localPath)) {
          issues.push({
            severity: 'error',
            category: 'missing-script-file',
            resource: r.name,
            message: `${fieldName} references "${item}" — file does not exist`,
            path: join(r.path, r.manifestFile),
            details: { field: fieldName, item, expected: localPath },
          });
        }
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  return {
    resources,
    issues,
    stats: {
      totalResources: resources.length,
      totalDependencies: totalDeps,
      totalScriptReferences: totalScriptRefs,
      errors,
      warnings,
    },
  };
}
