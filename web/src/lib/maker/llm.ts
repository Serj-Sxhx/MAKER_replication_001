import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LLMResponse {
  content: string;
  tokens: number;
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.1
): Promise<LLMResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature,
      max_tokens: 1000, // Hard limit to prevent loops, though paper says 750 for red-flagging
    });

    const content = completion.choices[0]?.message?.content || "";
    const tokens = completion.usage?.total_tokens || 0;

    return { content, tokens };
  } catch (error) {
    console.error("LLM Call Error:", error);
    throw error;
  }
}

