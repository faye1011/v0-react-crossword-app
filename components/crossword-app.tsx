"use client";

import { useState, useMemo, useRef } from "react";
import { generateCrossword } from "@/lib/crossword-generator";
import { CrosswordGrid } from "./crossword-grid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";
import { data } from "../app/content/questions.js";

const sampleData = data;

export function CrosswordApp() {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState(sampleData);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(sampleData, null, 2));
  const [showEditor, setShowEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const crosswordRef = useRef<HTMLDivElement>(null);

  const scrollToCrossword = () => {
    crosswordRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    <div className="bg-background">
      {/* Full-page header */}
      <header className="h-screen flex flex-col items-center justify-center relative">
        <h1 className="text-4xl font-semibold text-foreground text-center mb-2">ALFIES BDAY QUIZ</h1>
        <p>happy birthday to my favourite person. here's to doing many many more crosswords together. </p>
        <button
          onClick={scrollToCrossword}
          aria-label="Scroll to crossword"
          className="absolute bottom-10 flex items-center justify-center w-12 h-12 rounded-full border border-border text-foreground hover:bg-muted transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </header>

      {/* Crossword section */}
      <div ref={crosswordRef} className="max-w-7xl mx-auto px-4 py-6">
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
