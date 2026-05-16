import { CrosswordClue, Cell, CrosswordData } from "./crossword-types";
import { createSeededRandom, seedFromData } from "./seeded-random";

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

interface CandidatePlacement {
  row: number;
  col: number;
  direction: "across" | "down";
  intersections: number;
  score: number;
}

const ATTEMPTS = 150;

export function generateCrossword(
  questionsAndAnswers: { question: string; answer: string }[]
): CrosswordData {
  const words = questionsAndAnswers.map((qa) => ({
    word: qa.answer.toUpperCase().replace(/[^A-Z]/g, ""),
    clue: qa.question,
  }));

  const baseSeed = seedFromData(questionsAndAnswers);

  let bestResult: CrosswordData | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < ATTEMPTS; i++) {
    const attemptSeed = baseSeed + i * 1_000_003;
    const random = createSeededRandom(attemptSeed);

    const shuffled = shuffleWords([...words], random);
    const result = generateSingleLayout(shuffled, random);
    const score = evaluateLayout(result);

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult!;
}

function shuffleWords(
  words: { word: string; clue: string }[],
  random: () => number
) {
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
  const anchor = sorted[0];
  const rest = sorted.slice(1);

  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [anchor, ...rest];
}

function generateSingleLayout(
  words: { word: string; clue: string }[],
  random: () => number
): CrosswordData {
  const gridSize = calculateGridSize(words);
  const placedWords: PlacedWord[] = [];

  const first = words[0];
  placedWords.push({
    ...first,
    row: Math.floor(gridSize / 2),
    col: Math.floor((gridSize - first.word.length) / 2),
    direction: "across",
  });

  for (const word of words.slice(1)) {
    const placement = findBestPlacement(word, placedWords, gridSize, random);
    if (placement) {
      placedWords.push({ ...word, ...placement });
    }
  }

  return createCrosswordData(placedWords, gridSize);
}

function findBestPlacement(
  wordObj: { word: string; clue: string },
  placedWords: PlacedWord[],
  gridSize: number,
  random: () => number
): { row: number; col: number; direction: "across" | "down" } | null {
  const word = wordObj.word;
  const candidates: CandidatePlacement[] = [];

  const acrossCount = placedWords.filter((w) => w.direction === "across").length;
  const downCount = placedWords.filter((w) => w.direction === "down").length;

  for (const placed of placedWords) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < placed.word.length; j++) {
        if (word[i] !== placed.word[j]) continue;

        const isAcross = placed.direction === "across";
        const direction: "across" | "down" = isAcross ? "down" : "across";

        const row = isAcross ? placed.row - i : placed.row + j;
        const col = isAcross ? placed.col + j : placed.col - i;

        if (!isValidPlacement(word, row, col, direction, placedWords, gridSize)) {
          continue;
        }

        const intersections = countIntersections(word, row, col, direction, placedWords);
        const intersectionScore = intersections * 20;

        const bbox = getBoundingBox(placedWords, gridSize);
        const centerRow = (bbox.minRow + bbox.maxRow) / 2;
        const centerCol = (bbox.minCol + bbox.maxCol) / 2;
        const wordCenterRow = direction === "down" ? row + word.length / 2 : row;
        const wordCenterCol = direction === "across" ? col + word.length / 2 : col;
        const compactness = -(
          Math.abs(wordCenterRow - centerRow) +
          Math.abs(wordCenterCol - centerCol)
        );

        const balanceBonus =
          direction === "across"
            ? downCount - acrossCount
            : acrossCount - downCount;

        const overlapRatio = intersections / word.length;
        const overlapScore = overlapRatio * 15;

        const score =
          intersectionScore + overlapScore + compactness * 1 + balanceBonus * 3;

        candidates.push({ row, col, direction, intersections, score });
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);

  const topTier = candidates.filter(
    (c) => c.score >= candidates[0].score - 0.001
  );
  const pick = topTier[Math.floor(random() * topTier.length)];

  return { row: pick.row, col: pick.col, direction: pick.direction };
}

function getBoundingBox(placedWords: PlacedWord[], gridSize: number) {
  let minRow = gridSize, maxRow = 0, minCol = gridSize, maxCol = 0;
  for (const w of placedWords) {
    minRow = Math.min(minRow, w.row);
    minCol = Math.min(minCol, w.col);
    if (w.direction === "across") {
      maxRow = Math.max(maxRow, w.row);
      maxCol = Math.max(maxCol, w.col + w.word.length - 1);
    } else {
      maxRow = Math.max(maxRow, w.row + w.word.length - 1);
      maxCol = Math.max(maxCol, w.col);
    }
  }
  return { minRow, maxRow, minCol, maxCol };
}

