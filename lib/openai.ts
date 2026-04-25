import OpenAI from "openai";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export function reasoningForModel(model: string) {
  return model.startsWith("gpt-5") ? { effort: "low" as const } : undefined;
}

export function parseResponseJson<T>(outputText: string, fallbackMessage: string): T {
  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}
