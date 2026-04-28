/**
 * VSCode-style fuzzy subsequence match with simple scoring.
 * Higher score = better match.
 */
export interface FuzzyMatch {
  score: number;
  positions: number[]; // matched indices in target
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (!query) return { score: 0, positions: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const positions: number[] = [];
  let ti = 0;
  let score = 0;
  let prevMatched = false;
  let lastSep = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    let found = -1;
    for (let i = ti; i < t.length; i++) {
      if (t[i] === ch) { found = i; break; }
    }
    if (found < 0) return null;
    let bonus = 1;
    if (found > 0) {
      const prev = t[found - 1];
      if (prev === '/' || prev === '_' || prev === '-' || prev === '.') bonus += 8;
    } else {
      bonus += 10; // start of string
    }
    if (target[found] !== target[found].toLowerCase()) bonus += 2; // camel hump
    if (prevMatched) bonus += 5; // contiguous
    if (found === lastSep + 1) bonus += 3;
    score += bonus;
    positions.push(found);
    ti = found + 1;
    prevMatched = true;
    if (ch === '/') lastSep = found;
  }
  // Prefer shorter targets and matches near the basename
  score -= Math.min(target.length / 8, 10);
  const slash = target.lastIndexOf('/');
  if (slash >= 0 && positions[0] > slash) score += 4;
  return { score, positions };
}
