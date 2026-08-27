import OpenAI from "openai";

const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured"
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
};

export const generateWithOpenRouter = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const client = getOpenRouterClient();

  const response = await client.chat.completions.create({
    model: "~openai/gpt-latest",

    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],

    temperature: 0.4,
    max_tokens: 2000,
  });

  const content =
    response.choices[0]?.message?.content;

  if (!content) {
    throw new Error(
      "OpenRouter returned an empty response"
    );
  }

  return content;
};