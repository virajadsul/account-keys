// In-memory sliding-window limiter, per server process.
// shortcut: resets on restart and isn't shared between instances; move to the database if you run several.
export function createLimiter({ max, windowMs }) {
  const hits = new Map();
  const recent = (id) => {
    const now = Date.now();
    const list = (hits.get(id) || []).filter((t) => now - t < windowMs);
    hits.set(id, list);
    return list;
  };
  return {
    blocked: (id) => recent(id).length >= max,
    hit: (id) => recent(id).push(Date.now()),
    reset: (id) => hits.delete(id),
  };
}
