<script lang="ts">
  import { store } from '../store.svelte';

  let newToken = $state('');

  function add() {
    store.addFilterToken(newToken);
    newToken = '';
  }
</script>

<div class="filters">
  <div class="header">
    <h3>Filters</h3>
    <span class="count">{store.filteredPaths.length} files visible</span>
  </div>

  {#if store.presets}
    <div class="preset-grid">
      {#each store.presets.presets as preset (preset.id)}
        <button
          class="preset"
          class:active={store.activePresets.has(preset.id)}
          onclick={() => store.togglePreset(preset)}
          title={preset.description}
        >
          <span class="preset-label">{preset.label}</span>
          <span class="preset-desc">{preset.description}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="custom">
    <div class="tokens">
      {#each store.filterTokens as t (t)}
        <span class="token">
          <span>{t}</span>
          <button onclick={() => store.removeFilterToken(t)} aria-label="remove">×</button>
        </span>
      {/each}
    </div>
    <div class="add-row">
      <input
        type="text"
        placeholder='Filter token: "node_modules/", "ext:tsx", "!src/"'
        bind:value={newToken}
        onkeydown={(e) => { if (e.key === 'Enter') add(); }}
      />
      <button onclick={add} disabled={!newToken.trim()}>Add</button>
    </div>
    <p class="hint">
      <code>foo/</code> excludes paths containing <code>foo/</code>.
      <code>!foo/</code> keeps only paths matching it (whitelist).
      <code>ext:tsx</code> excludes by extension.
      <code>ext:!tsx</code> keeps only that extension.
    </p>
  </div>
</div>

<style>
  .filters { display: flex; flex-direction: column; gap: 12px; }
  .header { display: flex; justify-content: space-between; align-items: baseline; }
  h3 { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-muted); font-weight: 600; }
  .count { font-size: 12px; color: var(--fg-muted); }
  .preset-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px;
  }
  .preset {
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--fg);
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: flex; flex-direction: column; gap: 2px;
    transition: border-color 0.1s, background 0.1s;
  }
  .preset:hover { border-color: var(--accent); }
  .preset.active { background: var(--accent-soft); border-color: var(--accent); }
  .preset-label { font-size: 13px; font-weight: 600; }
  .preset-desc { font-size: 11px; color: var(--fg-muted); }
  .preset.active .preset-desc { color: var(--fg); }
  .custom { display: flex; flex-direction: column; gap: 6px; }
  .tokens { display: flex; flex-wrap: wrap; gap: 4px; }
  .token {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 4px; padding: 2px 4px 2px 8px; font-size: 12px;
    font-family: var(--mono);
  }
  .token button {
    background: none; border: none; color: var(--fg-muted);
    cursor: pointer; font-size: 16px; line-height: 1; padding: 0 4px;
  }
  .token button:hover { color: #ff6b6b; }
  .add-row { display: flex; gap: 6px; }
  .add-row input {
    flex: 1; background: var(--bg); border: 1px solid var(--border);
    color: var(--fg); padding: 6px 8px; border-radius: 5px; font: inherit; font-size: 13px;
  }
  .add-row input:focus { outline: none; border-color: var(--accent); }
  .add-row button {
    background: var(--bg); border: 1px solid var(--border); color: var(--fg);
    padding: 6px 10px; border-radius: 5px; cursor: pointer; font-size: 13px;
  }
  .add-row button:hover:not(:disabled) { border-color: var(--accent); }
  .add-row button:disabled { opacity: 0.5; cursor: default; }
  .hint { margin: 0; font-size: 11px; color: var(--fg-muted); line-height: 1.5; }
  .hint code {
    font-family: var(--mono); background: var(--bg);
    padding: 1px 4px; border-radius: 3px; border: 1px solid var(--border);
  }
</style>
