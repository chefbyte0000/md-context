import type { FileEntry, ProjectType } from './types';

export interface FilterPreset {
  id: string;
  label: string;
  description: string;
  // Glob-ish matchers (use simple substring or extension match)
  excludeGlobs: string[];
}

export interface ProjectPresets {
  type: ProjectType;
  label: string;
  presets: FilterPreset[];
  defaultExcludeGlobs: string[];
}

export function detectProjectType(
  files: Map<string, FileEntry>,
  pkg: Record<string, unknown> | null,
): ProjectType {
  const deps = collectDeps(pkg);
  if (deps.has('svelte') || deps.has('@sveltejs/kit') || hasFileWithExt(files, 'svelte')) return 'svelte';
  if (deps.has('react') || deps.has('next') || deps.has('react-dom') || hasFileWithExt(files, 'tsx') || hasFileWithExt(files, 'jsx')) return 'react';
  return 'unknown';
}

function collectDeps(pkg: Record<string, unknown> | null): Set<string> {
  const out = new Set<string>();
  if (!pkg) return out;
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const v = pkg[key] as Record<string, string> | undefined;
    if (v) for (const k of Object.keys(v)) out.add(k);
  }
  return out;
}

function hasFileWithExt(files: Map<string, FileEntry>, ext: string): boolean {
  const suffix = '.' + ext;
  for (const k of files.keys()) if (k.endsWith(suffix)) return true;
  return false;
}

const COMMON_EXCLUDES = [
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
  '.gitignore', '.gitattributes', '.editorconfig', 'LICENSE', 'LICENCE',
];

export function getProjectPresets(type: ProjectType): ProjectPresets {
  if (type === 'svelte') {
    return {
      type,
      label: 'Svelte / SvelteKit',
      defaultExcludeGlobs: [...COMMON_EXCLUDES, 'static/', '.svelte-kit/', 'tests/', 'e2e/'],
      presets: [
        {
          id: 'source-only',
          label: 'Source only',
          description: 'Just src/ — components, routes, lib',
          excludeGlobs: ['!src/'],
        },
        {
          id: 'routes',
          label: 'Routes & pages',
          description: 'src/routes and src/lib referenced by them',
          excludeGlobs: ['!src/routes/', '!src/lib/'],
        },
        {
          id: 'components',
          label: 'Components only',
          description: 'Just .svelte component files',
          excludeGlobs: ['ext:!svelte'],
        },
        {
          id: 'config',
          label: 'Config files',
          description: 'svelte.config, vite.config, tsconfig, package.json',
          excludeGlobs: ['!svelte.config', '!vite.config', '!tsconfig', '!package.json'],
        },
        {
          id: 'no-tests',
          label: 'Exclude tests',
          description: 'Skip *.test.* and *.spec.* files',
          excludeGlobs: ['.test.', '.spec.', '__tests__/'],
        },
      ],
    };
  }
  if (type === 'react') {
    return {
      type,
      label: 'React / Next.js',
      defaultExcludeGlobs: [...COMMON_EXCLUDES, 'public/', '.next/', 'tests/', '__tests__/'],
      presets: [
        {
          id: 'source-only',
          label: 'Source only',
          description: 'Just src/ or app/',
          excludeGlobs: ['!src/', '!app/'],
        },
        {
          id: 'pages',
          label: 'Pages & routes',
          description: 'pages/, app/, components used by them',
          excludeGlobs: ['!pages/', '!app/', '!src/pages/', '!src/app/'],
        },
        {
          id: 'components',
          label: 'Components only',
          description: '.tsx and .jsx files',
          excludeGlobs: ['ext:!tsx', 'ext:!jsx'],
        },
        {
          id: 'config',
          label: 'Config files',
          description: 'next.config, vite.config, tsconfig, package.json',
          excludeGlobs: ['!next.config', '!vite.config', '!tsconfig', '!package.json'],
        },
        {
          id: 'no-tests',
          label: 'Exclude tests',
          description: 'Skip *.test.* and *.spec.* files',
          excludeGlobs: ['.test.', '.spec.', '__tests__/'],
        },
      ],
    };
  }
  return {
    type: 'unknown',
    label: 'Generic project',
    defaultExcludeGlobs: [...COMMON_EXCLUDES],
    presets: [
      {
        id: 'no-tests',
        label: 'Exclude tests',
        description: 'Skip *.test.* and *.spec.* files',
        excludeGlobs: ['.test.', '.spec.', '__tests__/'],
      },
    ],
  };
}

/**
 * Match a file path against a glob token.
 * Tokens supported:
 *   "foo/"          → path starts with foo/
 *   "!foo/"         → keep ONLY paths starting with foo/ (whitelist)
 *   "ext:tsx"       → exclude files with extension tsx
 *   "ext:!tsx"      → keep ONLY files with extension tsx
 *   "substring"     → path contains substring
 *   "!substring"    → keep ONLY paths containing substring
 */
export interface CompiledFilter {
  excludeSubs: string[];
  excludeExts: string[];
  whitelistSubs: string[];
  whitelistExts: string[];
}

export function compileFilter(tokens: string[]): CompiledFilter {
  const out: CompiledFilter = { excludeSubs: [], excludeExts: [], whitelistSubs: [], whitelistExts: [] };
  for (const raw of tokens) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith('ext:')) {
      const rest = t.slice(4);
      if (rest.startsWith('!')) out.whitelistExts.push(rest.slice(1).toLowerCase());
      else out.excludeExts.push(rest.toLowerCase());
    } else if (t.startsWith('!')) {
      out.whitelistSubs.push(t.slice(1));
    } else {
      out.excludeSubs.push(t);
    }
  }
  return out;
}

export function pathPassesFilter(path: string, filter: CompiledFilter): boolean {
  const lower = path.toLowerCase();
  const ext = path.includes('.') ? path.split('.').pop()!.toLowerCase() : '';
  if (filter.whitelistExts.length && !filter.whitelistExts.includes(ext)) return false;
  if (filter.whitelistSubs.length && !filter.whitelistSubs.some((s) => path.includes(s))) return false;
  if (filter.excludeExts.includes(ext)) return false;
  for (const sub of filter.excludeSubs) if (lower.includes(sub.toLowerCase())) return false;
  return true;
}
