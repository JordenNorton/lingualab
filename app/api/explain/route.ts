import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { createDemoExplanation } from "@/lib/demo-lesson";
import { explanationJsonSchema } from "@/lib/json-schemas";
import { createOpenAIClient, getOpenAIModel, hasOpenAIKey, parseResponseJson, reasoningForModel } from "@/lib/openai";
import { buildExplanationInstructions } from "@/lib/prompts";
import { explanationRequestSchema, explanationSchema } from "@/lib/schemas";
import { recordUsageEvent } from "@/lib/usage-limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = explanationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Select a short phrase or sentence to explain.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const usage = await recordUsageEvent(auth.supabase, "explanation");
  if (!usage.allowed) return usage.response;

  if (!hasOpenAIKey()) {
    return Response.json({
      explanation: createDemoExplanation(parsed.data.selectedText, parsed.data.nativeLanguage),
      meta: {
        mode: "demo",
        message: "Set OPENAI_API_KEY to enable live explanations.",
        usage: {
          remaining: usage.remaining,
          limit: usage.limit,
          resetAt: usage.resetAt
        }
      }
    });
  }

  try {
    const model = getOpenAIModel();
    const client = createOpenAIClient();
    const response = await client.responses.create({
      model,
      instructions: buildExplanationInstructions(parsed.data.nativeLanguage),
      input: [
        `Target language: ${parsed.data.targetLanguage}`,
        `Learner level: ${parsed.data.level}`,
        `Selected text: ${parsed.data.selectedText}`,
        `Nearby context: ${parsed.data.surroundingText || "No context provided."}`
      ].join("\n"),
      reasoning: reasoningForModel(model),
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "language_explanation",
          strict: true,
          schema: explanationJsonSchema
        }
      }
    });

    const explanation = explanationSchema.parse(
      parseResponseJson<unknown>(response.output_text, "The model returned an explanation that was not valid JSON.")
    );

    return Response.json({
      explanation,
      meta: {
        mode: "ai",
        model,
        usage: {
          remaining: usage.remaining,
          limit: usage.limit,
          resetAt: usage.resetAt
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to explain that text.";

    return Response.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}
