import { solveProblem } from '@/lib/maker/solver';
import { HanoiWorld } from '@/lib/hanoi/hanoi-world';
import { getInitialState } from '@/lib/hanoi/hanoi-problem';

export const runtime = 'nodejs'; // Use node runtime for OpenAI
export const maxDuration = 300; // 5 minutes max

export async function POST(req: Request) {
  const { numDisks = 3, k = 3, maxVotes = 10 } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Instantiate the World Model
        const cappedDisks = Math.min(numDisks, 10); // Safety cap
        const world = new HanoiWorld(cappedDisks);
        const initialState = getInitialState(cappedDisks);

        // 2. Run the Generic Solver
        const generator = solveProblem(
            world,
            initialState,
            { 
                numDisks: cappedDisks,
                k, 
                maxVotes 
            }
        );

        for await (const event of generator) {
          // Send event as SSE format
          // data: JSON\n\n
          const chunk = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("Stream Error", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
