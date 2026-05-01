import { lessonSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type SavedLessonRow = {
  id: string;
  title: string;
  target_language: string;
  level: string;
  created_at: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Log in to save lessons." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = lessonSchema.safeParse(body?.lesson);

  if (!parsed.success) {
    return Response.json(
      {
        error: "The lesson could not be saved because it was not in the expected format.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const lesson = parsed.data;
  const { data, error } = await supabase
    .from("lessons")
    .upsert(
      {
        user_id: user.id,
        lesson_key: lesson.id,
        title: lesson.title,
        target_language: lesson.targetLanguage,
        native_language: lesson.nativeLanguage,
        level: lesson.level,
        content_type: lesson.contentType,
        lesson,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id,lesson_key"
      }
    )
    .select("id, title, target_language, level, created_at")
    .single<SavedLessonRow>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    savedLesson: {
      id: data.id,
      title: data.title,
      targetLanguage: data.target_language,
      level: data.level,
      createdAt: data.created_at,
      lesson
    }
  });
}
