export interface Schema {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
}

export interface Template {
  absPath: string;
  target: string;
  outputRelPath: string;
}

export interface Plugin {
  id: string;
  rootDir: string;
  templates: Template[];
}
