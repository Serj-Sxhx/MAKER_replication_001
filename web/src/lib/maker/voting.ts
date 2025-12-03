import { callLLM } from './llm';
import { StepResult, VoteResult } from './types';

export interface VotingConfig {
  k: number;
  maxVotes: number;
}

export type ResponseParser = (response: string) => StepResult | null;

export type VotingEvent = 
  | { type: 'vote_cast'; candidate: StepResult | null; raw: string; voteCount: number }
  | { type: 'vote_rejected'; raw: string; reason: string; voteCount: number }
  | { type: 'vote_progress'; total: number; leader: string; leaderVotes: number; secondVotes: number; margin: number }
  | { type: 'decision'; result: StepResult; reason: string };


export async function* solveStepWithVotingGenerator(
  systemPrompt: string,
  userPrompt: string,
  parser: ResponseParser,
  config: VotingConfig
): AsyncGenerator<VotingEvent, StepResult | null, unknown> {
  const votes: Record<string, number> = {};
  const candidates: Record<string, StepResult> = {};
  
  let totalVotes = 0;
  
  while (totalVotes < config.maxVotes) {
    const temperature = totalVotes === 0 ? 0 : 0.1;
    const response = await callLLM(systemPrompt, userPrompt, temperature);
    const result = parser(response.content);
    
    // Always increment total attempts
    totalVotes++;
    
    if (!result) {
        // Red-flagged
        yield {
            type: 'vote_rejected',
            raw: response.content,
            reason: 'Invalid format or illegal move',
            voteCount: totalVotes
        };
        continue;
    }

    // Yield valid vote cast
    yield { 
        type: 'vote_cast', 
        candidate: result, 
        raw: response.content, 
        voteCount: totalVotes 
    };

    const key = JSON.stringify({ move: result.move, state: result.nextState });
    
    if (!votes[key]) {
      votes[key] = 0;
      candidates[key] = result;
    }
    votes[key]++;

    const sortedKeys = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
    const leadingKey = sortedKeys[0];
    const secondKey = sortedKeys.length > 1 ? sortedKeys[1] : null;

    const leaderVotes = votes[leadingKey];
    const secondVotes = secondKey ? votes[secondKey] : 0;
    const margin = leaderVotes - secondVotes;

    yield {
        type: 'vote_progress',
        total: totalVotes,
        leader: leadingKey,
        leaderVotes,
        secondVotes,
        margin
    };

    if (margin >= config.k) {
      const winner = candidates[leadingKey];
      yield { type: 'decision', result: winner, reason: 'consensus' };
      return winner;
    }
  }

  // Fallback
  const sortedKeys = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
  if (sortedKeys.length > 0) {
      const winner = candidates[sortedKeys[0]];
      yield { type: 'decision', result: winner, reason: 'max_votes' };
      return winner;
  }

  return null;
}
