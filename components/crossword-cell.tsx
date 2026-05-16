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
  const CELL_SIZE = 40;

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
        "relative border border-border transition-colors cursor-pointer bg-background",
        isSelected && "bg-amber-100 dark:bg-amber-900/40 border-amber-400",
        !isSelected && isHighlighted && "bg-amber-50 dark:bg-amber-900/20",
        isCorrect && "bg-green-100 dark:bg-green-900/30",
        isIncorrect && "bg-red-100 dark:bg-red-900/30"
      )}
      onClick={onClick}
    >
      {cell.number && (
        <span className="absolute top-0 left-0.5 text-[9px] text-muted-foreground font-medium leading-none pointer-events-none">
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
        className="w-full h-full bg-transparent text-center text-sm font-medium uppercase outline-none caret-transparent select-none text-foreground"
        readOnly={showAnswers}
        aria-label={`Cell row ${cell.row} col ${cell.col}`}
      />
    </div>
  );
}
