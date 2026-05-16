"use client";

import { useState, useMemo } from "react";
import { generateCrossword } from "@/lib/crossword-generator";
import { CrosswordGrid } from "./crossword-grid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { data } from "../app/content/questions.js";

const sampleData = data;

export function CrosswordApp() {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState(sampleData);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(sampleData, null, 2));
  const [showEditor, setShowEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const crosswordData = useMemo(() => {
    return generateCrossword(questionsAndAnswers);
  }, [questionsAndAnswers]);

  const handleLoadJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array");
      }
      for (const item of parsed) {
        if (!item.question || !item.answer) {
          throw new Error("Each item must have 'question' and 'answer' fields");
        }
      }
      setQuestionsAndAnswers(parsed);
      setError(null);
      setShowEditor(false);
      setKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleReset = () => {
    setKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">Crossword</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditor(!showEditor)}
            >
              {showEditor ? "Close" : "Edit"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              New
            </Button>
          </div>
        </header>

        {/* JSON Editor */}
        {showEditor && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="font-mono text-sm h-48 mb-3 bg-background"
              placeholder='[{"question": "Your clue here", "answer": "ANSWER"}]'
            />
            {error && <p className="text-destructive text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleLoadJson}>
                Load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJsonInput(JSON.stringify(sampleData, null, 2));
                  setError(null);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Crossword Grid */}
        {crosswordData.clues.length > 0 ? (
          <CrosswordGrid key={key} data={crosswordData} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No crossword could be generated. Try adding more questions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
