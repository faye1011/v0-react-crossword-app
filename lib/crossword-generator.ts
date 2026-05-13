import { CrosswordClue, Cell, CrosswordData } from "./crossword-types";

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

export function generateCrossword(
  questionsAndAnswers: { question: string; answer: string }[]
): CrosswordData {
  // Normalize answers to uppercase and remove spaces
  const words = questionsAndAnswers.map((qa) => ({
    word: qa.answer.toUpperCase().replace(/\s/g, ""),
    clue: qa.question,
  }));

  // Sort by length (longest first for better placement)
  words.sort((a, b) => b.word.length - a.word.length);

  const gridSize = calculateGridSize(words);
  const placedWords: PlacedWord[] = [];

  // Place first word in the center horizontally
  if (words.length > 0) {
    const firstWord = words[0];
    const startRow = Math.floor(gridSize / 2);
    const startCol = Math.floor((gridSize - firstWord.word.length) / 2);
    placedWords.push({
      ...firstWord,
      row: startRow,
      col: startCol,
      direction: "across",
    });
  }

  // Try to place remaining words
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const placement = findBestPlacement(word.word, placedWords, gridSize);
    if (placement) {
      placedWords.push({
        ...word,
        ...placement,
      });
    }
  }

  // Generate the grid and clues
  return createCrosswordData(placedWords, gridSize);
}

function calculateGridSize(
  words: { word: string; clue: string }[]
): number {
  const maxLength = Math.max(...words.map((w) => w.word.length));
  const totalLetters = words.reduce((sum, w) => sum + w.word.length, 0);
  return Math.max(maxLength + 4, Math.ceil(Math.sqrt(totalLetters * 2)) + 4, 15);
}

