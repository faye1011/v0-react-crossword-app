"use client";

import { Cell, UserInput } from "@/lib/crossword-types";
import { cn } from "@/lib/utils";

interface CrosswordCellProps {
  cell: Cell;
  userInput: UserInput;
  isSelected: boolean;
  isHighlighted: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  showAnswers: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function CrosswordCell({
  cell,
  userInput,
  isSelected,
  isHighlighted,
  isCorrect,
  isIncorrect,
  showAnswers,
  onClick,
  onKeyDown,
  inputRef,
}: CrosswordCellProps) {
  // Fixed cell size — never changes regardless of viewport
  const CELL_SIZE = 44; // px

  if (cell.isBlack) {
    return (
      <div
        style={{ width: CELL_SIZE, height: CELL_SIZE, flexShrink: 0 }}
        className="bg-foreground"
      />
    );
  }

  const cellKey = `${cell.row}-${cell.col}`;
  const userLetter = userInput[cellKey] || "";
  const displayLetter = showAnswers ? cell.letter : userLetter;

  return (
    <div
      style={{ width: CELL_SIZE, height: CELL_SIZE, flexShrink: 0 }}
      className={cn(
        "relative border border-border transition-colors cursor-pointer",
        isSelected && "bg-[var(--cell-active)] border-primary",
        !isSelected && isHighlighted && "bg-[var(--cell-highlighted)]",
        !isSelected && !isHighlighted && "bg-card",
        isCorrect && "bg-[var(--cell-correct)]",
        isIncorrect && "bg-[var(--cell-incorrect)]"
      )}
      onClick={onClick}
    >
      {cell.number && (
        <span className="absolute top-0.5 left-0.5 text-[9px] text-muted-foreground font-semibold leading-none pointer-events-none">
          {cell.number}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        maxLength={1}
        value={displayLetter}
        onChange={() => {}}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full h-full bg-transparent text-center text-base font-bold uppercase outline-none caret-transparent select-none",
          isSelected ? "text-primary-foreground" : "text-foreground"
        )}
        readOnly={showAnswers}
        aria-label={`Cell row ${cell.row} col ${cell.col}`}
      />
    </div>
  );
}
