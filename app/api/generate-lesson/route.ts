import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { createDemoLesson } from "@/lib/demo-lesson";
import { lessonResponseJsonSchema } from "@/lib/json-schemas";
import { createOpenAIClient, getOpenAIModel, hasOpenAIKey, parseResponseJson, reasoningForModel } from "@/lib/openai";
import { buildLessonInstructions, buildLessonPrompt } from "@/lib/prompts";
import { lessonRequestSchema, lessonSchema } from "@/lib/schemas";
import { consumeLessonCredit, refundLessonCredit } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = lessonRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Please check the lesson options and try again.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const lessonKey = crypto.randomUUID();
  const credit = await consumeLessonCredit(auth.supabase, lessonKey);
  if (!credit.allowed) return credit.response;

  if (!hasOpenAIKey()) {
    const lesson = {
      ...createDemoLesson(parsed.data),
      id: lessonKey,
      createdAt: new Date().toISOString()
    };

    return Response.json({
      lesson,
      meta: {
        mode: "demo",
        message: "Set OPENAI_API_KEY to generate live lessons.",
        credits: credit.credits
      }
    });
  }

  try {
    const model = getOpenAIModel();
    const client = createOpenAIClient();
    const response = await client.responses.create({
      model,
      instructions: buildLessonInstructions(),
      input: buildLessonPrompt(parsed.data),
      reasoning: reasoningForModel(model),
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "language_lesson",
          strict: true,
          schema: lessonResponseJsonSchema
        }
      }
    });

    const parsedLesson = lessonSchema.parse(
      parseResponseJson<unknown>(response.output_text, "The model returned a lesson that was not valid JSON.")
    );
    const lesson = {
      ...parsedLesson,
      id: lessonKey,
      createdAt: new Date().toISOString()
    };

    return Response.json({
      lesson,
      meta: {
        mode: "ai",
        model,
        credits: credit.credits
      }
    });
  } catch (error) {
    await refundLessonCredit(auth.supabase, lessonKey);
    const message = error instanceof Error ? error.message : "Unable to generate a lesson.";

    return Response.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}
