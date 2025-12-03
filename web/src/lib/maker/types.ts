
export interface Agent {
  id: string;
  role: string;
}

export interface Move {
  disk: number;
  from: number;
  to: number;
}

// Generic State interface - for Hanoi it will be number[][]
export type State = number[][];

export interface StepResult {
  move: Move;
  nextState: State;
  reasoning: string;
  rawResponse: string;
}

export interface WorldModel<S, M> {
  applyMove(state: S, move: M): S;
  validateMove(state: S, move: M): boolean;
  isSolved(state: S): boolean;
  stateToString(state: S): string;
  moveToString(move: M): string;
  parseMove(response: string, currentState: S): Promise<StepResult | null> | StepResult | null;
}

export interface VoteResult {
  winner: StepResult | null;
  candidates: StepResult[];
  voteCounts: Record<string, number>;
  totalVotes: number;
  decided: boolean;
  reason: "consensus" | "timeout" | "max_votes" | null;
}

