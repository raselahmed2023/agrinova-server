const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

export type AIKeyGroup =
  | "chat"
  | "agentEgg"
  | "other";

const getGroqKeys = (
  group: AIKeyGroup
): string[] => {
  const groups: Record<
    AIKeyGroup,
    Array<string | undefined>
  > = {
    // Normal farmer chat:
    // GROQ 1 -> GROQ 2
    chat: [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
    ],

    // Agent Egg ONLY:
    // GROQ 3
    agentEgg: [
      process.env.GROQ_API_KEY_3,
    ],

    // Other AI features:
    // GROQ 4
    other: [
      process.env.GROQ_API_KEY_4,
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

export const generateWithGroq =
  async (
    systemPrompt: string,
    userPrompt: string,
    group: AIKeyGroup = "chat"
  ): Promise<string> => {
    const apiKeys =
      getGroqKeys(group);

    if (apiKeys.length === 0) {
      throw new Error(
        `${groupLabel(
          group
        )} Groq API key is not configured`
      );
    }

    let lastError =
      `${groupLabel(
        group
      )} Groq request failed`;

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
            GROQ_API_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${apiKey}`,
              },

              body: JSON.stringify(
                {
                  model:
                    process.env
                      .GROQ_MODEL ||
                    "openai/gpt-oss-20b",

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
            )} Groq request failed with status ${
              response.status
            }`;

          console.error(
            `${groupLabel(
              group
            )} Groq key ${
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
            )} Groq returned an empty response`;

          continue;
        }

        return answer.trim();
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : `${groupLabel(
                group
              )} Groq request failed`;
      }
    }

    throw new Error(
      lastError
    );
  };