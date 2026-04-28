import type { Codebase } from './types';

const LANG_BY_EXT: Record<string, string> = {
  ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx', mjs: 'js', cjs: 'js',
  svelte: 'svelte', vue: 'vue', astro: 'astro',
  json: 'json', jsonc: 'json', json5: 'json5',
  md: 'md', mdx: 'mdx', markdown: 'md',
  css: 'css', scss: 'scss', sass: 'sass', less: 'less', pcss: 'css',
  html: 'html', htm: 'html', svg: 'svg',
  yml: 'yaml', yaml: 'yaml', toml: 'toml',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  c: 'c', cc: 'cpp', cpp: 'cpp', h: 'c', hpp: 'cpp',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  sql: 'sql', graphql: 'graphql', gql: 'graphql', prisma: 'prisma',
  php: 'php', lua: 'lua', kt: 'kotlin', swift: 'swift',
};

function langForPath(path: string): string {
  const base = path.split('/').pop() ?? '';
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : '';
  return LANG_BY_EXT[ext] ?? '';
}

function fenceFor(text: string): string {
  // Pick a fence longer than the longest run of backticks in the content
  let max = 0;
  const re = /`+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) max = Math.max(max, m[0].length);
  return '`'.repeat(Math.max(3, max + 1));
}

export interface ExportOptions {
  includeTree: boolean;
  includeHeader: boolean;
  splitPerFile: boolean;
}

export function buildMarkdown(
  cb: Codebase,
  paths: string[],
  options: ExportOptions,
): string {
  const sorted = [...paths].sort();
  const parts: string[] = [];
  if (options.includeHeader) {
    parts.push(`# ${cb.rootName}`);
    parts.push('');
    parts.push(`- Project type: \`${cb.projectType}\``);
    parts.push(`- Files included: ${sorted.length}`);
    parts.push('');
  }
  if (options.includeTree) {
    parts.push('## File tree');
    parts.push('');
    parts.push('```');
    parts.push(renderAsciiTree(sorted));
    parts.push('```');
    parts.push('');
  }
  for (const path of sorted) {
    const file = cb.files.get(path);
    if (!file || file.binary) continue;
    const fence = fenceFor(file.text);
    parts.push(`## \`${path}\``);
    parts.push('');
    parts.push(`${fence}${langForPath(path)}`);
    parts.push(file.text);
    parts.push(fence);
    parts.push('');
  }
  return parts.join('\n');
}

export function buildPerFileMarkdown(
  cb: Codebase,
  paths: string[],
): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  for (const path of paths) {
    const file = cb.files.get(path);
    if (!file || file.binary) continue;
    const fence = fenceFor(file.text);
    const content = `# \`${path}\`\n\n${fence}${langForPath(path)}\n${file.text}\n${fence}\n`;
    out.push({ path: path + '.md', content });
  }
  return out;
}

function renderAsciiTree(paths: string[]): string {
  // Build a nested object then render
  type Node = { [k: string]: Node | null };
  const root: Node = {};
  for (const p of paths) {
    let cur = root;
    const segs = p.split('/');
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const last = i === segs.length - 1;
      if (last) cur[seg] = null;
      else {
        if (!cur[seg] || cur[seg] === null) cur[seg] = {};
        cur = cur[seg] as Node;
      }
    }
  }
  const lines: string[] = [];
  const walk = (node: Node, prefix: string) => {
    const keys = Object.keys(node).sort((a, b) => {
      const ad = node[a] !== null;
      const bd = node[b] !== null;
      if (ad !== bd) return ad ? -1 : 1;
      return a.localeCompare(b);
    });
    keys.forEach((key, i) => {
      const isLast = i === keys.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      lines.push(prefix + branch + key);
      const child = node[key];
      if (child) walk(child, prefix + (isLast ? '    ' : '│   '));
    });
  };
  walk(root, '');
  return lines.join('\n');
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
