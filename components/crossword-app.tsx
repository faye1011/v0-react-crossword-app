"use client";

import { useState, useMemo, useRef } from "react";
import { generateCrossword } from "@/lib/crossword-generator";
import { CrosswordGrid } from "./crossword-grid";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";
import { Confetti } from "./confetti";
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
      <header className="h-screen flex flex-col items-center justify-center relative bg-gradient-to-b from-green-50 to-white overflow-hidden">
        <Confetti />
        {/* Decorative blobs */}
        <div className="absolute top-16 left-16 w-48 h-48 bg-green-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute bottom-24 right-20 w-64 h-64 bg-emerald-200 rounded-full opacity-25 blur-3xl" />

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both text-center px-4">
          <h1 className="text-5xl font-bold text-black tracking-wide mb-4">
            ALFIES BIRTHDAY QUIZ
          </h1>
          <p className="animate-in fade-in duration-700 delay-300 fill-mode-both text-black-600 text-lg max-w-md mx-auto">
            happy birthday to my favourite person. here&apos;s to doing many many more crosswords together.
          </p>
        </div>

        <button
          onClick={scrollToCrossword}
          aria-label="Scroll to crossword"
          className="animate-in fade-in duration-700 delay-500 fill-mode-both absolute bottom-10 flex items-center justify-center w-12 h-12 rounded-full border-2 border-green-400 text-green-600 hover:bg-green-100 transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </header>

      {/* Crossword section */}
      <div ref={crosswordRef} className="relative bg-gradient-to-b from-green-50/60 to-white min-h-screen">
        {/* Decorative blobs */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-green-100 rounded-full opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-8 w-56 h-56 bg-emerald-100 rounded-full opacity-35 blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 py-10">
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
    </div>
  );
}
