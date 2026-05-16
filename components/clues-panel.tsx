"use client";

import { CrosswordClue } from "@/lib/crossword-types";
import { cn } from "@/lib/utils";

interface CluesPanelProps {
  clues: CrosswordClue[];
  selectedClueId: number | null;
  onClueClick: (clue: CrosswordClue) => void;
  completedClues: Set<number>;
}

export function CluesPanel({
  clues,
  selectedClueId,
  onClueClick,
  completedClues,
}: CluesPanelProps) {
  const acrossClues = clues.filter((c) => c.direction === "across");
  const downClues = clues.filter((c) => c.direction === "down");

  const clueNumbers = new Map<number, number>();
  const positionNumbers = new Map<string, number>();
  let currentNumber = 1;

  const sortedClues = [...clues].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  for (const clue of sortedClues) {
    const posKey = `${clue.row}-${clue.col}`;
    if (!positionNumbers.has(posKey)) {
      positionNumbers.set(posKey, currentNumber++);
    }
    clueNumbers.set(clue.id, positionNumbers.get(posKey)!);
  }

  const ClueList = ({
    title,
    items,
  }: {
    title: string;
    items: CrosswordClue[];
  }) => (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((clue) => (
          <button
            key={clue.id}
            onClick={() => onClueClick(clue)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
              selectedClueId === clue.id
                ? "bg-foreground text-background"
                : "hover:bg-muted",
              completedClues.has(clue.id) && "line-through opacity-50"
            )}
          >
            <span className="font-medium text-muted-foreground mr-1.5">
              {clueNumbers.get(clue.id)}
            </span>
            {clue.clue}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <ClueList title="Across" items={acrossClues} />
      <ClueList title="Down" items={downClues} />
    </div>
  );
}
