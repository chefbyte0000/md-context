<script lang="ts">
  import Source from './lib/components/Source.svelte';
  import Filters from './lib/components/Filters.svelte';
  import Tree from './lib/components/Tree.svelte';
  import ImportLayers from './lib/components/ImportLayers.svelte';
  import Export from './lib/components/Export.svelte';
  import { store } from './lib/store.svelte';
</script>

<header class="topbar">
  <div class="brand">
    <span class="logo">⌘</span>
    <span class="title">md-context</span>
    <span class="subtitle">codebase → markdown</span>
  </div>
  {#if store.codebase}
    <div class="repo-info">
      <span class="badge">{store.codebase.projectType}</span>
      <span class="repo-name">{store.codebase.rootName}</span>
      <span class="dim">· {store.codebase.files.size} files</span>
      <button class="reset" onclick={() => location.reload()}>Reset</button>
    </div>
  {/if}
</header>

{#if !store.codebase}
  <main class="landing">
    <div class="hero">
      <h1>Turn any codebase into a single markdown file</h1>
      <p>
        Upload a <code>.zip</code> or paste a GitHub repo. Pick the files you want with smart presets,
        a VS-Code-style tree, and layered import discovery. Everything runs in your browser — your code never leaves.
      </p>
    </div>
    <Source />
  </main>
{:else}
  <main class="workspace">
    <aside class="left">
      <Tree />
    </aside>
    <section class="right">
      <div class="card"><Filters /></div>
      <div class="card"><ImportLayers /></div>
      <div class="card"><Export /></div>
    </section>
  </main>
{/if}

<style>
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    height: 48px;
  }
  .brand { display: flex; align-items: baseline; gap: 10px; }
  .logo { font-size: 18px; }
  .title { font-weight: 700; font-size: 15px; }
  .subtitle { color: var(--fg-muted); font-size: 12px; }
  .repo-info { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .badge {
    background: var(--accent-soft); color: var(--accent);
    padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .repo-name { font-family: var(--mono); }
  .dim { color: var(--fg-muted); }
  .reset {
    background: var(--bg); border: 1px solid var(--border); color: var(--fg);
    padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; margin-left: 8px;
  }
  .reset:hover { border-color: var(--accent); }

  .landing {
    height: calc(100% - 48px);
    overflow: auto;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    padding: 60px 24px 80px;
  }
  .hero { max-width: 640px; text-align: center; margin-bottom: 32px; }
  .hero h1 { font-size: 28px; margin: 0 0 12px; line-height: 1.2; }
  .hero p { color: var(--fg-muted); line-height: 1.6; margin: 0; }
  .hero code {
    font-family: var(--mono);
    background: var(--panel); border: 1px solid var(--border);
    padding: 1px 6px; border-radius: 4px;
  }
  .landing :global(.source-card) { width: 100%; max-width: 720px; }

  .workspace {
    display: grid;
    grid-template-columns: minmax(280px, 360px) 1fr;
    gap: 12px;
    padding: 12px;
    height: calc(100% - 48px);
    overflow: hidden;
  }
  @media (max-width: 900px) {
    .workspace { grid-template-columns: 1fr; height: auto; overflow: auto; }
    .left { height: 60vh; }
  }
  .left { min-height: 0; }
  .right { display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: auto; }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
  }
</style>