function evaluateLayout(grid: CrosswordData): number {
  let score = 0;
  score += grid.clues.length * 100;

  let intersections = 0;
  for (const row of grid.grid) {
    for (const cell of row) {
      if (cell.clueIds.length > 1) intersections++;
    }
  }
  score += intersections * 25;
  score -= grid.gridSize * grid.gridSize * 0.5;

  const totalCells = grid.gridSize * grid.gridSize;
  const filledCells = grid.grid.flat().filter((c) => !c.isBlack).length;
  score += (filledCells / totalCells) * 200;

  return score;
}

/** Build a letter-lookup grid from already-placed words. */
function buildGrid(placedWords: PlacedWord[], gridSize: number): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );
  for (const placed of placedWords) {
    for (let i = 0; i < placed.word.length; i++) {
      const r = placed.direction === "down" ? placed.row + i : placed.row;
      const c = placed.direction === "across" ? placed.col + i : placed.col;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        grid[r][c] = placed.word[i];
      }
    }
  }
  return grid;
}

/**
 * Returns true when cell (r, c) is covered by a word running in exactly
 * `dir`. Used to verify that an occupied neighbour is a legitimate crossing,
 * not a parallel word that would create an illegal adjacency.
 */
function cellBelongsToDirection(
  r: number,
  c: number,
  dir: "across" | "down",
  placedWords: PlacedWord[]
): boolean {
  return placedWords.some((p) => {
    if (p.direction !== dir) return false;
    if (dir === "across") {
      return p.row === r && c >= p.col && c < p.col + p.word.length;
    } else {
      return p.col === c && r >= p.row && r < p.row + p.word.length;
    }
  });
}

function isValidPlacement(
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  placedWords: PlacedWord[],
  gridSize: number
): boolean {
  // ── Bounds ──────────────────────────────────────────────────────────────
  if (row < 0 || col < 0) return false;
  if (direction === "across" && col + word.length > gridSize) return false;
  if (direction === "down"   && row + word.length > gridSize) return false;

  const grid = buildGrid(placedWords, gridSize);
  const perp: "across" | "down" = direction === "across" ? "down" : "across";

  // ── No letter immediately before the word starts ─────────────────────
  if (direction === "across" && col > 0 && grid[row][col - 1] !== null) return false;
  if (direction === "down"   && row > 0 && grid[row - 1][col] !== null) return false;

  // ── No letter immediately after the word ends ─────────────────────────
  if (direction === "across" && col + word.length < gridSize && grid[row][col + word.length] !== null) return false;
  if (direction === "down"   && row + word.length < gridSize && grid[row + word.length][col] !== null) return false;

  // ── Check every cell the word would occupy ────────────────────────────
  for (let i = 0; i < word.length; i++) {
    const r = direction === "down"    ? row + i : row;
    const c = direction === "across"  ? col + i : col;

    const existing = grid[r][c];

    if (existing !== null) {
      // Cell already has a letter.
      // Rule 1: letters must match.
      if (existing !== word[i]) return false;
      // Rule 2: the cell must belong to a word in the PERPENDICULAR direction
      //         (a true crossing). If it belongs to a parallel word, two words
      //         would be sharing cells in the same direction — illegal.
      if (!cellBelongsToDirection(r, c, perp, placedWords)) return false;

    } else {
      // Cell is empty. Ensure we are not running parallel alongside another word.
      // For an ACROSS word, the danger is cells directly above/below being occupied
      // by another ACROSS word (they would form an illegal parallel block).
      // For a DOWN word, the danger is cells directly left/right being occupied
      // by another DOWN word.
      if (direction === "across") {
        // Cell above
        if (r > 0 && grid[r - 1][c] !== null) {
          // OK only if that cell belongs to a DOWN word crossing this column
          if (!cellBelongsToDirection(r - 1, c, "down", placedWords)) return false;
          // And that down word must actually pass through THIS row too
          // (otherwise the neighbour is a floating letter from a parallel word).
          const crossesHere = placedWords.some(
            (p) => p.direction === "down" && p.col === c &&
                   p.row <= r && p.row + p.word.length > r
          );
          if (!crossesHere) return false;
        }
        // Cell below
        if (r < gridSize - 1 && grid[r + 1][c] !== null) {
          if (!cellBelongsToDirection(r + 1, c, "down", placedWords)) return false;
          const crossesHere = placedWords.some(
            (p) => p.direction === "down" && p.col === c &&
                   p.row <= r && p.row + p.word.length > r
          );
          if (!crossesHere) return false;
        }
      } else {
        // Cell to the left
        if (c > 0 && grid[r][c - 1] !== null) {
          if (!cellBelongsToDirection(r, c - 1, "across", placedWords)) return false;
          const crossesHere = placedWords.some(
            (p) => p.direction === "across" && p.row === r &&
                   p.col <= c && p.col + p.word.length > c
          );
          if (!crossesHere) return false;
        }
        // Cell to the right
        if (c < gridSize - 1 && grid[r][c + 1] !== null) {
          if (!cellBelongsToDirection(r, c + 1, "across", placedWords)) return false;
          const crossesHere = placedWords.some(
            (p) => p.direction === "across" && p.row === r &&
                   p.col <= c && p.col + p.word.length > c
          );
          if (!crossesHere) return false;
        }
      }
    }
  }

  return true;
}

