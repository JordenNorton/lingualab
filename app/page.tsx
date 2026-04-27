import { LanguageLab } from "@/components/language-lab";
import { lessonSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams: Promise<{
    lesson?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { lesson: savedLessonId } = await searchParams;

  let initialLesson = null;

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

  return <LanguageLab userEmail={user?.email ?? null} initialLesson={initialLesson} />;
}
