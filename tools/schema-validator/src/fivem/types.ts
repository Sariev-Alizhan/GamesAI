// Types for FiveM resource validation.
//
// Different from the YAML/JSON game-data validator (`core/types.ts`):
// FiveM mode operates on a directory of resources, each with its own
// fxmanifest.lua + source files referenced by it. Validation is a mix of
// (a) parsing manifests, (b) cross-referencing dependencies against folder
// names, (c) checking referenced files exist on disk.

import type { FxManifest } from './parser.js';

/** One FiveM resource = one folder containing fxmanifest.lua (or __resource.lua). */
export interface FxResource {
  /** Folder name as it lives on disk — case-sensitive. */
  name: string;
  /** Absolute path to the resource folder. */
  path: string;
  /** Path to the manifest file we parsed (relative to resource path). */
  manifestFile: string;
  /** Parsed manifest, or null if we couldn't read it. */
  manifest: FxManifest | null;
}

export type FxIssueCategory =
  | 'missing-manifest'        // folder has no fxmanifest.lua / __resource.lua
  | 'manifest-parse-error'    // lexer or required field issue
  | 'missing-required-field'  // fx_version or game absent
  | 'unknown-game'            // game value is not 'gta5' / 'rdr3' / 'common'
  | 'dependency-not-found'    // dependencies { 'qb-core' } but no folder exists
  | 'dependency-case-mismatch'// folder is 'QB-Core', manifest says 'qb-core' (Linux footgun)
  | 'missing-script-file'     // client_scripts referenced file doesn't exist
  | 'cross-resource-no-dep'   // referenced @other-resource/file but other-resource not in deps
  | 'duplicate-resource';     // same folder name appears twice (case-different)

export type FxIssueSeverity = 'error' | 'warning';

export interface FxIssue {
  severity: FxIssueSeverity;
  category: FxIssueCategory;
  /** Resource the issue belongs to (folder name). May be empty for tree-wide issues. */
  resource: string;
  /** Human-readable message — what's wrong + what to do. */
  message: string;
  /** Optional concrete file/path that triggered the issue. */
  path?: string;
  /** Free-form structured detail per category. */
  details?: Record<string, unknown>;
}

export interface FxValidationResult {
  resources: FxResource[];
  issues: FxIssue[];
  stats: {
    totalResources: number;
    totalDependencies: number;
    totalScriptReferences: number;
    errors: number;
    warnings: number;
  };
}

export interface FxValidatorConfig {
  /**
   * Glob-like patterns NOT to flag as missing — useful when a manifest references
   * a globbed file like 'html/**\/*.png' and you can't easily expand it.
   * For v1 we always treat values containing '*' as wildcards and skip them.
   */
  /**
   * Allowed game values. Default: gta5, rdr3, common.
   */
  allowedGames?: string[];
}
