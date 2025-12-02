import { Move, State, StepResult } from '../maker/types';

export function getInitialState(numDisks: number): State {
  // Peg 0 has [n, n-1, ..., 1], others empty
  const peg0 = Array.from({ length: numDisks }, (_, i) => numDisks - i);
  return [peg0, [], []];
}

export function isSolved(state: State, numDisks: number): boolean {
  // Check if peg 2 has all disks in correct order
  if (state[2].length !== numDisks) return false;
  for (let i = 0; i < numDisks; i++) {
     if (state[2][i] !== numDisks - i) return false;
  }
  return true;
}

export function validateMove(state: State, move: Move): boolean {
  const { disk, from, to } = move;
  if (from < 0 || from > 2 || to < 0 || to > 2) return false;
  if (from === to) return false;
  
  const fromPeg = state[from];
  const toPeg = state[to];
  
  if (fromPeg.length === 0) return false;
  const topDiskFrom = fromPeg[fromPeg.length - 1];
  
  if (topDiskFrom !== disk) return false; // Moving disk not on top
  
  if (toPeg.length > 0) {
    const topDiskTo = toPeg[toPeg.length - 1];
    if (disk > topDiskTo) return false; // Larger on smaller
  }
  
  return true;
}

// Red-flagging parser implementation
export function parseHanoiResponse(response: string): StepResult | null {
  // 1. Length Check (Paper says < 750 tokens, we approximate with chars)
  // 750 tokens ~ 3000 chars. 
  if (response.length > 3000) return null;

  try {
    // 2. Format Extraction
    // move = [1, 0, 2]
    const moveMatch = response.match(/move\s*=\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
    if (!moveMatch) return null;

    const move: Move = {
      disk: parseInt(moveMatch[1]),
      from: parseInt(moveMatch[2]),
      to: parseInt(moveMatch[3])
    };

    // next_state = [[...], [...], [...]]
    // This regex is tricky for nested arrays. We'll find "next_state =" and parse the JSON-like structure
    
    // Actually, let's use a robust extraction.
    // We look for the last occurrence of `next_state =`
    const stateIndex = response.lastIndexOf("next_state =");
    if (stateIndex === -1) return null;
    
    let stateStr = response.slice(stateIndex + "next_state =".length).trim();
    // Clean up potentially trailing chars like ''' or code blocks
    stateStr = stateStr.replace(/'''/g, '').replace(/```/g, '').trim();
    
    // Parse JSON (it should be valid JSON array of arrays)
    // We might need to handle Python-style validation if LLM outputs Python list string, but JSON.parse usually works for numbers/arrays.
    let nextState: State;
    try {
        // Find the matching closing bracket
        let bracketCount = 0;
        let endIndex = 0;
        let started = false;
        for (let i = 0; i < stateStr.length; i++) {
            if (stateStr[i] === '[') {
                bracketCount++;
                started = true;
            } else if (stateStr[i] === ']') {
                bracketCount--;
            }
            
            if (started && bracketCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
        const jsonStr = stateStr.slice(0, endIndex);
        nextState = JSON.parse(jsonStr);
    } catch (e) {
        return null;
    }

    // 3. Logic Validation (Red Flagging)
    if (!nextState || nextState.length !== 3) return null;
    // Check if move is integers? Typescript handles types, but runtime check:
    if (isNaN(move.disk) || isNaN(move.from) || isNaN(move.to)) return null;

    return {
      move,
      nextState,
      reasoning: response.substring(0, stateIndex), // Everything before is reasoning
      rawResponse: response
    };

  } catch (e) {
    return null;
  }
}

