<script lang="ts">
  import { store } from '../store.svelte';
  import { collectFiles, flattenTree } from '../tree';
  import { fuzzyMatch } from '../search';
  import type { TreeNode } from '../types';

  let query = $state('');
  let viewport: HTMLDivElement;
  let scrollTop = $state(0);
  let viewportHeight = $state(600);
  const ROW_H = 22;
  const OVERSCAN = 8;

  // Search results: flat list of files scored by fuzzy match
  const searchResults = $derived.by(() => {
    if (!query.trim()) return null;
    const q = query.trim();
    const results: { path: string; score: number; positions: number[] }[] = [];
    for (const path of store.filteredPaths) {
      const m = fuzzyMatch(q, path);
      if (m) results.push({ path, score: m.score, positions: m.positions });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 500);
  });

  // Flat list of currently-visible rows (when not searching)
  const flatRows = $derived.by(() => {
    if (searchResults) return null;
    return flattenTree(store.tree, store.expanded);
  });

  // Selected directory state: directory checkbox shows mixed/checked based on children
  function dirCheckState(node: TreeNode): 'none' | 'all' | 'some' {
    if (node.kind === 'file') {
      return store.selected.has(node.path) ? 'all' : 'none';
    }
    const files = collectFiles(node);
    if (files.length === 0) return 'none';
    let sel = 0;
    for (const f of files) if (store.selected.has(f)) sel++;
    if (sel === 0) return 'none';
    if (sel === files.length) return 'all';
    return 'some';
  }

  function onRowClick(node: TreeNode, e: MouseEvent) {
    if (node.kind === 'dir') {
      store.toggleExpanded(node.path);
      return;
    }
    const next = !store.selected.has(node.path);
    if (e.shiftKey) {
      // future: range select; for now same as click
    }
    store.setSelected([node.path], next);
  }

  function onCheckClick(node: TreeNode, e: MouseEvent) {
    e.stopPropagation();
    const files = collectFiles(node);
    const state = dirCheckState(node);
    store.setSelected(files, state !== 'all');
  }

  function highlight(path: string, positions: number[]): { ch: string; on: boolean }[] {
    const set = new Set(positions);
    const out: { ch: string; on: boolean }[] = [];
    for (let i = 0; i < path.length; i++) out.push({ ch: path[i], on: set.has(i) });
    return out;
  }

  $effect(() => {
    if (!viewport) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) viewportHeight = e.contentRect.height;
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  });

  function onScroll(e: Event) {
    scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
  }

  // Visible row range when in tree mode
  const visibleRange = $derived.by(() => {
    if (!flatRows) return null;
    const total = flatRows.length;
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
    const end = Math.min(total, Math.ceil((scrollTop + viewportHeight) / ROW_H) + OVERSCAN);
    return { start, end, total };
  });

  function selectAllVisible() {
    if (searchResults) store.setSelected(searchResults.map((r) => r.path), true);
    else store.setSelected(store.filteredPaths, true);
  }
</script>

