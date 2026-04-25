import { createDemoWorkbookFeedback } from "@/lib/demo-lesson";
import { workbookFeedbackJsonSchema } from "@/lib/json-schemas";
import { createOpenAIClient, getOpenAIModel, hasOpenAIKey, parseResponseJson, reasoningForModel } from "@/lib/openai";
import { buildWorkbookFeedbackInstructions } from "@/lib/prompts";
import { workbookCheckRequestSchema, workbookFeedbackSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  if (!hasOpenAIKey()) {
    return Response.json({
      feedback: createDemoWorkbookFeedback(),
      meta: {
        mode: "demo",
        message: "Set OPENAI_API_KEY to enable live writing feedback."
      }
    });
  }

  try {
    const model = getOpenAIModel();
    const client = createOpenAIClient();
    const response = await client.responses.create({
      model,
      instructions: buildWorkbookFeedbackInstructions(parsed.data.nativeLanguage),
      input: [
        `Target language: ${parsed.data.targetLanguage}`,
        `Learner level: ${parsed.data.level}`,
        `Workbook prompt: ${parsed.data.prompt}`,
        `Success criteria: ${parsed.data.successCriteria.join("; ") || "No extra criteria."}`,
        `Learner answer: ${parsed.data.answer}`
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

    const feedback = workbookFeedbackSchema.parse(
      parseResponseJson<unknown>(response.output_text, "The model returned workbook feedback that was not valid JSON.")
    );

    return Response.json({
      feedback,
      meta: {
        mode: "ai",
        model
      }
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
