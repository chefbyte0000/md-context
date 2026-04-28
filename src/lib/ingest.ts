import { unzip, type Unzipped } from 'fflate';
import type { Codebase, FileEntry, ProjectType } from './types';
import { detectProjectType } from './projectType';

const TEXT_EXT = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'svelte', 'vue', 'astro',
  'json', 'jsonc', 'json5', 'md', 'mdx', 'markdown', 'txt',
  'css', 'scss', 'sass', 'less', 'pcss', 'postcss', 'html', 'htm',
  'yml', 'yaml', 'toml', 'ini', 'env', 'sh', 'bash', 'zsh', 'fish',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'cc', 'cpp', 'h', 'hpp',
  'php', 'lua', 'sql', 'graphql', 'gql', 'prisma', 'svg',
  'gitignore', 'gitattributes', 'editorconfig', 'prettierrc', 'eslintrc',
  'npmrc', 'nvmrc', 'browserslistrc', 'dockerignore',
]);

const NEVER_DESCEND = new Set([
  'node_modules', '.git', '.svelte-kit', '.next', 'dist', 'build',
  '.turbo', '.vercel', '.netlify', 'out', 'coverage', '.cache',
  '.parcel-cache', '.pnpm-store', '.yarn', '__pycache__',
]);

const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2MB per file

function isTextPath(path: string): boolean {
  const base = path.split('/').pop() ?? '';
  if (base.startsWith('.') && !base.includes('.', 1)) {
    // dotfiles like .gitignore, .env
    return TEXT_EXT.has(base.slice(1));
  }
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : '';
  return TEXT_EXT.has(ext);
}

function shouldSkipPath(parts: string[]): boolean {
  return parts.some((p) => NEVER_DESCEND.has(p));
}

function decodeText(bytes: Uint8Array): { text: string; binary: boolean } {
  // Quick binary sniff: presence of NUL byte in first 8KB
  const sniffLen = Math.min(bytes.length, 8192);
  for (let i = 0; i < sniffLen; i++) if (bytes[i] === 0) return { text: '', binary: true };
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return { text, binary: false };
  } catch {
    return { text: '', binary: true };
  }
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, unzipped) => {
      if (err) reject(err);
      else resolve(unzipped);
    });
  });
}

function commonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  // GitHub zips wrap everything in `repo-sha/`. Find that prefix.
  const first = paths[0].split('/')[0] + '/';
  return paths.every((p) => p.startsWith(first)) ? first : '';
}

export async function ingestZip(
  data: Uint8Array,
  rootName: string,
  onProgress?: (msg: string) => void,
): Promise<Codebase> {
  onProgress?.('Decompressing archive…');
  const unzipped = await unzipAsync(data);

  const allPaths = Object.keys(unzipped).filter((p) => !p.endsWith('/'));
  const prefix = commonPrefix(allPaths);

  const files = new Map<string, FileEntry>();
  let packageJson: Record<string, unknown> | null = null;

  let processed = 0;
  for (const fullPath of allPaths) {
    const rel = prefix ? fullPath.slice(prefix.length) : fullPath;
    if (!rel) continue;
    const parts = rel.split('/');
    if (shouldSkipPath(parts)) continue;
    const bytes = unzipped[fullPath];
    if (!bytes) continue;

    const isText = isTextPath(rel) && bytes.length <= MAX_TEXT_BYTES;
    let text = '';
    let binary = !isText;
    if (isText) {
      const decoded = decodeText(bytes);
      text = decoded.text;
      binary = decoded.binary;
    }

    files.set(rel, { path: rel, size: bytes.length, text, binary });

    if (rel === 'package.json' && !binary) {
      try { packageJson = JSON.parse(text); } catch { /* ignore */ }
    }

    processed++;
    if (processed % 200 === 0) onProgress?.(`Indexed ${processed} files…`);
  }

  onProgress?.(`Indexed ${files.size} files`);
  const projectType: ProjectType = detectProjectType(files, packageJson);

  return { rootName, files, projectType, packageJson };
}

export async function ingestZipFile(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<Codebase> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const root = file.name.replace(/\.zip$/i, '') || 'project';
  return ingestZip(buf, root, onProgress);
}

interface GithubRef {
  owner: string;
  repo: string;
  ref?: string;
}

export function parseGithubUrl(input: string): GithubRef | null {
  const trimmed = input.trim();
  // Accept owner/repo, owner/repo@branch, full URLs
  const atMatch = /^([^\s/@]+)\/([^\s/@]+?)(?:@([^\s]+))?$/.exec(trimmed);
  if (atMatch) return { owner: atMatch[1], repo: atMatch[2].replace(/\.git$/, ''), ref: atMatch[3] };
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!/github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    let ref: string | undefined;
    // /owner/repo/tree/<ref>/...
    if (parts[2] === 'tree' && parts[3]) ref = parts.slice(3).join('/');
    return { owner, repo, ref };
  } catch {
    return null;
  }
}

export async function ingestGithub(
  input: string,
  token: string | null,
  onProgress?: (msg: string) => void,
): Promise<Codebase> {
  const ref = parseGithubUrl(input);
  if (!ref) throw new Error('Could not parse GitHub repository. Use owner/repo or a full URL.');

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Resolve default branch if no ref provided
  let branch = ref.ref;
  if (!branch) {
    onProgress?.('Resolving default branch…');
    const r = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}`, { headers });
    if (!r.ok) throw new Error(`GitHub API: ${r.status} ${r.statusText}`);
    const meta = await r.json();
    branch = meta.default_branch as string;
  }

  onProgress?.(`Downloading ${ref.owner}/${ref.repo}@${branch}…`);
  const zipUrl = `https://api.github.com/repos/${ref.owner}/${ref.repo}/zipball/${encodeURIComponent(branch)}`;
  const zr = await fetch(zipUrl, { headers });
  if (!zr.ok) throw new Error(`Failed to download archive: ${zr.status} ${zr.statusText}`);
  const buf = new Uint8Array(await zr.arrayBuffer());
  return ingestZip(buf, `${ref.owner}-${ref.repo}`, onProgress);
}
