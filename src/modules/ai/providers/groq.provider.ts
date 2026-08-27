import OpenAI from "openai";

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
};

const cleanThinking = (text: string) => {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
};

export const generateWithGroq = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const client = getGroqClient();

  const response = await client.chat.completions.create({
    model: "qwen/qwen3.6-27b",

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
    throw new Error("Groq returned an empty response");
  }

  return cleanThinking(content);
};