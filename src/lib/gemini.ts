interface GeminiHistoryItem {
  role: "user" | "model";
  text: string;
}

interface GenerateTextInput {
  prompt: string;
  systemInstruction?: string;
  history?: GeminiHistoryItem[];
  responseMimeType?: "text/plain" | "application/json";
}

const MODEL = "gemini-2.0-flash";

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;
  return key;
}

function parseCandidateText(payload: any): string {
  const part = payload?.candidates?.[0]?.content?.parts?.find(
    (p: any) => typeof p?.text === "string"
  );
  return part?.text?.trim() ?? "";
}

export async function generateGeminiText({
  prompt,
  systemInstruction,
  history = [],
  responseMimeType = "text/plain",
}: GenerateTextInput): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      ...history.map((item) => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
      { role: "user", parts: [{ text: prompt }] },
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text = parseCandidateText(payload);
    return text || null;
  } catch {
    return null;
  }
}

function cleanJsonText(input: string): string {
  return input
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function parseGeminiJson<T>(input: string): T | null {
  const cleaned = cleanJsonText(input);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export async function generateGeminiJson<T>(
  prompt: string,
  fallback: T,
  systemInstruction?: string,
  history?: GeminiHistoryItem[]
): Promise<T> {
  const text = await generateGeminiText({
    prompt,
    systemInstruction,
    history,
    responseMimeType: "application/json",
  });

  if (!text) return fallback;
  const parsed = parseGeminiJson<T>(text);
  return parsed ?? fallback;
}
