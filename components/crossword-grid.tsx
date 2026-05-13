"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { CrosswordData, CrosswordClue, UserInput } from "@/lib/crossword-types";
import { CrosswordCell } from "./crossword-cell";
import { CluesPanel } from "./clues-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      if (clueCorrect) {
        newCompleted.add(clue.id);
      }
    }

    setCompletedClues(newCompleted);
    setIsComplete(allCorrect);
  }, [data.clues, userInput]);

  useEffect(() => {
    checkCompletion();
  }, [userInput, checkCompletion]);

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    const cell = data.grid[row][col];
    if (cell.isBlack) return;

    // If clicking same cell, toggle direction
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setSelectedCell({ row, col });
    }

    // Find the clue for this cell and direction
    const clue = data.clues.find(
      (c) =>
        c.direction === (selectedCell?.row === row && selectedCell?.col === col 
          ? (direction === "across" ? "down" : "across") 
          : direction) &&
        cell.clueIds.includes(c.id)
    );
    
    if (clue) {
      setSelectedClueId(clue.id);
    } else {
      // Try the other direction
      const otherClue = data.clues.find(
        (c) => cell.clueIds.includes(c.id)
      );
      if (otherClue) {
        setSelectedClueId(otherClue.id);
        setDirection(otherClue.direction);
      }
    }

    // Focus the input
    const key = `${row}-${col}`;
    setTimeout(() => {
      cellRefs.current.get(key)?.focus();
    }, 0);
  };

  // Handle clue click
  const handleClueClick = (clue: CrosswordClue) => {
    setSelectedClueId(clue.id);
    setDirection(clue.direction);
    setSelectedCell({ row: clue.row, col: clue.col });

    const key = `${clue.row}-${clue.col}`;
    setTimeout(() => {
      cellRefs.current.get(key)?.focus();
    }, 0);
  };

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (showAnswers) return;

    const key = `${row}-${col}`;
    const cell = data.grid[row][col];

    if (e.key.match(/^[a-zA-Z]$/)) {
      // Letter input
      setUserInput((prev) => ({
        ...prev,
        [key]: e.key.toUpperCase(),
      }));

      // Move to next cell
      moveToNextCell(row, col);
    } else if (e.key === "Backspace") {
      if (userInput[key]) {
        // Clear current cell
        setUserInput((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        // Move to previous cell
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
      if (e.shiftKey) {
        moveToPreviousClue();
      } else {
        moveToNextClue();
      }
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
      const key = `${nextRow}-${nextCol}`;
      setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
    }
  };

  const moveToPreviousCell = (row: number, col: number) => {
    const prevRow = direction === "down" ? row - 1 : row;
    const prevCol = direction === "across" ? col - 1 : col;

    if (prevRow >= 0 && prevCol >= 0 && !data.grid[prevRow][prevCol].isBlack) {
      setSelectedCell({ row: prevRow, col: prevCol });
      const key = `${prevRow}-${prevCol}`;
      setTimeout(() => {
        cellRefs.current.get(key)?.focus();
        // Also clear that cell
        setUserInput((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 0);
    }
  };

  const moveInDirection = (row: number, col: number, dRow: number, dCol: number) => {
    let newRow = row + dRow;
    let newCol = col + dCol;

    while (
      newRow >= 0 &&
      newRow < data.gridSize &&
      newCol >= 0 &&
      newCol < data.gridSize
    ) {
      if (!data.grid[newRow][newCol].isBlack) {
        setSelectedCell({ row: newRow, col: newCol });
        const key = `${newRow}-${newCol}`;
        setTimeout(() => cellRefs.current.get(key)?.focus(), 0);
        return;
      }
      newRow += dRow;
      newCol += dCol;
    }
  };

  const moveToNextClue = () => {
    if (selectedClueId === null) return;
    const currentIndex = data.clues.findIndex((c) => c.id === selectedClueId);
    const nextIndex = (currentIndex + 1) % data.clues.length;
    handleClueClick(data.clues[nextIndex]);
  };

  const moveToPreviousClue = () => {
    if (selectedClueId === null) return;
    const currentIndex = data.clues.findIndex((c) => c.id === selectedClueId);
    const prevIndex = (currentIndex - 1 + data.clues.length) % data.clues.length;
    handleClueClick(data.clues[prevIndex]);
  };

  const handleClear = () => {
    setUserInput({});
    setShowAnswers(false);
    setCheckMode(false);
  };

  const handleReveal = () => {
    setShowAnswers(true);
    setCheckMode(false);
  };

  const handleCheck = () => {
    setCheckMode(true);
  };

  // Get cell status for check mode
  const getCellStatus = (row: number, col: number) => {
    if (!checkMode) return { isCorrect: false, isIncorrect: false };
    const key = `${row}-${col}`;
    const cell = data.grid[row][col];
    if (cell.isBlack || !userInput[key]) return { isCorrect: false, isIncorrect: false };
    const isCorrect = userInput[key].toUpperCase() === cell.letter;
    return { isCorrect, isIncorrect: !isCorrect };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Progress:</span>
          <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${(completedClues.size / data.clues.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-sm font-medium">
            {completedClues.size}/{data.clues.length}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCheck}>
            Check
          </Button>
          <Button variant="outline" size="sm" onClick={handleReveal}>
            Reveal
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Success message */}
      {isComplete && (
        <div className="p-4 bg-[var(--cell-correct)] rounded-lg text-center">
          <p className="text-lg font-bold text-foreground">
            🎉 Congratulations! You completed the crossword!
          </p>
        </div>
      )}

      {/* Grid and Clues */}
      <div className="grid lg:grid-cols-[auto_1fr] gap-8">
        {/* Grid */}
        <div className="overflow-auto">
          <div
            className="inline-grid gap-0 border border-border bg-background p-1 rounded-lg"
            style={{
              gridTemplateColumns: `repeat(${data.gridSize}, minmax(0, 1fr))`,
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

        {/* Clues */}
        <div className="bg-secondary/30 rounded-lg p-4 md:p-6">
          <CluesPanel
            clues={data.clues}
            selectedClueId={selectedClueId}
            onClueClick={handleClueClick}
            completedClues={completedClues}
          />
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-sm text-muted-foreground space-x-4">
        <span>
          <kbd className="px-2 py-1 bg-secondary rounded text-xs">Space</kbd> Toggle direction
        </span>
        <span>
          <kbd className="px-2 py-1 bg-secondary rounded text-xs">Tab</kbd> Next clue
        </span>
        <span>
          <kbd className="px-2 py-1 bg-secondary rounded text-xs">Arrows</kbd> Navigate
        </span>
      </div>
    </div>
  );
}
