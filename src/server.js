import http from 'node:http';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { Index, indexDir } from './engine.js';

const ROOT = process.env.FTS_ROOT ?? './corpus';
const PORT = Number(process.env.PORT ?? 8790);
let idx = await indexDir(ROOT);

watch(ROOT, { recursive: true }, async (_ev, file) => {
  if (!file) return;
  try {
    const p = `${ROOT}/${file}`;
    const st = await stat(p);
    const text = await readFile(p, 'utf8');
    idx.upsertFile(p, text, st.mtimeMs);
    console.log('reindexed', p);
  } catch {}
});

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/search') {
    const q = url.searchParams.get('q') ?? '';
    const hits = idx.search(q, { k: Number(url.searchParams.get('k') ?? 10) });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ q, hits }));
    return;
  }
  if (url.pathname === '/stats') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ docs: idx.docs.size, terms: idx.postings.size }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
}).listen(PORT, () => console.log(`mini-fts on :${PORT}`));
