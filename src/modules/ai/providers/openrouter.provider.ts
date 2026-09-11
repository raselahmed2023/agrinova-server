import type {
  AIKeyGroup,
} from "./groq.provider.js";

const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const getOpenRouterKeys = (
  group: AIKeyGroup
): string[] => {
  const groups: Record<
    AIKeyGroup,
    Array<string | undefined>
  > = {
    // Normal farmer chat:
    // OPENROUTER 1 -> OPENROUTER 2
    chat: [
      process.env
        .OPENROUTER_API_KEY_1,

      process.env
        .OPENROUTER_API_KEY_2,
    ],

    // Agent Egg ONLY:
    // OPENROUTER 3
    agentEgg: [
      process.env
        .OPENROUTER_API_KEY_3,
    ],

    // Other AI:
    // OPENROUTER 4
    other: [
      process.env
        .OPENROUTER_API_KEY_4,
    ],
  };

  return groups[group]
    .map((key) => key?.trim())
    .filter(
      (key): key is string =>
        Boolean(key)
    );
};

const groupLabel = (
  group: AIKeyGroup
) => {
  if (group === "agentEgg") {
    return "Agent Egg";
  }

  if (group === "other") {
    return "Other AI";
  }

  return "Chat AI";
};

export const generateWithOpenRouter =
  async (
    systemPrompt: string,
    userPrompt: string,
    group: AIKeyGroup = "chat"
  ): Promise<string> => {
    const apiKeys =
      getOpenRouterKeys(
        group
      );

    if (apiKeys.length === 0) {
      throw new Error(
        `${groupLabel(
          group
        )} OpenRouter API key is not configured`
      );
    }

    let lastError =
      `${groupLabel(
        group
      )} OpenRouter request failed`;

    for (
      let index = 0;
      index < apiKeys.length;
      index += 1
    ) {
      const apiKey =
        apiKeys[index];

      try {
        const response =
          await fetch(
            OPENROUTER_API_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${apiKey}`,

                "HTTP-Referer":
                  process.env
                    .CLIENT_URL ||
                  process.env.APP_URL ||
                  "http://localhost:3000",

                "X-Title":
                  "AgriNova",
              },

              body: JSON.stringify(
                {
                  model:
                    process.env
                      .OPENROUTER_MODEL ||
                    "meta-llama/llama-3.3-70b-instruct",

                  messages: [
                    {
                      role: "system",
                      content:
                        systemPrompt,
                    },

                    {
                      role: "user",
                      content:
                        userPrompt,
                    },
                  ],

                  temperature: 0.4,

                  max_tokens: 900,
                }
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          lastError =
            data?.error?.message ||
            `${groupLabel(
              group
            )} OpenRouter request failed with status ${
              response.status
            }`;

          console.error(
            `${groupLabel(
              group
            )} OpenRouter key ${
              index + 1
            } failed:`,
            lastError
          );

          continue;
        }

        const answer =
          data?.choices?.[0]
            ?.message?.content;

        if (!answer?.trim()) {
          lastError =
            `${groupLabel(
              group
            )} OpenRouter returned an empty response`;

          continue;
        }

        return answer.trim();
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : `${groupLabel(
                group
              )} OpenRouter request failed`;
      }
    }

    throw new Error(
      lastError
    );
  };