function findBestPlacement(
  word: string,
  placedWords: PlacedWord[],
  gridSize: number
): { row: number; col: number; direction: "across" | "down" } | null {
  const candidates: {
    row: number;
    col: number;
    direction: "across" | "down";
    intersections: number;
  }[] = [];

  // Try to find intersections with already placed words
  for (const placed of placedWords) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < placed.word.length; j++) {
        if (word[i] === placed.word[j]) {
          // Calculate position for intersection
          if (placed.direction === "across") {
            // Place new word vertically
            const newRow = placed.row - i;
            const newCol = placed.col + j;
            if (isValidPlacement(word, newRow, newCol, "down", placedWords, gridSize)) {
              candidates.push({
                row: newRow,
                col: newCol,
                direction: "down",
                intersections: countIntersections(word, newRow, newCol, "down", placedWords),
              });
            }
          } else {
            // Place new word horizontally
            const newRow = placed.row + j;
            const newCol = placed.col - i;
            if (isValidPlacement(word, newRow, newCol, "across", placedWords, gridSize)) {
              candidates.push({
                row: newRow,
                col: newCol,
                direction: "across",
                intersections: countIntersections(word, newRow, newCol, "across", placedWords),
              });
            }
          }
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Pick the placement with most intersections
  candidates.sort((a, b) => b.intersections - a.intersections);
  return candidates[0];
}

function isValidPlacement(
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  placedWords: PlacedWord[],
  gridSize: number
): boolean {
  // Check bounds
  if (row < 0 || col < 0) return false;
  if (direction === "across" && col + word.length > gridSize) return false;
  if (direction === "down" && row + word.length > gridSize) return false;

  // Create a simple grid to check conflicts
  const grid: (string | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  // Fill grid with placed words
  for (const placed of placedWords) {
    for (let i = 0; i < placed.word.length; i++) {
      const r = placed.direction === "down" ? placed.row + i : placed.row;
      const c = placed.direction === "across" ? placed.col + i : placed.col;
      grid[r][c] = placed.word[i];
    }
  }

  // Check if new word fits
  for (let i = 0; i < word.length; i++) {
    const r = direction === "down" ? row + i : row;
    const c = direction === "across" ? col + i : col;

    // If cell is occupied, must match
    if (grid[r][c] !== null && grid[r][c] !== word[i]) {
      return false;
    }

    // Check adjacent cells (no parallel words touching)
    if (grid[r][c] === null) {
      if (direction === "across") {
        // Check above and below
        if (r > 0 && grid[r - 1][c] !== null) {
          // Check if it's an intersection point
          const isIntersection = placedWords.some(
            (p) =>
              p.direction === "down" &&
              p.col === c &&
              p.row <= r - 1 &&
              p.row + p.word.length > r - 1
          );
          if (!isIntersection) return false;
        }
        if (r < gridSize - 1 && grid[r + 1][c] !== null) {
          const isIntersection = placedWords.some(
            (p) =>
              p.direction === "down" &&
              p.col === c &&
              p.row <= r + 1 &&
              p.row + p.word.length > r + 1
          );
          if (!isIntersection) return false;
        }
      } else {
        // Check left and right
        if (c > 0 && grid[r][c - 1] !== null) {
          const isIntersection = placedWords.some(
            (p) =>
              p.direction === "across" &&
              p.row === r &&
              p.col <= c - 1 &&
              p.col + p.word.length > c - 1
          );
          if (!isIntersection) return false;
        }
        if (c < gridSize - 1 && grid[r][c + 1] !== null) {
          const isIntersection = placedWords.some(
            (p) =>
              p.direction === "across" &&
              p.row === r &&
              p.col <= c + 1 &&
              p.col + p.word.length > c + 1
          );
          if (!isIntersection) return false;
        }
      }
    }
  }

  // Check before and after word for spacing
  if (direction === "across") {
    if (col > 0 && grid[row][col - 1] !== null) return false;
    if (col + word.length < gridSize && grid[row][col + word.length] !== null)
      return false;
  } else {
    if (row > 0 && grid[row - 1][col] !== null) return false;
    if (row + word.length < gridSize && grid[row + word.length][col] !== null)
      return false;
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
  let count = 0;
  const grid: (string | null)[][] = Array(30)
    .fill(null)
    .map(() => Array(30).fill(null));

  for (const placed of placedWords) {
    for (let i = 0; i < placed.word.length; i++) {
      const r = placed.direction === "down" ? placed.row + i : placed.row;
      const c = placed.direction === "across" ? placed.col + i : placed.col;
      grid[r][c] = placed.word[i];
    }
  }

  for (let i = 0; i < word.length; i++) {
    const r = direction === "down" ? row + i : row;
    const c = direction === "across" ? col + i : col;
    if (grid[r][c] === word[i]) count++;
  }

  return count;
}

function createCrosswordData(
  placedWords: PlacedWord[],
  gridSize: number
): CrosswordData {
  // Find the actual bounds of the puzzle
  let minRow = gridSize,
    maxRow = 0,
    minCol = gridSize,
    maxCol = 0;
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

  // Add padding
  const padding = 1;
  minRow = Math.max(0, minRow - padding);
  minCol = Math.max(0, minCol - padding);
  maxRow = Math.min(gridSize - 1, maxRow + padding);
  maxCol = Math.min(gridSize - 1, maxCol + padding);

  const actualSize = Math.max(maxRow - minRow + 1, maxCol - minCol + 1);

  // Adjust placed words positions
  const adjustedWords = placedWords.map((w) => ({
    ...w,
    row: w.row - minRow,
    col: w.col - minCol,
  }));

  // Create grid
  const grid: Cell[][] = [];
  for (let r = 0; r < actualSize; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < actualSize; c++) {
      row.push({
        letter: "",
        isBlack: true,
        row: r,
        col: c,
        clueIds: [],
      });
    }
    grid.push(row);
  }

  // Fill in letters and track cells for each word
  const cellNumbers: Map<string, number> = new Map();
  let currentNumber = 1;

  // Sort words by position for numbering
  adjustedWords.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const clues: CrosswordClue[] = [];

  for (let idx = 0; idx < adjustedWords.length; idx++) {
    const word = adjustedWords[idx];
    const startKey = `${word.row}-${word.col}`;

    // Assign number if not already assigned
    if (!cellNumbers.has(startKey)) {
      cellNumbers.set(startKey, currentNumber++);
    }

    const clueNumber = cellNumbers.get(startKey)!;

    clues.push({
      id: idx,
      answer: word.word,
      clue: word.clue,
      direction: word.direction,
      row: word.row,
      col: word.col,
    });

    // Fill grid
    for (let i = 0; i < word.word.length; i++) {
      const r = word.direction === "down" ? word.row + i : word.row;
      const c = word.direction === "across" ? word.col + i : word.col;

      if (r < actualSize && c < actualSize) {
        grid[r][c].letter = word.word[i];
        grid[r][c].isBlack = false;
        grid[r][c].clueIds.push(idx);

        if (i === 0) {
          grid[r][c].number = clueNumber;
        }
      }
    }
  }

  return { clues, grid, gridSize: actualSize };
}
