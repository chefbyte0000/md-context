<script lang="ts">
  import { ingestGithub, ingestZipFile } from '../ingest';
  import { store } from '../store.svelte';

  let repoInput = $state('');
  let token = $state('');
  let dragOver = $state(false);
  let fileInput: HTMLInputElement;

  async function handleZip(file: File) {
    store.loading = true;
    store.loadError = null;
    try {
      const cb = await ingestZipFile(file, (m) => (store.progressMsg = m));
      store.setCodebase(cb);
    } catch (err) {
      store.loadError = err instanceof Error ? err.message : String(err);
    } finally {
      store.loading = false;
      store.progressMsg = '';
    }
  }

  async function handleGithub() {
    if (!repoInput.trim()) return;
    store.loading = true;
    store.loadError = null;
    try {
      const cb = await ingestGithub(repoInput, token || null, (m) => (store.progressMsg = m));
      store.setCodebase(cb);
    } catch (err) {
      store.loadError = err instanceof Error ? err.message : String(err);
    } finally {
      store.loading = false;
      store.progressMsg = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) handleZip(f);
  }
</script>

<div class="source-card">
  <h2>Load a codebase</h2>

  <div class="row">
    <label
      class="dropzone"
      class:drag={dragOver}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => (dragOver = false)}
      ondrop={onDrop}
    >
      <input
        bind:this={fileInput}
        type="file"
        accept=".zip,application/zip"
        onchange={(e) => {
          const f = (e.currentTarget as HTMLInputElement).files?.[0];
          if (f) handleZip(f);
        }}
      />
      <strong>Drop a .zip</strong>
      <span>or click to choose</span>
    </label>

    <div class="github">
      <strong>GitHub repo</strong>
      <input
        type="text"
        placeholder="owner/repo or https://github.com/owner/repo"
        bind:value={repoInput}
        onkeydown={(e) => { if (e.key === 'Enter') handleGithub(); }}
      />
      <input
        type="password"
        placeholder="Personal access token (optional, for private repos)"
        bind:value={token}
      />
      <button onclick={handleGithub} disabled={store.loading || !repoInput.trim()}>
        Fetch
      </button>
    </div>
  </div>

  {#if store.loading}
    <div class="status">{store.progressMsg || 'Working…'}</div>
  {/if}
  {#if store.loadError}
    <div class="error">{store.loadError}</div>
  {/if}
</div>

<style>
  .source-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px;
  }
  h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; }
  @media (max-width: 720px) { .row { grid-template-columns: 1fr; } }
  .dropzone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px;
    border: 1.5px dashed var(--border);
    border-radius: 8px;
    padding: 24px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
  }
  .dropzone:hover, .dropzone.drag { border-color: var(--accent); background: var(--bg-hover); }
  .dropzone input { display: none; }
  .dropzone span { color: var(--fg-muted); font-size: 13px; }
  .github { display: flex; flex-direction: column; gap: 8px; }
  .github strong { font-size: 13px; }
  .github input {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--fg);
    padding: 8px 10px;
    border-radius: 6px;
    font: inherit;
  }
  .github input:focus { outline: none; border-color: var(--accent); }
  .github button {
    align-self: flex-start;
    background: var(--accent); color: #000;
    border: none; padding: 8px 14px; border-radius: 6px;
    cursor: pointer; font-weight: 600;
  }
  .github button:disabled { opacity: 0.5; cursor: default; }
  .status { margin-top: 10px; color: var(--fg-muted); font-size: 13px; }
  .error { margin-top: 10px; color: #ff6b6b; font-size: 13px; }
</style>
