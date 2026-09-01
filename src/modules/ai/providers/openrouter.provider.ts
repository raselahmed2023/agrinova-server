const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const getOpenRouterKeys = () =>
  [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
  ].filter(Boolean) as string[];

export const generateWithOpenRouter = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const apiKeys =
    getOpenRouterKeys();

  if (apiKeys.length === 0) {
    throw new Error(
      "No OpenRouter API key is configured"
    );
  }

  let lastError =
    "OpenRouter request failed";

  for (const apiKey of apiKeys) {
    try {
      const response = await fetch(
        OPENROUTER_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer":
              process.env.APP_URL ||
              "http://localhost:3000",
            "X-Title":
              "AgriNova",
          },
          body: JSON.stringify({
            model:
              "meta-llama/llama-3.3-70b-instruct",
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
            max_tokens: 900,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        lastError =
          data?.error?.message ||
          `OpenRouter request failed with status ${response.status}`;

        continue;
      }

      const answer =
        data?.choices?.[0]?.message
          ?.content;

      if (
        !answer ||
        !answer.trim()
      ) {
        lastError =
          "OpenRouter returned an empty response";

        continue;
      }

      return answer.trim();
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "OpenRouter request failed";
    }
  }

  throw new Error(lastError);
};