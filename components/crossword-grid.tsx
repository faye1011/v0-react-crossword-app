"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { CrosswordData, CrosswordClue, UserInput } from "@/lib/crossword-types";
import { CrosswordCell } from "./crossword-cell";
import { CluesPanel } from "./clues-panel";
import { Button } from "@/components/ui/button";

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

  // Fixed cell size in px — must match crossword-cell.tsx
  const CELL_SIZE = 44;

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
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Progress */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Progress:</span>
          <div className="w-28 h-2 bg-secondary rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completedClues.size / data.clues.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {completedClues.size}/{data.clues.length}
          </span>
        </div>
        {/* Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setCheckMode(true)}>Check</Button>
          <Button variant="outline" size="sm" onClick={() => { setShowAnswers(true); setCheckMode(false); }}>Reveal</Button>
          <Button variant="outline" size="sm" onClick={handleClear}>Clear</Button>
        </div>
      </div>

      {/* Completion banner */}
      {isComplete && (
        <div className="p-4 bg-[var(--cell-correct)] rounded-lg text-center">
          <p className="text-lg font-bold text-foreground">
            🎉 Congratulations! You completed the crossword!
          </p>
        </div>
      )}

      {/*
        Main layout:
        - On large screens: grid (75%) | clues (25%) side by side
        - On small screens: grid on top, clues below (stacked)
        The grid area scrolls horizontally if the viewport is narrower than the grid,
        but cells never shrink.
      */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Grid column ── takes up 75% on large screens */}
        <div className="w-full lg:w-[75%] flex-shrink-0 min-w-0">
          {/* Scrollable wrapper — scrolls horizontally on very small screens
              rather than squishing the cells */}
          <div className="overflow-auto">
            {/* The inner div is sized to exactly fit the grid, no more, no less */}
            <div
              className="border border-border bg-background rounded-lg p-1 inline-block"
              style={{ minWidth: gridWidthPx + 2 /* +border */ }}
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

        {/* ── Clues column ── takes up 25% on large screens, full width below */}
        <div className="w-full lg:w-[25%] flex-shrink-0">
          {/* On large screens the clues panel scrolls independently so it
              doesn't push the grid around. Max-height matches a typical grid. */}
          <div className="bg-secondary/30 rounded-lg p-4 lg:max-h-[600px] lg:overflow-y-auto">
            <CluesPanel
              clues={data.clues}
              selectedClueId={selectedClueId}
              onClueClick={handleClueClick}
              completedClues={completedClues}
            />
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">Space</kbd> Toggle direction
        </span>
        <span>
          <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">Tab</kbd> Next clue
        </span>
        <span>
          <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">↑↓←→</kbd> Navigate
        </span>
      </div>
    </div>
  );
}
