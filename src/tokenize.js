const STOP = new Set(('a an the and or of to in on for with is are was were be been it this that from as at by not no').split(' '));

export function tokenize(text, { stop = true } = {}) {
  const out = [];
  const s = String(text).toLowerCase();
  let buf = '';
  const flush = () => {
    if (!buf) return;
    if (!stop || !STOP.has(buf)) out.push(buf);
    buf = '';
  };
  for (const ch of s) {
    if (/[\p{L}\p{N}]/u.test(ch)) buf += ch;
    else flush();
  }
  flush();
  return out;
}
