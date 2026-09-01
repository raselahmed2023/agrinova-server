import OpenAI from "openai";

const getGroqClient = (apiKey: string) => {
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

const generateWithGroqKey = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const client = getGroqClient(apiKey);

  const response =
    await client.chat.completions.create({
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
    throw new Error(
      "Groq returned an empty response"
    );
  }

  return cleanThinking(content);
};

export const generateRecommendationWithGroq =
  async (
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> => {
    const apiKey =
      process.env.GROQ_API_KEY_1;

    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY_1 is not configured"
      );
    }

    return generateWithGroqKey(
      apiKey,
      systemPrompt,
      userPrompt
    );
  };

export const generateAssistantWithGroq =
  async (
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> => {
    const apiKey =
      process.env.GROQ_API_KEY_2;

    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY_2 is not configured"
      );
    }

    return generateWithGroqKey(
      apiKey,
      systemPrompt,
      userPrompt
    );
  };