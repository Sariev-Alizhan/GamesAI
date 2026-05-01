export interface Schema {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
}

export interface InjectSpec {
  mode: 'after' | 'before';
  to: string;
  anchor: string;
  skipIf?: string;
}

export interface Template {
  absPath: string;
  target: string;
  entityType: string;
  outputRelPath: string;
  inject?: InjectSpec;
}

export interface Plugin {
  id: string;
  rootDir: string;
  templates: Template[];
}
