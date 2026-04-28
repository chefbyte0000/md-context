import type { Codebase, ImportLayer } from './types';

const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.svelte', '.vue', '.css', '.scss'];

// Match: import ... from 'x'  |  import 'x'  |  export ... from 'x'  |  require('x')  |  import('x')
// Captures the specifier in group 1 (single, double, or backtick quoted).
const IMPORT_RE =
  /(?:^|[\s;{(\[,])(?:import|export)\s*(?:[^'"`;()]*?)\s*from\s*['"`]([^'"`]+)['"`]|(?:^|[\s;{(\[,])import\s*['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)|import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

export function extractSpecifiers(source: string): string[] {
  const specs = new Set<string>();
  IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(source)) !== null) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (spec) specs.add(spec);
  }
  return [...specs];
}

interface AliasMap {
  // alias prefix → list of replacement prefixes (relative to project root, no leading slash)
  [alias: string]: string[];
}

function readTsconfigPaths(cb: Codebase): { baseUrl: string; aliases: AliasMap } {
  // Search a few common tsconfig locations
  const candidates = ['tsconfig.json', 'tsconfig.app.json', 'jsconfig.json'];
  let baseUrl = '';
  const aliases: AliasMap = {};
  for (const path of candidates) {
    const f = cb.files.get(path);
    if (!f || f.binary) continue;
    try {
      const json = JSON.parse(f.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));
      const co = json.compilerOptions ?? {};
      if (typeof co.baseUrl === 'string') baseUrl = co.baseUrl.replace(/^\.\//, '').replace(/\/$/, '');
      const paths = co.paths as Record<string, string[]> | undefined;
      if (paths) {
        for (const [k, v] of Object.entries(paths)) {
          aliases[k] = v.map((p) => p.replace(/^\.\//, ''));
        }
      }
    } catch { /* ignore */ }
  }
  // svelte.config.js: $lib defaults to src/lib
  if (cb.files.has('svelte.config.js') || cb.files.has('svelte.config.ts')) {
    if (!aliases['$lib'] && !aliases['$lib/*']) aliases['$lib/*'] = ['src/lib/*'];
  }
  return { baseUrl, aliases };
}

function joinPosix(base: string, rel: string): string {
  const parts = (base + '/' + rel).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

function tryResolve(cb: Codebase, candidate: string): string | null {
  if (cb.files.has(candidate)) return candidate;
  for (const ext of RESOLVE_EXTS) {
    if (cb.files.has(candidate + ext)) return candidate + ext;
  }
  for (const ext of RESOLVE_EXTS) {
    const p = candidate + '/index' + ext;
    if (cb.files.has(p)) return p;
  }
  return null;
}

function applyAlias(spec: string, aliases: AliasMap): string[] {
  const out: string[] = [];
  for (const [pattern, targets] of Object.entries(aliases)) {
    if (pattern.endsWith('/*')) {
      const head = pattern.slice(0, -2);
      if (spec === head || spec.startsWith(head + '/') || spec.startsWith(head)) {
        const tail = spec.slice(head.length).replace(/^\//, '');
        for (const t of targets) {
          const tHead = t.endsWith('/*') ? t.slice(0, -2) : t;
          out.push(tail ? tHead + '/' + tail : tHead);
        }
      }
    } else if (spec === pattern) {
      out.push(...targets);
    }
  }
  return out;
}

export function resolveSpecifier(
  cb: Codebase,
  fromPath: string,
  spec: string,
  cfg: { baseUrl: string; aliases: AliasMap },
): string | null {
  // External package
  if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('$')) {
    // Try alias first; otherwise external.
    const aliased = applyAlias(spec, cfg.aliases);
    for (const a of aliased) {
      const r = tryResolve(cb, a);
      if (r) return r;
    }
    if (cfg.baseUrl) {
      const r = tryResolve(cb, joinPosix(cfg.baseUrl, spec));
      if (r) return r;
    }
    return null;
  }
  if (spec.startsWith('$')) {
    const aliased = applyAlias(spec, cfg.aliases);
    for (const a of aliased) {
      const r = tryResolve(cb, a);
      if (r) return r;
    }
    return null;
  }
  // Relative
  const dir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : '';
  const candidate = joinPosix(dir, spec);
  return tryResolve(cb, candidate);
}

export function buildImportLayers(
  cb: Codebase,
  seedPaths: string[],
  maxDepth: number,
): ImportLayer[] {
  const cfg = readTsconfigPaths(cb);
  const seen = new Set<string>(seedPaths);
  const layers: ImportLayer[] = [];
  let frontier = [...seedPaths];

  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const nextSet = new Set<string>();
    for (const path of frontier) {
      const f = cb.files.get(path);
      if (!f || f.binary || !f.text) continue;
      const specs = extractSpecifiers(f.text);
      for (const spec of specs) {
        const resolved = resolveSpecifier(cb, path, spec, cfg);
        if (resolved && !seen.has(resolved)) nextSet.add(resolved);
      }
    }
    if (nextSet.size === 0) break;
    const arr = [...nextSet].sort();
    for (const p of arr) seen.add(p);
    layers.push({ depth, files: arr });
    frontier = arr;
  }
  return layers;
}
