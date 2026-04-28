import type { Codebase, ImportLayer } from './types';
import { compileFilter, getProjectPresets, pathPassesFilter, type FilterPreset } from './projectType';
import { buildImportLayers } from './imports';
import { buildTree } from './tree';

interface Store {
  codebase: Codebase | null;
  loading: boolean;
  loadError: string | null;
  progressMsg: string;
  selected: Set<string>;
  expanded: Set<string>;
  filterTokens: string[];
  activePresets: Set<string>;
  importLayers: ImportLayer[];
  layerDepth: number;
}

function createStore() {
  let codebase = $state<Codebase | null>(null);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let progressMsg = $state('');
  let selected = $state<Set<string>>(new Set());
  let expanded = $state<Set<string>>(new Set());
  let filterTokens = $state<string[]>([]);
  let activePresets = $state<Set<string>>(new Set());
  let importLayers = $state<ImportLayer[]>([]);
  let layerDepth = $state(3);

  // Derived: filtered file paths
  const filteredPaths = $derived.by(() => {
    if (!codebase) return [] as string[];
    const filter = compileFilter(filterTokens);
    const out: string[] = [];
    for (const p of codebase.files.keys()) {
      if (pathPassesFilter(p, filter)) out.push(p);
    }
    out.sort();
    return out;
  });

  const tree = $derived.by(() => buildTree(filteredPaths));

  const presets = $derived.by(() => {
    if (!codebase) return null;
    return getProjectPresets(codebase.projectType);
  });

  function setCodebase(cb: Codebase) {
    codebase = cb;
    selected = new Set();
    importLayers = [];
    expanded = new Set();
    // Auto-expand the root level
    for (const p of cb.files.keys()) {
      const top = p.split('/')[0];
      if (top && p.includes('/')) expanded.add(top);
    }
    expanded = new Set(expanded);
    // Apply default excludes from preset
    const pre = getProjectPresets(cb.projectType);
    filterTokens = [...pre.defaultExcludeGlobs];
    activePresets = new Set();
  }

  function toggleExpanded(path: string) {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    expanded = next;
  }

  function expandAll(paths: string[]) {
    const next = new Set(expanded);
    for (const p of paths) next.add(p);
    expanded = next;
  }

  function setSelected(paths: Iterable<string>, value: boolean) {
    const next = new Set(selected);
    if (value) for (const p of paths) next.add(p);
    else for (const p of paths) next.delete(p);
    selected = next;
  }

  function clearSelection() {
    selected = new Set();
    importLayers = [];
  }

  function togglePreset(preset: FilterPreset) {
    const next = new Set(activePresets);
    let tokens = [...filterTokens];
    if (next.has(preset.id)) {
      next.delete(preset.id);
      tokens = tokens.filter((t) => !preset.excludeGlobs.includes(t));
    } else {
      next.add(preset.id);
      for (const g of preset.excludeGlobs) if (!tokens.includes(g)) tokens.push(g);
    }
    activePresets = next;
    filterTokens = tokens;
  }

  function addFilterToken(t: string) {
    const v = t.trim();
    if (!v) return;
    if (filterTokens.includes(v)) return;
    filterTokens = [...filterTokens, v];
  }

  function removeFilterToken(t: string) {
    filterTokens = filterTokens.filter((x) => x !== t);
  }

  function computeImportLayers() {
    if (!codebase || selected.size === 0) {
      importLayers = [];
      return;
    }
    importLayers = buildImportLayers(codebase, [...selected], layerDepth);
  }

  function addLayerToSelection(layerIdx: number) {
    const layer = importLayers[layerIdx];
    if (!layer) return;
    setSelected(layer.files, true);
  }

  function addAllLayersToSelection() {
    const allFiles: string[] = [];
    for (const l of importLayers) for (const f of l.files) allFiles.push(f);
    setSelected(allFiles, true);
  }

  return {
    get codebase() { return codebase; },
    get loading() { return loading; },
    set loading(v: boolean) { loading = v; },
    get loadError() { return loadError; },
    set loadError(v: string | null) { loadError = v; },
    get progressMsg() { return progressMsg; },
    set progressMsg(v: string) { progressMsg = v; },
    get selected() { return selected; },
    get expanded() { return expanded; },
    get filterTokens() { return filterTokens; },
    get activePresets() { return activePresets; },
    get importLayers() { return importLayers; },
    get layerDepth() { return layerDepth; },
    set layerDepth(v: number) { layerDepth = v; },
    get filteredPaths() { return filteredPaths; },
    get tree() { return tree; },
    get presets() { return presets; },
    setCodebase,
    toggleExpanded,
    expandAll,
    setSelected,
    clearSelection,
    togglePreset,
    addFilterToken,
    removeFilterToken,
    computeImportLayers,
    addLayerToSelection,
    addAllLayersToSelection,
  };
}

export type AppStore = ReturnType<typeof createStore>;
export const store = createStore();
