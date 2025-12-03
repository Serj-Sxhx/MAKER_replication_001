import { SYSTEM_PROMPT, USER_TEMPLATE } from '../hanoi/prompts';
import { solveStepWithVotingGenerator, VotingEvent } from './voting';
import { State, Move, StepResult, WorldModel } from './types';

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

export async function* solveProblem<S, M>(
    world: WorldModel<S, M>,
    initialState: S,
    config: SolverConfig
): AsyncGenerator<SolverEvent> {
  let currentState = initialState;
  let previousMove: Move = { disk: 0, from: -1, to: -1 }; // This is specific to Hanoi move structure, but needed for prompt
  const moves: any[] = [];
  let stepCount = 0;

  yield { type: 'start', config };

  // Heuristic limit, maybe should be configurable or part of WorldModel?
  // For Hanoi: 2^n - 1. For others?
  const maxSteps = Math.pow(2, config.numDisks) * 2; 

  while (!world.isSolved(currentState)) {
    stepCount++;
    if (stepCount > maxSteps) { 
        yield { type: 'error', message: "Exceeded max expected steps." };
        break;
    }

    // Type cast because generic S vs specific State is tricky in TS without complex constraints
    yield { type: 'step_start', step: stepCount, state: currentState as unknown as State };

    const prevMoveStr = previousMove.from === -1 ? "None" : world.moveToString(previousMove as unknown as M);
    const stateStr = world.stateToString(currentState);
    
    // Note: Templates are still Hanoi specific currently. 
    // Ideally we'd move template generation to WorldModel or a separate PromptManager.
    const userPrompt = USER_TEMPLATE
      .replace('{previous_move}', prevMoveStr)
      .replace('{current_state}', stateStr);

    // Create a bound parser that has access to the current world state
    const boundParser = (response: string) => world.parseMove(response, currentState);

    const votingGen = solveStepWithVotingGenerator(
      SYSTEM_PROMPT,
      userPrompt,
      boundParser,
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
    
    // Deterministic Update via World Model
    currentState = world.applyMove(currentState, stepResult.move as unknown as M);
    previousMove = stepResult.move;
  }

  yield { type: 'solved', moves };
}
