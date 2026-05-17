"use client";

import { useEffect, useState } from "react";

const COLORS = ["#86efac", "#4ade80", "#22c55e", "#bbf7d0", "#fde68a", "#d9f99d", "#ffffff"];
const COUNT = 28;

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  width: number;
  height: number;
  color: string;
}

export function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 5,
        width: 4 + Math.random() * 6,
        height: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          8%   { opacity: 0.75; }
          88%  { opacity: 0.5; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: "1px",
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in infinite`,
          }}
        />
      ))}
    </div>
  );
}