<div class="tree-shell">
  <div class="search-row">
    <input
      type="search"
      placeholder="Search files…  (fuzzy)"
      bind:value={query}
      autocomplete="off"
      spellcheck="false"
    />
    <div class="actions">
      <button onclick={selectAllVisible} title="Select all visible">All</button>
      <button onclick={() => store.clearSelection()} title="Clear selection">None</button>
    </div>
  </div>

  <div class="meta">
    <span>{store.selected.size} selected</span>
    {#if searchResults}<span>· {searchResults.length} matches</span>{/if}
  </div>

  <div class="viewport" bind:this={viewport} onscroll={onScroll}>
    {#if searchResults}
      <div class="results">
        {#each searchResults as r (r.path)}
          {@const checked = store.selected.has(r.path)}
          <button
            class="row file"
            class:checked
            onclick={(e) => onRowClick({ kind: 'file', name: r.path.split('/').pop() ?? r.path, path: r.path, size: 0 }, e)}
          >
            <span
              class="check"
              role="checkbox"
              aria-checked={checked}
              tabindex="-1"
              onclick={(e) => onCheckClick({ kind: 'file', name: '', path: r.path, size: 0 }, e)}
              onkeydown={() => {}}
            >{checked ? '✓' : ''}</span>
            <span class="icon">📄</span>
            <span class="path">
              {#each highlight(r.path, r.positions) as part}
                <span class:hl={part.on}>{part.ch}</span>
              {/each}
            </span>
          </button>
        {/each}
        {#if searchResults.length === 0}
          <div class="empty">No matches</div>
        {/if}
      </div>
    {:else if flatRows && visibleRange}
      <div style:height="{flatRows.length * ROW_H}px" style:position="relative">
        <div style:transform="translateY({visibleRange.start * ROW_H}px)">
          {#each flatRows.slice(visibleRange.start, visibleRange.end) as item, i (visibleRange.start + i)}
            {@const node = item.node}
            {@const state = dirCheckState(node)}
            {@const isDir = node.kind === 'dir'}
            <button
              class="row"
              class:dir={isDir}
              class:file={!isDir}
              class:checked={state === 'all'}
              class:partial={state === 'some'}
              style:padding-left="{8 + item.depth * 14}px"
              style:height="{ROW_H}px"
              onclick={(e) => onRowClick(node, e)}
            >
              <span
                class="check"
                role="checkbox"
                aria-checked={state === 'all'}
                tabindex="-1"
                onclick={(e) => onCheckClick(node, e)}
                onkeydown={() => {}}
              >{state === 'all' ? '✓' : state === 'some' ? '–' : ''}</span>
              {#if isDir}
                <span class="caret">{store.expanded.has(node.path) ? '▾' : '▸'}</span>
                <span class="icon">📁</span>
              {:else}
                <span class="caret"></span>
                <span class="icon">📄</span>
              {/if}
              <span class="path">{node.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .tree-shell {
    display: flex; flex-direction: column;
    height: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .search-row { display: flex; gap: 6px; padding: 8px; border-bottom: 1px solid var(--border); }
  .search-row input {
    flex: 1; background: var(--bg); border: 1px solid var(--border);
    color: var(--fg); padding: 6px 10px; border-radius: 5px; font: inherit; font-size: 13px;
  }
  .search-row input:focus { outline: none; border-color: var(--accent); }
  .actions { display: flex; gap: 4px; }
  .actions button {
    background: var(--bg); border: 1px solid var(--border); color: var(--fg);
    padding: 6px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;
  }
  .actions button:hover { border-color: var(--accent); }
  .meta { padding: 4px 10px; font-size: 11px; color: var(--fg-muted); border-bottom: 1px solid var(--border); display: flex; gap: 6px; }
  .viewport { flex: 1; overflow: auto; contain: strict; }
  .results { display: flex; flex-direction: column; }
  .row {
    width: 100%;
    display: flex; align-items: center; gap: 4px;
    background: none; border: none; color: var(--fg);
    padding: 0 8px; text-align: left;
    cursor: pointer; font: inherit; font-size: 13px;
    line-height: 22px;
    white-space: nowrap;
  }
  .row.file { line-height: 22px; }
  .row:hover { background: var(--bg-hover); }
  .row.checked { background: var(--accent-soft); }
  .row.checked:hover { background: var(--accent-soft-hover); }
  .row.partial { background: var(--accent-soft-2); }
  .check {
    width: 14px; height: 14px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    font-size: 11px; line-height: 1;
    background: var(--bg);
    color: var(--accent);
    flex-shrink: 0;
  }
  .row.checked .check { background: var(--accent); color: #000; border-color: var(--accent); }
  .row.partial .check { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
  .caret { width: 12px; color: var(--fg-muted); font-size: 10px; flex-shrink: 0; text-align: center; }
  .icon { width: 16px; flex-shrink: 0; opacity: 0.85; }
  .path { overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
  .hl { color: var(--accent); font-weight: 600; }
  .empty { padding: 14px; text-align: center; color: var(--fg-muted); font-size: 13px; }
</style>
