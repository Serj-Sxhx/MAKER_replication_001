import { SYSTEM_PROMPT, USER_TEMPLATE } from '../hanoi/prompts';
import { solveStepWithVotingGenerator, VotingEvent } from './voting';
import { getInitialState, isSolved, parseHanoiResponse } from '../hanoi/hanoi-problem';
import { State, Move, StepResult } from './types';

export interface SolverConfig {
  numDisks: number;
  k: number;
  maxVotes: number;
}

export type SolverEvent = 
  | { type: 'start'; config: SolverConfig }
  | { type: 'step_start'; step: number; state: State }
  | { type: 'voting_update'; step: number; data: VotingEvent }
  | { type: 'step_complete'; step: number; result: StepResult }
  | { type: 'solved'; moves: Move[] }
  | { type: 'error'; message: string };

export async function* solveHanoi(config: SolverConfig): AsyncGenerator<SolverEvent> {
  const state = getInitialState(config.numDisks);
  let currentState = state;
  let previousMove: Move = { disk: 0, from: -1, to: -1 }; 
  const moves: Move[] = [];
  let stepCount = 0;

  yield { type: 'start', config };

  const maxSteps = Math.pow(2, config.numDisks) - 1;

  while (!isSolved(currentState, config.numDisks)) {
    stepCount++;
    if (stepCount > maxSteps + 20) { 
        yield { type: 'error', message: "Exceeded max expected steps." };
        break;
    }

    yield { type: 'step_start', step: stepCount, state: currentState };

    const prevMoveStr = previousMove.from === -1 ? "None" : `[${previousMove.disk}, ${previousMove.from}, ${previousMove.to}]`;
    const stateStr = JSON.stringify(currentState);
    
    const userPrompt = USER_TEMPLATE
      .replace('{previous_move}', prevMoveStr)
      .replace('{current_state}', stateStr);

    const votingGen = solveStepWithVotingGenerator(
      SYSTEM_PROMPT,
      userPrompt,
      parseHanoiResponse,
      { k: config.k, maxVotes: config.maxVotes }
    );

    let stepResult: StepResult | null = null;

    for await (const event of votingGen) {
        if (event.type === 'decision') {
            stepResult = event.result;
        }
        yield { type: 'voting_update', step: stepCount, data: event };
    }

    if (!stepResult) {
        yield { type: 'error', message: "Failed to find valid move." };
        break;
    }

    yield { type: 'step_complete', step: stepCount, result: stepResult };

    moves.push(stepResult.move);
    currentState = stepResult.nextState;
    previousMove = stepResult.move;
  }

  yield { type: 'solved', moves };
}
