import { WorldModel, State, Move, StepResult } from '../maker/types';

export class HanoiWorld implements WorldModel<State, Move> {
  private numDisks: number;

  constructor(numDisks: number) {
    this.numDisks = numDisks;
  }

  applyMove(state: State, move: Move): State {
    // Deep copy the state to avoid mutation issues
    const newState = state.map(peg => [...peg]);
    
    const disk = newState[move.from].pop(); 
    if (disk === undefined) throw new Error("Invalid move source: Peg is empty");
    
    newState[move.to].push(disk); 
    return newState;
  }

  validateMove(state: State, move: Move): boolean {
    const { disk, from, to } = move;
    
    // Basic bounds checks
    if (from < 0 || from > 2 || to < 0 || to > 2) return false;
    if (from === to) return false;
    
    const fromPeg = state[from];
    const toPeg = state[to];
    
    // Source validation
    if (fromPeg.length === 0) return false;
    const topDiskFrom = fromPeg[fromPeg.length - 1];
    
    if (topDiskFrom !== disk) return false; // Moving disk not on top
    
    // Destination validation
    if (toPeg.length > 0) {
      const topDiskTo = toPeg[toPeg.length - 1];
      if (disk > topDiskTo) return false; // Larger on smaller
    }
    
    return true;
  }

  isSolved(state: State): boolean {
    // Check if peg 2 has all disks in correct order
    if (state[2].length !== this.numDisks) return false;
    for (let i = 0; i < this.numDisks; i++) {
       if (state[2][i] !== this.numDisks - i) return false;
    }
    return true;
  }

  stateToString(state: State): string {
    return JSON.stringify(state);
  }

  moveToString(move: Move): string {
    return `[${move.disk}, ${move.from}, ${move.to}]`;
  }

  parseMove(response: string, currentState: State): StepResult | null {
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

        // 3. Logic Validation (Red Flagging)
        if (isNaN(move.disk) || isNaN(move.from) || isNaN(move.to)) return null;
        
        // CRITICAL: Validate against current state rules
        if (!this.validateMove(currentState, move)) {
            console.log("Red Flag: Invalid Move Proposed", move);
            return null;
        }

        // 4. Deterministic State Update
        // We ignore the LLM's `next_state` string entirely for the game logic,
        // but we calculate it ourselves to complete the StepResult.
        const nextState = this.applyMove(currentState, move);

        // We can try to find where the reasoning ends for logging purposes
        const stateIndex = response.lastIndexOf("next_state =");
        const reasoning = stateIndex !== -1 ? response.substring(0, stateIndex) : response;

        return {
          move,
          nextState,
          reasoning,
          rawResponse: response
        };

      } catch (e) {
        return null;
      }
  }
}

