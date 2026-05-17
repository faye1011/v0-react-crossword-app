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
  initialRotation: number;
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
        initialRotation: Math.random() * 360,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-12px",
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: "1px",
            opacity: 0,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in infinite`,
            transform: `rotate(${p.initialRotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
