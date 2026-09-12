import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Index } from '../src/engine.js';

test('BM25 ranks the more relevant doc first', () => {
  const idx = new Index();
  idx.upsertFile('a.md', 'circuit breaker protects downstream services', 1);
  idx.upsertFile('b.md', 'write ahead log and snapshot compaction', 1);
  const hits = idx.search('circuit breaker');
  assert.equal(hits[0].path, 'a.md');
  assert.ok(hits[0].score > 0);
});
