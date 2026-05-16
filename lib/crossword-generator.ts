import { CrosswordClue, Cell, CrosswordData } from "./crossword-types";

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

// More attempts = denser, better layouts. 150 is a good balance of speed vs quality.
const ATTEMPTS = 150;

export function generateCrossword(
  questionsAndAnswers: { question: string; answer: string }[]
): CrosswordData {
  const words = questionsAndAnswers.map((qa) => ({
    word: qa.answer.toUpperCase().replace(/\s/g, ""),
    clue: qa.question,
  }));

  let bestResult: CrosswordData | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < ATTEMPTS; i++) {
    // Shuffle word order slightly each attempt so we explore different layouts
    const shuffled = shuffleWords([...words]);
    const result = generateSingleLayout(shuffled);
    const score = evaluateLayout(result);

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult!;
}

/**
 * Shuffle all words except the longest one (which always goes first as the anchor).
 */
function shuffleWords(words: { word: string; clue: string }[]) {
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
  const anchor = sorted[0];
  const rest = sorted.slice(1);

  // Fisher-Yates shuffle on the rest
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [anchor, ...rest];
}

function generateSingleLayout(
  words: { word: string; clue: string }[]
): CrosswordData {
  // Use a generous internal grid; we trim it tightly afterwards
  const gridSize = calculateGridSize(words);
  const placedWords: PlacedWord[] = [];

  // Place first (longest) word dead-centre horizontally
  const first = words[0];
  placedWords.push({
    ...first,
    row: Math.floor(gridSize / 2),
    col: Math.floor((gridSize - first.word.length) / 2),
    direction: "across",
  });

  // Try each remaining word; if it can't be placed, skip it
  for (const word of words.slice(1)) {
    const placement = findBestPlacement(word, placedWords, gridSize);
    if (placement) {
      placedWords.push({ ...word, ...placement });
    }
  }

  return createCrosswordData(placedWords, gridSize);
}

function findBestPlacement(
  wordObj: { word: string; clue: string },
  placedWords: PlacedWord[],
  gridSize: number
): { row: number; col: number; direction: "across" | "down" } | null {
  const word = wordObj.word;
  const candidates: CandidatePlacement[] = [];

  const acrossCount = placedWords.filter((w) => w.direction === "across").length;
  const downCount   = placedWords.filter((w) => w.direction === "down").length;

  // For every already-placed word, try to hang the new word off every
  // matching letter pair — this is the core of the density algorithm.
  for (const placed of placedWords) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < placed.word.length; j++) {
        if (word[i] !== placed.word[j]) continue;

        const isAcross = placed.direction === "across";
        const direction: "across" | "down" = isAcross ? "down" : "across";

        // Position so word[i] sits on placed.word[j]
        const row = isAcross ? placed.row - i         : placed.row + j;
        const col = isAcross ? placed.col + j         : placed.col - i;

        if (!isValidPlacement(word, row, col, direction, placedWords, gridSize)) {
          continue;
        }

        const intersections = countIntersections(word, row, col, direction, placedWords);

        // Strongly reward intersections — this is the primary density driver
        const intersectionScore = intersections * 20;

        // Reward placing close to the centre of the current puzzle bounding box
        // rather than the centre of the oversized working grid
        const bbox = getBoundingBox(placedWords, gridSize);
        const centerRow = (bbox.minRow + bbox.maxRow) / 2;
        const centerCol = (bbox.minCol + bbox.maxCol) / 2;
        const wordCenterRow = direction === "down"     ? row + word.length / 2 : row;
        const wordCenterCol = direction === "across"   ? col + word.length / 2 : col;
        const compactness = -(
          Math.abs(wordCenterRow - centerRow) +
          Math.abs(wordCenterCol - centerCol)
        );

        // Mild reward for keeping across/down counts balanced
        const balanceBonus =
          direction === "across"
            ? downCount - acrossCount
            : acrossCount - downCount;

        // Reward words that share MORE of their letters with existing cells
        // (higher density means more overlapping letters)
        const overlapRatio = intersections / word.length;
        const overlapScore = overlapRatio * 15;

        const score =
          intersectionScore +
          overlapScore     +
          compactness * 1  +
          balanceBonus * 3;

        candidates.push({ row, col, direction, intersections, score });
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.score - a.score);

  return {
    row:       candidates[0].row,
    col:       candidates[0].col,
    direction: candidates[0].direction,
  };
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

  // Strongly reward using more words
  score += grid.clues.length * 100;

  // Strongly reward intersections (shared cells)
  let intersections = 0;
  for (const row of grid.grid) {
    for (const cell of row) {
      if (cell.clueIds.length > 1) intersections++;
    }
  }
  score += intersections * 25;

  // Penalise large grids — this pushes towards NYT compactness
  score -= grid.gridSize * grid.gridSize * 0.5;

  // Reward high fill density (non-black cells / total cells)
  const totalCells = grid.gridSize * grid.gridSize;
  const filledCells = grid.grid.flat().filter((c) => !c.isBlack).length;
  score += (filledCells / totalCells) * 200;

  return score;
}

