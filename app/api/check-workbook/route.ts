import type { z } from "zod";
import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { createDemoWorkbookFeedback } from "@/lib/demo-lesson";
import { workbookFeedbackJsonSchema } from "@/lib/json-schemas";
import { createOpenAIClient, getOpenAIModel, hasOpenAIKey, parseResponseJson, reasoningForModel } from "@/lib/openai";
import { buildWorkbookFeedbackInstructions } from "@/lib/prompts";
import { workbookCheckRequestSchema, workbookFeedbackSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type WorkbookCheckRequest = z.infer<typeof workbookCheckRequestSchema>;

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = workbookCheckRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Add a short answer before asking for feedback.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const model = hasOpenAIKey() ? getOpenAIModel() : null;
    const feedback = model ? await createWorkbookFeedback(parsed.data, model) : createDemoWorkbookFeedback();
    const meta = model
      ? {
          mode: "ai" as const,
          model,
          message: "Writing feedback saved to your account."
        }
      : {
          mode: "demo" as const,
          message: "Demo writing feedback saved to your account. Set OPENAI_API_KEY to enable live feedback."
        };

    const { data: savedFeedback, error } = await auth.supabase
      .from("writing_feedback")
      .insert({
        user_id: auth.user.id,
        lesson_key: parsed.data.lessonId,
        title: parsed.data.title,
        target_language: parsed.data.targetLanguage,
        native_language: parsed.data.nativeLanguage,
        level: parsed.data.level,
        prompt: parsed.data.prompt,
        success_criteria: parsed.data.successCriteria,
        answer: parsed.data.answer,
        feedback,
        score: feedback.score
      })
      .select("id, created_at")
      .single<{ id: string; created_at: string }>();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      feedback,
      savedFeedback: {
        id: savedFeedback.id,
        createdAt: savedFeedback.created_at
      },
      meta
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check that workbook response.";

    return Response.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}

async function createWorkbookFeedback(data: WorkbookCheckRequest, model: string) {
  const client = createOpenAIClient();
  const response = await client.responses.create({
    model,
    instructions: buildWorkbookFeedbackInstructions(data.nativeLanguage),
    input: [
      `Target language: ${data.targetLanguage}`,
      `Learner level: ${data.level}`,
      `Workbook prompt: ${data.prompt}`,
      `Success criteria: ${data.successCriteria.join("; ") || "No extra criteria."}`,
      `Learner answer: ${data.answer}`
    ].join("\n"),
    reasoning: reasoningForModel(model),
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "workbook_feedback",
        strict: true,
        schema: workbookFeedbackJsonSchema
      }
    }
  });

  return workbookFeedbackSchema.parse(
    parseResponseJson<unknown>(response.output_text, "The model returned workbook feedback that was not valid JSON.")
  );
}
