export interface CrosswordClue {
  id: number;
  answer: string;
  clue: string;
  direction: "across" | "down";
  row: number;
  col: number;
}

export interface Cell {
  letter: string;
  number?: number;
  isBlack: boolean;
  row: number;
  col: number;
  clueIds: number[];
}

export interface CrosswordData {
  clues: CrosswordClue[];
  grid: Cell[][];
  gridSize: number;
}

export interface UserInput {
  [key: string]: string; // "row-col" -> letter
}
