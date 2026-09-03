const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const getGroqKeys = () =>
  [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
  ].filter(Boolean) as string[];

export const generateWithGroq = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const apiKeys = getGroqKeys();

  if (apiKeys.length === 0) {
    throw new Error(
      "No Groq API key is configured"
    );
  }

  let lastError =
    "Groq request failed";

  for (const apiKey of apiKeys) {
    try {
      const response = await fetch(
        GROQ_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model:
              "openai/gpt-oss-20b",
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
          `Groq request failed with status ${response.status}`;

        console.error(
          "Groq key failed:",
          lastError
        );

        continue;
      }

      const answer =
        data?.choices?.[0]?.message
          ?.content;

      if (!answer?.trim()) {
        lastError =
          "Groq returned an empty response";
        continue;
      }

      return answer.trim();
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Groq request failed";
    }
  }

  throw new Error(lastError);
};