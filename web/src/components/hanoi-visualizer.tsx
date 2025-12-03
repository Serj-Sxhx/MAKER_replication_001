"use client";

import React, { useMemo } from "react";
import { State } from "@/lib/maker/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HanoiVisualizerProps {
  state: State;
  numDisks: number;
}

export function HanoiVisualizer({ state, numDisks }: HanoiVisualizerProps) {
  // Convert state [[3,2,1], [], []] to tiles format for rendering
  const tiles = useMemo(() => {
    const t = [];
    // state[0] is Peg 0 (left), state[1] is Peg 1 (center), state[2] is Peg 2 (right)
    // The state arrays have disks from bottom to top? 
    // Wait, getInitialState creates [n, n-1, ... 1]. 
    // Standard Hanoi often represents stacks as bottom-first or top-first?
    // My getInitialState: [3, 2, 1]. Push/Pop implies end is top.
    // So [3, 2, 1]: 3 is at index 0 (bottom), 1 is at index 2 (top).
    // Let's verify standard JS stack behavior: push adds to end, pop takes from end.
    // Yes.
    
    for (let pegIndex = 0; pegIndex < 3; pegIndex++) {
      const peg = state[pegIndex];
      for (let i = 0; i < peg.length; i++) {
        const diskSize = peg[i]; // 1 is small, N is large
        // Calculate width: disk 1 is smallest.
        // Let's say max width is 100%, min is 20%.
        // width = (diskSize / numDisks) * 100 ?
        
        t.push({
          id: `disk-${diskSize}`,
          size: diskSize,
          column: pegIndex, // 0, 1, 2
          row: i, // 0 is bottom
        });
      }
    }
    return t;
  }, [state, numDisks]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-[600px] bg-slate-50 border rounded-xl relative overflow-hidden">
      <div className="flex justify-around items-end w-full max-w-4xl h-[400px] px-8 relative">
        {/* Base Platform */}
        <div className="absolute bottom-0 left-10 right-10 h-4 bg-slate-800 rounded-full" />

        {[0, 1, 2].map((pegId) => (
          <div key={pegId} className="relative flex flex-col-reverse items-center justify-start w-1/3 h-full z-20 pb-4 group">
            {/* Peg Pole (Absolute Background) */}
            <div className="absolute bottom-0 w-4 h-[300px] bg-amber-700 rounded-t-lg z-0" />
            
            {/* Drop Zone Highlight (Optional) */}
            <div className="absolute bottom-0 w-full h-[320px] bg-transparent z-10" />

            {/* Disks (Flex Items, Z-Index High) */}
            {tiles
                .filter(t => t.column === pegId)
                .sort((a, b) => b.size - a.size) // Sort so smallest is at end of array (top of visual stack in flex-col-reverse? No.)
                // Stack: [3, 2, 1]. 3 is bottom.
                // flex-col-reverse renders last element at TOP.
                // So we want order [3, 2, 1] -> 1 is last -> 1 is Top. Correct.
                .map((tile) => (
                <motion.div
                    layoutId={tile.id}
                    key={tile.id}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                    "h-8 rounded-md shadow-sm border border-black/10 z-20",
                    getDiskColor(tile.size, numDisks)
                    )}
                    style={{
                    width: `${(tile.size / numDisks) * 100}%`,
                    maxWidth: '90%',
                    minWidth: '20%'
                    }}
                >
                    <span className="hidden">{tile.size}</span>
                </motion.div>
                ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function getDiskColor(size: number, total: number): string {
  // Generate a gradient or distinct colors
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", 
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
    "bg-rose-500"
  ];
  return colors[(size - 1) % colors.length];
}

