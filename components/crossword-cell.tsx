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
  if (cell.isBlack) {
    return <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-foreground" />;
  }

  const cellKey = `${cell.row}-${cell.col}`;
  const userLetter = userInput[cellKey] || "";
  const displayLetter = showAnswers ? cell.letter : userLetter;

  return (
    <div
      className={cn(
        "relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-border transition-colors cursor-pointer",
        isSelected && "bg-[var(--cell-active)] border-primary",
        !isSelected && isHighlighted && "bg-[var(--cell-highlighted)]",
        !isSelected && !isHighlighted && "bg-card",
        isCorrect && "bg-[var(--cell-correct)]",
        isIncorrect && "bg-[var(--cell-incorrect)]"
      )}
      onClick={onClick}
    >
      {cell.number && (
        <span className="absolute top-0 left-0.5 text-[8px] sm:text-[10px] md:text-xs text-muted-foreground font-medium leading-none">
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
          "w-full h-full bg-transparent text-center text-base sm:text-lg md:text-xl font-bold uppercase outline-none caret-transparent",
          isSelected ? "text-primary-foreground" : "text-foreground"
        )}
        readOnly={showAnswers}
      />
    </div>
  );
}
