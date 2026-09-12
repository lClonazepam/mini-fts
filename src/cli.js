#!/usr/bin/env node
import { Index, indexDir } from './engine.js';

const INDEX = process.env.FTS_INDEX ?? './data/index.json';
const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'index') {
  const root = rest[0] ?? './corpus';
  const idx = await indexDir(root);
  await idx.save(INDEX);
  console.log(`indexed ${idx.docs.size} docs, ${idx.postings.size} terms`);
} else if (cmd === 'search') {
  const q = rest.join(' ');
  const idx = await Index.load(INDEX);
  for (const hit of idx.search(q)) {
    console.log(hit.score.toFixed(4), hit.path);
  }
} else {
  console.log('usage: minifts index [dir] | search <query>');
  process.exit(1);
}
