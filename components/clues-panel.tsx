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

  // Create a map of clue id to display number based on starting position
  const clueNumbers = new Map<number, number>();
  const positionNumbers = new Map<string, number>();
  let currentNumber = 1;

  // Sort all clues by position
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

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded">→</span>
          Across
        </h3>
        <div className="space-y-2">
          {acrossClues.map((clue) => (
            <button
              key={clue.id}
              onClick={() => onClueClick(clue)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all text-sm",
                selectedClueId === clue.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary",
                completedClues.has(clue.id) && "line-through opacity-60"
              )}
            >
              <span className="font-bold mr-2">{clueNumbers.get(clue.id)}.</span>
              {clue.clue}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded">↓</span>
          Down
        </h3>
        <div className="space-y-2">
          {downClues.map((clue) => (
            <button
              key={clue.id}
              onClick={() => onClueClick(clue)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all text-sm",
                selectedClueId === clue.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary",
                completedClues.has(clue.id) && "line-through opacity-60"
              )}
            >
              <span className="font-bold mr-2">{clueNumbers.get(clue.id)}.</span>
              {clue.clue}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
