import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import { lessonSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type SavedLessonRow = {
  id: string;
  title: string;
  target_language: string;
  level: string;
  content_type: string;
  lesson: unknown;
  created_at: string;
};

type LessonAttemptRow = {
  id: string;
  title: string;
  target_language: string;
  level: string;
  score: number;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?message=Log in to view your dashboard.");
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, target_language, level, content_type, lesson, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SavedLessonRow[]>();

  const {
    data: attempts,
    count: attemptsCount,
    error: attemptsError
  } = await supabase
    .from("lesson_attempts")
    .select("id, title, target_language, level, score, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<LessonAttemptRow[]>();

  const savedLessons = lessons ?? [];
  const recentAttempts = attempts ?? [];
  const vocabularyCount = savedLessons.reduce((count, savedLesson) => {
    const parsed = lessonSchema.safeParse(savedLesson.lesson);
    return count + (parsed.success ? parsed.data.vocabulary.length : 0);
  }, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-lagoon">
            LinguaLab
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink/62">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="flex h-10 items-center rounded-md border border-ink/15 px-3 text-sm font-medium text-ink transition hover:border-lagoon/50 hover:text-lagoon"
          >
            Generate lesson
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-10 items-center rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-graphite"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardMetric label="Saved lessons" value={String(savedLessons.length)} />
        <DashboardMetric label="Quiz attempts" value={String(attemptsCount ?? recentAttempts.length)} />
        <DashboardMetric label="Vocabulary terms" value={String(vocabularyCount)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Learning history</h2>
          <p className="mt-2 text-sm text-ink/62">
            Saved lessons appear here as soon as you save them from the generator.
          </p>
          {lessonsError ? (
            <div className="mt-5 rounded-md border border-coral/20 bg-coral/10 p-4 text-sm text-ink/70">
              The lessons table is not ready yet. Run the SQL files in{" "}
              <code className="rounded bg-white px-1.5 py-0.5">supabase/migrations</code>
              , then refresh this page.
            </div>
          ) : savedLessons.length ? (
            <div className="mt-5 space-y-3">
              {savedLessons.map((savedLesson) => (
                <Link
                  key={savedLesson.id}
                  href={`/?lesson=${savedLesson.id}`}
                  className="flex flex-col gap-3 rounded-md border border-ink/10 bg-paper/55 p-4 transition hover:border-lagoon/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{savedLesson.title}</span>
                    <span className="mt-1 block text-sm text-ink/58">
                      {savedLesson.target_language} | {savedLesson.level} | {formatContentType(savedLesson.content_type)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-lagoon">
                    {formatDate(savedLesson.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-ink/20 bg-paper/50 p-6 text-sm text-ink/55">
              No saved lessons yet.
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Recent Quiz Attempts</h2>
          {attemptsError ? (
            <p className="mt-4 rounded-md border border-coral/20 bg-coral/10 p-3 text-sm text-ink/70">
              Run the lesson attempts migration to show quiz history here.
            </p>
          ) : recentAttempts.length ? (
            <div className="mt-4 space-y-3">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-md border border-ink/10 bg-paper/55 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold text-ink">{attempt.title}</p>
                    <span className="shrink-0 rounded-md bg-lagoon/10 px-2 py-1 text-xs font-semibold text-lagoon">
                      {attempt.score}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink/58">
                    {attempt.target_language} | {attempt.level} | {formatDate(attempt.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-dashed border-ink/20 bg-paper/50 p-4 text-sm text-ink/55">
              No quiz attempts yet.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}

function formatContentType(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-ink/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
