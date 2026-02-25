'use strict';

/**
 * Compute Levenshtein edit distance between two pre-normalised strings.
 * Uses two-row DP to keep memory at O(n) instead of O(m*n).
 */
function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Find the closest matching plant document for a user-supplied name.
 *
 * @param {string}   input       - Raw plant name from the CSV (may be misspelled)
 * @param {object[]} plants      - Plant documents with at least { _id, name, emoji }
 * @param {number}   [maxDistance=3] - Reject suggestions with edit distance > this
 * @returns {{ plant: object, distance: number } | null}
 *
 * @example
 * findClosestPlant('Tomatoe', plants)
 * // => { plant: { name: 'Tomato', emoji: '🍅', ... }, distance: 1 }
 */
function findClosestPlant(input, plants, maxDistance = 3) {
  const norm = input.trim().toLowerCase();
  let best = null;
  let bestDist = Infinity;

  for (const plant of plants) {
    const d = levenshtein(norm, plant.name.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      best = plant;
    }
  }

  if (best === null || bestDist > maxDistance) return null;
  return { plant: best, distance: bestDist };
}

module.exports = { findClosestPlant };
