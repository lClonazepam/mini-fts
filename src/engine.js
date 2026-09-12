import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { tokenize } from './tokenize.js';
import { bm25 } from './bm25.js';

export class Index {
  constructor() {
    this.docs = new Map(); // id -> { path, title, len, mtime }
    this.postings = new Map(); // term -> Map(docId, tf)
    this.nextId = 1;
  }

  static async load(file) {
    const idx = new Index();
    if (!existsSync(file)) return idx;
    const raw = JSON.parse(await readFile(file, 'utf8'));
    idx.nextId = raw.nextId;
    for (const [id, doc] of Object.entries(raw.docs)) idx.docs.set(Number(id), doc);
    for (const [term, pairs] of Object.entries(raw.postings)) {
      idx.postings.set(term, new Map(pairs));
    }
    return idx;
  }

  async save(file) {
    await mkdir(path.dirname(file), { recursive: true });
    const postings = {};
    for (const [term, map] of this.postings) postings[term] = [...map.entries()];
    await writeFile(file, JSON.stringify({ nextId: this.nextId, docs: Object.fromEntries(this.docs), postings }));
  }

  remove(docId) {
    const doc = this.docs.get(docId);
    if (!doc) return;
    for (const [, map] of this.postings) map.delete(docId);
    this.docs.delete(docId);
  }

  upsertFile(filePath, text, mtime) {
    let existing = null;
    for (const [id, d] of this.docs) if (d.path === filePath) existing = id;
    if (existing != null) this.remove(existing);
    const tokens = tokenize(text);
    const id = this.nextId++;
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [term, c] of tf) {
      if (!this.postings.has(term)) this.postings.set(term, new Map());
      this.postings.get(term).set(id, c);
    }
    this.docs.set(id, {
      path: filePath,
      title: path.basename(filePath),
      len: tokens.length,
      mtime,
    });
    return id;
  }

  search(q, { k = 10 } = {}) {
    const terms = tokenize(q);
    if (!terms.length) return [];
    const N = this.docs.size || 1;
    let avgdl = 0;
    for (const d of this.docs.values()) avgdl += d.len;
    avgdl /= N;

    const scores = new Map();
    const seen = new Map();
    for (const term of terms) {
      const posting = this.postings.get(term);
      if (!posting) return [];
      const df = posting.size;
      for (const [docId, tf] of posting) {
        const doc = this.docs.get(docId);
        const add = bm25({ tf, df, N, docLen: doc.len, avgdl });
        scores.set(docId, (scores.get(docId) ?? 0) + add);
        seen.set(docId, (seen.get(docId) ?? 0) + 1);
      }
    }
    return [...scores.entries()]
      .filter(([id]) => seen.get(id) === terms.length)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([id, score]) => ({ score, ...this.docs.get(id), id }));
  }
}

export async function indexDir(root, idx = new Index()) {
  async function walk(dir) {
    const ents = await readdir(dir, { withFileTypes: true });
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(md|txt|js|ts|json)$/i.test(e.name)) {
        const st = await stat(p);
        const text = await readFile(p, 'utf8');
        idx.upsertFile(p, text, st.mtimeMs);
      }
    }
  }
  await walk(root);
  return idx;
}