function countIntersections(
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  placedWords: PlacedWord[]
): number {
  const size = 60;
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  for (const placed of placedWords) {
    for (let i = 0; i < placed.word.length; i++) {
      const r = placed.direction === "down" ? placed.row + i : placed.row;
      const c = placed.direction === "across" ? placed.col + i : placed.col;
      if (r < size && c < size) grid[r][c] = placed.word[i];
    }
  }

  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === "down" ? row + i : row;
    const c = direction === "across" ? col + i : col;
    if (r < size && c < size && grid[r][c] === word[i]) count++;
  }
  return count;
}

function createCrosswordData(
  placedWords: PlacedWord[],
  gridSize: number
): CrosswordData {
  if (placedWords.length === 0) {
    return { clues: [], grid: [], gridSize: 0 };
  }

  let minRow = gridSize, maxRow = 0, minCol = gridSize, maxCol = 0;
  for (const word of placedWords) {
    minRow = Math.min(minRow, word.row);
    minCol = Math.min(minCol, word.col);
    if (word.direction === "across") {
      maxRow = Math.max(maxRow, word.row);
      maxCol = Math.max(maxCol, word.col + word.word.length - 1);
    } else {
      maxRow = Math.max(maxRow, word.row + word.word.length - 1);
      maxCol = Math.max(maxCol, word.col);
    }
  }

  const actualRows = maxRow - minRow + 1;
  const actualCols = maxCol - minCol + 1;
  const actualSize = Math.max(actualRows, actualCols);

  const adjustedWords = placedWords.map((w) => ({
    ...w,
    row: w.row - minRow,
    col: w.col - minCol,
  }));

  const grid: Cell[][] = Array.from({ length: actualSize }, (_, r) =>
    Array.from({ length: actualSize }, (_, c) => ({
      letter: "",
      isBlack: true,
      row: r,
      col: c,
      clueIds: [],
    }))
  );

  adjustedWords.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const cellNumbers = new Map<string, number>();
  let currentNumber = 1;
  const clues: CrosswordClue[] = [];

  for (let idx = 0; idx < adjustedWords.length; idx++) {
    const word = adjustedWords[idx];
    const startKey = `${word.row}-${word.col}`;

    if (!cellNumbers.has(startKey)) {
      cellNumbers.set(startKey, currentNumber++);
    }

    clues.push({
      id: idx,
      answer: word.word,
      clue: word.clue,
      direction: word.direction,
      row: word.row,
      col: word.col,
    });

    for (let i = 0; i < word.word.length; i++) {
      const r = word.direction === "down" ? word.row + i : word.row;
      const c = word.direction === "across" ? word.col + i : word.col;

      if (r < actualSize && c < actualSize) {
        grid[r][c].letter = word.word[i];
        grid[r][c].isBlack = false;
        grid[r][c].clueIds.push(idx);

        if (i === 0) {
          grid[r][c].number = cellNumbers.get(startKey);
        }
      }
    }
  }

  return { clues, grid, gridSize: actualSize };
}

function calculateGridSize(words: { word: string }[]): number {
  const maxLength = Math.max(...words.map((w) => w.word.length));
  const totalLetters = words.reduce((sum, w) => sum + w.word.length, 0);

  return Math.max(
    maxLength + 2,
    Math.ceil(Math.sqrt(totalLetters * 1.4)) + 2,
    12
  );
}