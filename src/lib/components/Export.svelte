<script lang="ts">
  import { buildMarkdown, downloadText } from '../exporter';
  import { store } from '../store.svelte';

  let includeTree = $state(true);
  let includeHeader = $state(true);
  let exportScope = $state<'selected' | 'all'>('selected');

  const targetPaths = $derived(
    exportScope === 'all' ? store.filteredPaths : [...store.selected],
  );

  const previewSize = $derived.by(() => {
    if (!store.codebase) return 0;
    let total = 0;
    for (const p of targetPaths) {
      const f = store.codebase.files.get(p);
      if (f && !f.binary) total += f.size;
    }
    return total;
  });

  function fmtBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function doExport() {
    if (!store.codebase || targetPaths.length === 0) return;
    const md = buildMarkdown(store.codebase, targetPaths, {
      includeHeader,
      includeTree,
      splitPerFile: false,
    });
    const fname = `${store.codebase.rootName || 'codebase'}.md`;
    downloadText(fname, md);
  }
</script>

<div class="export">
  <h3>Export</h3>

  <div class="scope">
    <label>
      <input type="radio" bind:group={exportScope} value="selected" />
      Selected ({store.selected.size})
    </label>
    <label>
      <input type="radio" bind:group={exportScope} value="all" />
      All visible ({store.filteredPaths.length})
    </label>
  </div>

  <div class="opts">
    <label><input type="checkbox" bind:checked={includeHeader} /> Include header</label>
    <label><input type="checkbox" bind:checked={includeTree} /> Include file tree</label>
  </div>

  <div class="size">~{fmtBytes(previewSize)} of source</div>

  <button class="primary" onclick={doExport} disabled={targetPaths.length === 0}>
    Download .md
  </button>
</div>

<style>
  .export { display: flex; flex-direction: column; gap: 10px; }
  h3 { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-muted); font-weight: 600; }
  .scope, .opts { display: flex; gap: 12px; flex-wrap: wrap; }
  .scope label, .opts label {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;
  }
  .size { font-size: 12px; color: var(--fg-muted); }
  .primary {
    background: var(--accent); color: #000; border: none;
    padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: 600;
    align-self: flex-start;
  }
  .primary:disabled { opacity: 0.4; cursor: default; }
</style>
