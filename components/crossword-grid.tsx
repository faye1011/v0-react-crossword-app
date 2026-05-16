"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { CrosswordData, CrosswordClue, UserInput } from "@/lib/crossword-types";
import { CrosswordCell } from "./crossword-cell";
import { CluesPanel } from "./clues-panel";

interface CrosswordGridProps {
  data: CrosswordData;
}

export function CrosswordGrid({ data }: CrosswordGridProps) {
  const [userInput, setUserInput] = useState<UserInput>({});
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedClueId, setSelectedClueId] = useState<number | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [showAnswers, setShowAnswers] = useState(false);
  const [checkMode, setCheckMode] = useState(false);
  const [completedClues, setCompletedClues] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const CELL_SIZE = 40;

  // Get highlighted cells for current clue
  const getHighlightedCells = useCallback((): Set<string> => {
    if (selectedClueId === null) return new Set();
    const clue = data.clues.find((c) => c.id === selectedClueId);
    if (!clue) return new Set();

    const cells = new Set<string>();
    for (let i = 0; i < clue.answer.length; i++) {
      const row = clue.direction === "down" ? clue.row + i : clue.row;
      const col = clue.direction === "across" ? clue.col + i : clue.col;
      cells.add(`${row}-${col}`);
    }
    return cells;
  }, [selectedClueId, data.clues]);

  const highlightedCells = getHighlightedCells();

  // Check if all answers are correct
  const checkCompletion = useCallback(() => {
    let allCorrect = true;
    const newCompleted = new Set<number>();

    for (const clue of data.clues) {
      let clueCorrect = true;
      for (let i = 0; i < clue.answer.length; i++) {
        const row = clue.direction === "down" ? clue.row + i : clue.row;
        const col = clue.direction === "across" ? clue.col + i : clue.col;
        const key = `${row}-${col}`;
        if (userInput[key]?.toUpperCase() !== clue.answer[i]) {
          clueCorrect = false;
          allCorrect = false;
        }
      }
      if (clueCorrect) newCompleted.add(clue.id);
    }

    setCompletedClues(newCompleted);
    setIsComplete(allCorrect);
  }, [data.clues, userInput]);

  useEffect(() => {
    checkCompletion();
  }, [userInput, checkCompletion]);

  const focusCell = (row: number, col: number) => {
    const key = `${row}-${col}`;
    setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    const cell = data.grid[row][col];
    if (cell.isBlack) return;

    const isSameCell = selectedCell?.row === row && selectedCell?.col === col;
    const newDirection = isSameCell
      ? direction === "across" ? "down" : "across"
      : direction;

    if (isSameCell) setDirection(newDirection);
    else setSelectedCell({ row, col });

    const clue = data.clues.find(
      (c) => c.direction === newDirection && cell.clueIds.includes(c.id)
    );

    if (clue) {
      setSelectedClueId(clue.id);
    } else {
      const otherClue = data.clues.find((c) => cell.clueIds.includes(c.id));
      if (otherClue) {
        setSelectedClueId(otherClue.id);
        setDirection(otherClue.direction);
      }
    }

    focusCell(row, col);
  };

  // Handle clue click
  const handleClueClick = (clue: CrosswordClue) => {
    setSelectedClueId(clue.id);
    setDirection(clue.direction);
    setSelectedCell({ row: clue.row, col: clue.col });
    focusCell(clue.row, clue.col);
  };

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (showAnswers) return;

    const key = `${row}-${col}`;

    if (e.key.match(/^[a-zA-Z]$/)) {
      setUserInput((prev) => ({ ...prev, [key]: e.key.toUpperCase() }));
      moveToNextCell(row, col);
    } else if (e.key === "Backspace") {
      if (userInput[key]) {
        setUserInput((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        moveToPreviousCell(row, col);
      }
    } else if (e.key === "ArrowRight") {
      moveInDirection(row, col, 0, 1);
    } else if (e.key === "ArrowLeft") {
      moveInDirection(row, col, 0, -1);
    } else if (e.key === "ArrowDown") {
      moveInDirection(row, col, 1, 0);
    } else if (e.key === "ArrowUp") {
      moveInDirection(row, col, -1, 0);
    } else if (e.key === "Tab") {
      e.preventDefault();
      e.shiftKey ? moveToPreviousClue() : moveToNextClue();
    } else if (e.key === " ") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    }
  };

  const moveToNextCell = (row: number, col: number) => {
    const nextRow = direction === "down" ? row + 1 : row;
    const nextCol = direction === "across" ? col + 1 : col;
    if (
      nextRow < data.gridSize &&
      nextCol < data.gridSize &&
      !data.grid[nextRow][nextCol].isBlack
    ) {
      setSelectedCell({ row: nextRow, col: nextCol });
      focusCell(nextRow, nextCol);
    }
  };

  const moveToPreviousCell = (row: number, col: number) => {
    const prevRow = direction === "down" ? row - 1 : row;
    const prevCol = direction === "across" ? col - 1 : col;
    if (prevRow >= 0 && prevCol >= 0 && !data.grid[prevRow][prevCol].isBlack) {
      setSelectedCell({ row: prevRow, col: prevCol });
      setTimeout(() => {
        focusCell(prevRow, prevCol);
        setUserInput((prev) => {
          const next = { ...prev };
          delete next[`${prevRow}-${prevCol}`];
          return next;
        });
      }, 0);
    }
  };

  const moveInDirection = (row: number, col: number, dRow: number, dCol: number) => {
    let newRow = row + dRow;
    let newCol = col + dCol;
    while (
      newRow >= 0 && newRow < data.gridSize &&
      newCol >= 0 && newCol < data.gridSize
    ) {
      if (!data.grid[newRow][newCol].isBlack) {
        setSelectedCell({ row: newRow, col: newCol });
        focusCell(newRow, newCol);
        return;
      }
      newRow += dRow;
      newCol += dCol;
    }
  };

  const moveToNextClue = () => {
    if (selectedClueId === null) return;
    const idx = data.clues.findIndex((c) => c.id === selectedClueId);
    handleClueClick(data.clues[(idx + 1) % data.clues.length]);
  };

  const moveToPreviousClue = () => {
    if (selectedClueId === null) return;
    const idx = data.clues.findIndex((c) => c.id === selectedClueId);
    handleClueClick(data.clues[(idx - 1 + data.clues.length) % data.clues.length]);
  };

  const handleClear = () => {
    setUserInput({});
    setShowAnswers(false);
    setCheckMode(false);
  };

  const getCellStatus = (row: number, col: number) => {
    if (!checkMode) return { isCorrect: false, isIncorrect: false };
    const key = `${row}-${col}`;
    const cell = data.grid[row][col];
    if (cell.isBlack || !userInput[key]) return { isCorrect: false, isIncorrect: false };
    const isCorrect = userInput[key].toUpperCase() === cell.letter;
    return { isCorrect, isIncorrect: !isCorrect };
  };

  // Pixel-exact grid dimensions so the wrapper never squishes cells
  const gridWidthPx = data.gridSize * CELL_SIZE;
  const gridHeightPx = data.gridSize * CELL_SIZE;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {completedClues.size}/{data.clues.length} clues
          </span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${(completedClues.size / data.clues.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCheckMode(true)}
            className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Check
          </button>
          <button
            onClick={() => { setShowAnswers(true); setCheckMode(false); }}
            className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Reveal
          </button>
          <button
            onClick={handleClear}
            className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Completion banner */}
      {isComplete && (
        <div className="py-2 px-3 bg-foreground text-background rounded text-center text-sm font-medium">
          Puzzle complete!
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Grid */}
        <div className="flex-shrink-0">
          <div className="overflow-auto">
            <div
              className="border border-border bg-background inline-block"
              style={{ minWidth: gridWidthPx }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${data.gridSize}, ${CELL_SIZE}px)`,
                  gridTemplateRows: `repeat(${data.gridSize}, ${CELL_SIZE}px)`,
                  width: gridWidthPx,
                  height: gridHeightPx,
                }}
              >
                {data.grid.flat().map((cell) => {
                  const key = `${cell.row}-${cell.col}`;
                  const isSelected =
                    selectedCell?.row === cell.row && selectedCell?.col === cell.col;
                  const isHighlighted = highlightedCells.has(key);
                  const { isCorrect, isIncorrect } = getCellStatus(cell.row, cell.col);

                  return (
                    <CrosswordCell
                      key={key}
                      cell={cell}
                      userInput={userInput}
                      isSelected={isSelected}
                      isHighlighted={isHighlighted}
                      isCorrect={isCorrect}
                      isIncorrect={isIncorrect}
                      showAnswers={showAnswers}
                      onClick={() => handleCellClick(cell.row, cell.col)}
                      onKeyDown={(e) => handleKeyDown(e, cell.row, cell.col)}
                      inputRef={{
                        current: cellRefs.current.get(key) || null,
                        // @ts-ignore
                        set current(el: HTMLInputElement | null) {
                          if (el) cellRefs.current.set(key, el);
                        },
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Clues */}
        <div className="w-full lg:w-72 lg:max-h-[500px] lg:overflow-y-auto">
          <CluesPanel
            clues={data.clues}
            selectedClueId={selectedClueId}
            onClueClick={handleClueClick}
            completedClues={completedClues}
          />
        </div>
      </div>
    </div>
  );
}
