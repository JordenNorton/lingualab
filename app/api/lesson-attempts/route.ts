import { getAuthenticatedSupabase } from "@/lib/api-auth";
import { quizAttemptCreateSchema, quizAttemptSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type LessonAttemptRow = {
  lesson_key: string;
  title: string;
  target_language: string;
  level: string;
  score: number;
  created_at: string;
};

function serializeAttempt(row: LessonAttemptRow) {
  return quizAttemptSchema.parse({
    lessonId: row.lesson_key,
    title: row.title,
    targetLanguage: row.target_language,
    level: row.level,
    score: row.score,
    createdAt: row.created_at
  });
}

export async function GET() {
  const auth = await getAuthenticatedSupabase("Log in to view quiz attempts.");
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("lesson_attempts")
    .select("lesson_key, title, target_language, level, score, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<LessonAttemptRow[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    attempts: (data ?? []).map(serializeAttempt)
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase("Log in to save quiz attempts.");
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = quizAttemptCreateSchema.safeParse(body?.attempt);

  if (!parsed.success) {
    return Response.json(
      {
        error: "The quiz attempt could not be saved because it was not in the expected format.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const attempt = parsed.data;
  const { data, error } = await auth.supabase
    .from("lesson_attempts")
    .insert({
      user_id: auth.user.id,
      lesson_key: attempt.lessonId,
      title: attempt.title,
      target_language: attempt.targetLanguage,
      level: attempt.level,
      score: attempt.score
    })
    .select("lesson_key, title, target_language, level, score, created_at")
    .single<LessonAttemptRow>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    attempt: serializeAttempt(data)
  });
}
