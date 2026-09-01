import OpenAI from "openai";

const getOpenRouterClient = (
  apiKey: string
) => {
  return new OpenAI({
    apiKey,
    baseURL:
      "https://openrouter.ai/api/v1",
  });
};

const generateWithOpenRouterKey =
  async (
    apiKey: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> => {
    const client =
      getOpenRouterClient(apiKey);

    const response =
      await client.chat.completions.create({
        model:
          process.env.OPENROUTER_MODEL ||
          "openai/gpt-4.1-mini",

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
      response.choices[0]?.message
        ?.content;

    if (!content) {
      throw new Error(
        "OpenRouter returned an empty response"
      );
    }

    return content.trim();
  };

export const generateRecommendationWithOpenRouter =
  async (
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> => {
    const apiKey =
      process.env.OPENROUTER_API_KEY_1;

    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY_1 is not configured"
      );
    }

    return generateWithOpenRouterKey(
      apiKey,
      systemPrompt,
      userPrompt
    );
  };

export const generateAssistantWithOpenRouter =
  async (
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> => {
    const apiKey =
      process.env.OPENROUTER_API_KEY_2;

    if (!apiKey) {
      throw new Error(
        "OPENROUTER_API_KEY_2 is not configured"
      );
    }

    return generateWithOpenRouterKey(
      apiKey,
      systemPrompt,
      userPrompt
    );
  };