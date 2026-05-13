"use client";

import { useState, useMemo } from "react";
import { generateCrossword } from "@/lib/crossword-generator";
import { CrosswordGrid } from "./crossword-grid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { data } from "../app/content/questions.js";
// Sample crossword data - users can replace this
const sampleData = data

export function CrosswordApp() {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState(sampleData);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(sampleData, null, 2));
  const [showEditor, setShowEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0); // For forcing re-render

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
      setKey((k) => k + 1); // Force new crossword
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleReset = () => {
    setKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            Crossword Puzzle
          </h1>
          <p className="text-muted-foreground">
            Solve the puzzle or create your own with custom questions
          </p>
        </header>

        {/* Controls */}
        <div className="flex justify-center gap-3 mb-8">
          <Button
            variant={showEditor ? "default" : "outline"}
            onClick={() => setShowEditor(!showEditor)}
          >
            {showEditor ? "Hide Editor" : "Edit Questions"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            New Puzzle
          </Button>
        </div>

        {/* JSON Editor */}
        {showEditor && (
          <div className="max-w-2xl mx-auto mb-8 p-6 bg-card rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">Customize Your Crossword</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Edit the JSON below with your own questions and answers. Each item needs a{" "}
              <code className="bg-secondary px-1 rounded">question</code> and an{" "}
              <code className="bg-secondary px-1 rounded">answer</code>.
            </p>
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="font-mono text-sm h-64 mb-4"
              placeholder='[{"question": "Your clue here", "answer": "ANSWER"}]'
            />
            {error && (
              <p className="text-destructive text-sm mb-4">{error}</p>
            )}
            <div className="flex gap-3">
              <Button onClick={handleLoadJson}>Load Questions</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setJsonInput(JSON.stringify(sampleData, null, 2));
                  setError(null);
                }}
              >
                Reset to Sample
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

        {/* Instructions */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">How to Use</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="p-4 bg-card rounded-lg">
              <h3 className="font-medium text-foreground mb-2">Playing</h3>
              <ul className="space-y-1">
                <li>• Click a cell to select it</li>
                <li>• Type letters to fill in answers</li>
                <li>• Use arrow keys to navigate</li>
                <li>• Press Space to change direction</li>
                <li>• Press Tab to move to next clue</li>
              </ul>
            </div>
            <div className="p-4 bg-card rounded-lg">
              <h3 className="font-medium text-foreground mb-2">Customizing</h3>
              <ul className="space-y-1">
                <li>• Click &quot;Edit Questions&quot; to open editor</li>
                <li>• Add your own Q&A pairs in JSON</li>
                <li>• Keep answers short (3-12 letters)</li>
                <li>• Click &quot;Load Questions&quot; to generate</li>
                <li>• The algorithm places words automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
