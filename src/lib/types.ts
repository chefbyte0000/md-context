export type ProjectType = 'svelte' | 'react' | 'unknown';

export interface FileEntry {
  path: string;
  size: number;
  text: string;
  binary: boolean;
}

export interface Codebase {
  rootName: string;
  files: Map<string, FileEntry>;
  projectType: ProjectType;
  packageJson: Record<string, unknown> | null;
}

export interface TreeDir {
  kind: 'dir';
  name: string;
  path: string;
  children: TreeNode[];
}
export interface TreeFile {
  kind: 'file';
  name: string;
  path: string;
  size: number;
}
export type TreeNode = TreeDir | TreeFile;

export interface ImportLayer {
  depth: number;
  files: string[];
}