function isValidPlacement(
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  placedWords: PlacedWord[],
  gridSize: number
): boolean {
  if (row < 0 || col < 0) return false;
  if (direction === "across" && col + word.length > gridSize) return false;
  if (direction === "down"   && row + word.length > gridSize) return false;

  // Build a fast lookup grid from already-placed words
  const grid: (string | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );
  for (const placed of placedWords) {
    for (let i = 0; i < placed.word.length; i++) {
      const r = placed.direction === "down"    ? placed.row + i : placed.row;
      const c = placed.direction === "across"  ? placed.col + i : placed.col;
      grid[r][c] = placed.word[i];
    }
  }

  for (let i = 0; i < word.length; i++) {
    const r = direction === "down"    ? row + i : row;
    const c = direction === "across"  ? col + i : col;

    // Letter conflict
    if (grid[r][c] !== null && grid[r][c] !== word[i]) return false;

    // Adjacency check — prevent two parallel words from running side by side
    // (a blank cell can't have a neighbour that belongs to a parallel word)
    if (grid[r][c] === null) {
      if (direction === "across") {
        if (r > 0           && grid[r - 1][c] !== null && !isIntersectionCell(r - 1, c, direction, placedWords)) return false;
        if (r < gridSize-1  && grid[r + 1][c] !== null && !isIntersectionCell(r + 1, c, direction, placedWords)) return false;
      } else {
        if (c > 0           && grid[r][c - 1] !== null && !isIntersectionCell(r, c - 1, direction, placedWords)) return false;
        if (c < gridSize-1  && grid[r][c + 1] !== null && !isIntersectionCell(r, c + 1, direction, placedWords)) return false;
      }
    }
  }

  // No word can start immediately before or end immediately after this one
  if (direction === "across") {
    if (col > 0              && grid[row][col - 1]            !== null) return false;
    if (col + word.length < gridSize && grid[row][col + word.length] !== null) return false;
  } else {
    if (row > 0              && grid[row - 1][col]            !== null) return false;
    if (row + word.length < gridSize && grid[row + word.length][col] !== null) return false;
  }

  return true;
}

/**
 * Returns true if (r, c) is already a valid intersection point for a word
 * perpendicular to `newDirection` — meaning it's fine for the new word's
 * blank cell to have a neighbour there.
 */
function isIntersectionCell(
  r: number,
  c: number,
  newDirection: "across" | "down",
  placedWords: PlacedWord[]
): boolean {
  const perp = newDirection === "across" ? "down" : "across";
  return placedWords.some(
    (p) =>
      p.direction === perp &&
      (perp === "down"
        ? p.col === c && p.row <= r && p.row + p.word.length > r
        : p.row === r && p.col <= c && p.col + p.word.length > c)
  );
}

function countIntersections(
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  placedWords: PlacedWord[]
): number {
  // Build a grid large enough for all placements
  const size = 60;
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  for (const placed of placedWords) {
    for (let i = 0; i < placed.word.length; i++) {
      const r = placed.direction === "down"    ? placed.row + i : placed.row;
      const c = placed.direction === "across"  ? placed.col + i : placed.col;
      if (r < size && c < size) grid[r][c] = placed.word[i];
    }
  }

  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === "down"    ? row + i : row;
    const c = direction === "across"  ? col + i : col;
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

  // Find tight bounding box — no padding, NYT-style
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
  // Use a rectangular grid sized to fit content exactly
  const actualSize = Math.max(actualRows, actualCols);

  const adjustedWords = placedWords.map((w) => ({
    ...w,
    row: w.row - minRow,
    col: w.col - minCol,
  }));

  // Initialise grid with all-black cells
  const grid: Cell[][] = Array.from({ length: actualSize }, (_, r) =>
    Array.from({ length: actualSize }, (_, c) => ({
      letter: "",
      isBlack: true,
      row: r,
      col: c,
      clueIds: [],
    }))
  );

  // Sort words top-to-bottom, left-to-right for numbering
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
      id:        idx,
      answer:    word.word,
      clue:      word.clue,
      direction: word.direction,
      row:       word.row,
      col:       word.col,
    });

    for (let i = 0; i < word.word.length; i++) {
      const r = word.direction === "down"    ? word.row + i : word.row;
      const c = word.direction === "across"  ? word.col + i : word.col;

      if (r < actualSize && c < actualSize) {
        grid[r][c].letter  = word.word[i];
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
  const maxLength    = Math.max(...words.map((w) => w.word.length));
  const totalLetters = words.reduce((sum, w) => sum + w.word.length, 0);

  // Tighter formula: less slack means words are forced closer together.
  // +2 gives just enough room to place without going out of bounds.
  return Math.max(
    maxLength + 2,
    Math.ceil(Math.sqrt(totalLetters * 1.4)) + 2,
    12
  );
}