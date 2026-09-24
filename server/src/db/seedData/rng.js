// Deterministic PRNG (mulberry32) so `npm run seed` produces the exact same demo data
// every time - the README's demo logins and quiz states stay accurate after reset-db.
export function createRng(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(rng, items) {
  return items[randomInt(rng, 0, items.length - 1)];
}

export function shuffle(rng, items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// True with the given probability (0-1).
export function chance(rng, probability) {
  return rng() < probability;
}
