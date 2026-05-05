import { LanguageLab } from "@/components/language-lab";
import { getCreditSummary } from "@/lib/credits";
import { defaultLessonRequest } from "@/lib/demo-lesson";
import { profileSelect, serializeProfile, type ProfileRow } from "@/lib/profile";
import { lessonSchema, quizAttemptSchema, type LessonRequest, type QuizAttempt } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams: Promise<{
    lesson?: string;
  }>;
};

type LessonAttemptRow = {
  lesson_key: string;
  title: string;
  target_language: string;
  level: string;
  score: number;
  created_at: string;
};

type SavedLessonRow = {
  id: string;
  title: string;
  target_language: string;
  level: string;
  lesson: unknown;
  created_at: string;
};

function parseSavedLesson(row: SavedLessonRow) {
  const parsed = lessonSchema.safeParse(row.lesson);
  if (!parsed.success) return null;

  return {
    id: row.id,
    title: row.title,
    targetLanguage: row.target_language,
    level: row.level,
    createdAt: row.created_at,
    lesson: parsed.data
  };
}

type SavedLessonPreview = NonNullable<ReturnType<typeof parseSavedLesson>>;

function parseLessonAttempt(row: LessonAttemptRow): QuizAttempt | null {
  const parsed = quizAttemptSchema.safeParse({
    lessonId: row.lesson_key,
    title: row.title,
    targetLanguage: row.target_language,
    level: row.level,
    score: row.score,
    createdAt: row.created_at
  });

  return parsed.success ? parsed.data : null;
}

export default async function Home({ searchParams }: HomePageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { lesson: savedLessonId } = await searchParams;

  let initialLesson = null;
  let initialAttempts: QuizAttempt[] = [];
  let initialSavedLessons: SavedLessonPreview[] = [];
  let initialRequest: LessonRequest = defaultLessonRequest;
  let initialCreditsRemaining: number | null = null;

  if (user && savedLessonId) {
    const { data } = await supabase
      .from("lessons")
      .select("lesson")
      .eq("id", savedLessonId)
      .eq("user_id", user.id)
      .maybeSingle();

    const parsed = lessonSchema.safeParse(data?.lesson);
    initialLesson = parsed.success ? parsed.data : null;
  }

  if (user) {
    const creditSummary = await getCreditSummary(supabase);
    initialCreditsRemaining = creditSummary?.remaining ?? null;

    const { data: profileData } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>();
    const profile = serializeProfile(profileData);

    initialRequest = {
      ...defaultLessonRequest,
      targetLanguage: profile.targetLanguage,
      nativeLanguage: profile.nativeLanguage,
      level: profile.currentLevel,
      regionVariant: profile.regionVariant
    };

    const { data } = await supabase
      .from("lesson_attempts")
      .select("lesson_key, title, target_language, level, score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<LessonAttemptRow[]>();

    initialAttempts = (data ?? []).flatMap((row) => {
      const attempt = parseLessonAttempt(row);
      return attempt ? [attempt] : [];
    });

    const { data: savedLessonRows } = await supabase
      .from("lessons")
      .select("id, title, target_language, level, lesson, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<SavedLessonRow[]>();

    initialSavedLessons = (savedLessonRows ?? []).flatMap((row) => {
      const savedLesson = parseSavedLesson(row);
      return savedLesson ? [savedLesson] : [];
    });

    if (!savedLessonId && initialSavedLessons[0]) {
      initialLesson = initialSavedLessons[0].lesson;
    }
  }

  return (
    <LanguageLab
      key={`${user?.id ?? "guest"}:${savedLessonId ?? "studio"}`}
      userEmail={user?.email ?? null}
      initialLesson={initialLesson}
      initialAttempts={initialAttempts}
      initialSavedLessons={initialSavedLessons}
      initialRequest={initialRequest}
      initialCreditsRemaining={initialCreditsRemaining}
    />
  );
}
