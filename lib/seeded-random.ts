/**
 * A simple seeded pseudo-random number generator (Mulberry32).
 * Given the same seed it always produces the same sequence of numbers,
 * so the crossword layout is identical on every page load.
 */
export function createSeededRandom(seed: number) {
  let s = seed >>> 0; // ensure unsigned 32-bit integer

  return function random(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derive a numeric seed from the question+answer pairs so that
 * adding new Q&As changes the layout, but the same set always
 * produces the same layout.
 */
export function seedFromData(data: { question: string; answer: string }[]): number {
  const str = data.map((d) => d.question + d.answer).join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert to 32-bit int
  }
  return Math.abs(hash);
}
