import type { TreeDir, TreeNode } from './types';

export function buildTree(paths: Iterable<string>): TreeDir {
  const root: TreeDir = { kind: 'dir', name: '', path: '', children: [] };
  // Use a map to avoid O(n) child lookup while building
  const dirMap = new Map<string, TreeDir>();
  dirMap.set('', root);

  for (const p of paths) {
    const parts = p.split('/');
    let parent = root;
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const isLast = i === parts.length - 1;
      acc = acc ? acc + '/' + seg : seg;
      if (isLast) {
        parent.children.push({ kind: 'file', name: seg, path: acc, size: 0 });
      } else {
        let dir = dirMap.get(acc);
        if (!dir) {
          dir = { kind: 'dir', name: seg, path: acc, children: [] };
          dirMap.set(acc, dir);
          parent.children.push(dir);
        }
        parent = dir;
      }
    }
  }
  sortTree(root);
  return root;
}

function sortTree(node: TreeDir) {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) if (c.kind === 'dir') sortTree(c);
}

export function flattenTree(
  root: TreeDir,
  expanded: Set<string>,
): { node: TreeNode; depth: number }[] {
  const out: { node: TreeNode; depth: number }[] = [];
  const walk = (node: TreeDir, depth: number) => {
    for (const child of node.children) {
      out.push({ node: child, depth });
      if (child.kind === 'dir' && expanded.has(child.path)) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

export function collectFiles(node: TreeNode): string[] {
  if (node.kind === 'file') return [node.path];
  const out: string[] = [];
  const walk = (n: TreeNode) => {
    if (n.kind === 'file') out.push(n.path);
    else for (const c of n.children) walk(c);
  };
  walk(node);
  return out;
}
