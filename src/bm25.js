export function idf(N, df) {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

export function bm25({ tf, df, N, docLen, avgdl, k1 = 1.2, b = 0.75 }) {
  const denom = tf + k1 * (1 - b + b * (docLen / Math.max(avgdl, 1)));
  return idf(N, df) * ((tf * (k1 + 1)) / denom);
}
