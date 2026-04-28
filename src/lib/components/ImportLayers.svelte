<script lang="ts">
  import { store } from '../store.svelte';

  let depthInput = $state(store.layerDepth);

  function recompute() {
    store.layerDepth = Math.max(1, Math.min(10, depthInput | 0));
    store.computeImportLayers();
  }
</script>

<div class="layers">
  <div class="header">
    <h3>Import layers</h3>
    <div class="ctrl">
      <label>
        Depth
        <input type="number" min="1" max="10" bind:value={depthInput} onchange={recompute} />
      </label>
      <button onclick={recompute} disabled={store.selected.size === 0}>
        Analyze ({store.selected.size})
      </button>
    </div>
  </div>

  {#if store.importLayers.length === 0}
    <p class="empty">
      Select files in the tree, then click <strong>Analyze</strong> to find imports.
      Each layer shows imports of the previous layer's files.
    </p>
  {:else}
    <div class="actions">
      <button onclick={() => store.addAllLayersToSelection()}>
        Add all layers ({store.importLayers.reduce((n, l) => n + l.files.length, 0)} files)
      </button>
    </div>
    <div class="layer-list">
      {#each store.importLayers as layer (layer.depth)}
        {@const allSelected = layer.files.every((f) => store.selected.has(f))}
        <div class="layer">
          <div class="layer-head">
            <span class="badge">Layer {layer.depth}</span>
            <span class="count">{layer.files.length} file{layer.files.length === 1 ? '' : 's'}</span>
            <button
              onclick={() => store.addLayerToSelection(layer.depth - 1)}
              disabled={allSelected}
            >
              {allSelected ? 'Added' : 'Add layer'}
            </button>
          </div>
          <ul>
            {#each layer.files as file (file)}
              {@const selected = store.selected.has(file)}
              <li>
                <label class="file-row" class:selected>
                  <input
                    type="checkbox"
                    checked={selected}
                    onchange={(e) => store.setSelected([file], (e.currentTarget as HTMLInputElement).checked)}
                  />
                  <span class="path">{file}</span>
                </label>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .layers { display: flex; flex-direction: column; gap: 10px; }
  .header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  h3 { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-muted); font-weight: 600; }
  .ctrl { display: flex; align-items: center; gap: 8px; }
  .ctrl label { font-size: 12px; color: var(--fg-muted); display: flex; align-items: center; gap: 4px; }
  .ctrl input {
    width: 50px; background: var(--bg); border: 1px solid var(--border); color: var(--fg);
    padding: 4px 6px; border-radius: 4px; font: inherit; font-size: 12px;
  }
  .ctrl button {
    background: var(--accent); color: #000; border: none;
    padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 12px;
  }
  .ctrl button:disabled { opacity: 0.4; cursor: default; }
  .empty { color: var(--fg-muted); font-size: 13px; margin: 0; line-height: 1.5; }
  .actions { display: flex; }
  .actions button {
    background: var(--bg); border: 1px solid var(--accent); color: var(--accent);
    padding: 6px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;
  }
  .actions button:hover { background: var(--accent-soft); }
  .layer-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow: auto; }
  .layer {
    border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
  }
  .layer-head {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .badge {
    background: var(--accent-soft); color: var(--accent);
    padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;
  }
  .count { font-size: 12px; color: var(--fg-muted); flex: 1; }
  .layer-head button {
    background: none; border: 1px solid var(--border); color: var(--fg);
    padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;
  }
  .layer-head button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .layer-head button:disabled { opacity: 0.5; cursor: default; }
  ul { list-style: none; margin: 0; padding: 4px 0; }
  .file-row {
    display: flex; align-items: center; gap: 8px;
    padding: 3px 8px; cursor: pointer; font-size: 12px;
    font-family: var(--mono);
  }
  .file-row:hover { background: var(--bg-hover); }
  .file-row.selected { background: var(--accent-soft); }
  .file-row input { margin: 0; }
  .path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
