import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import {
  getProfileDisplayName,
  getProfileInitials,
  profileSelect,
  serializeProfile,
  type ProfileRow
} from "@/lib/profile";
import { lessonSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const dashboardPreviewLimit = 5;

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

type WritingFeedbackRow = {
  id: string;
  title: string;
  target_language: string;
  level: string;
  score: number;
  prompt: string;
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

  const { data: profileData } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const {
    data: lessons,
    count: lessonsCount,
    error: lessonsError
  } = await supabase
    .from("lessons")
    .select("id, title, target_language, level, content_type, lesson, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(dashboardPreviewLimit)
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
    .limit(dashboardPreviewLimit)
    .returns<LessonAttemptRow[]>();

  const {
    data: writingFeedback,
    count: writingFeedbackCount,
    error: writingFeedbackError
  } = await supabase
    .from("writing_feedback")
    .select("id, title, target_language, level, score, prompt, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(dashboardPreviewLimit)
    .returns<WritingFeedbackRow[]>();

  const savedLessons = lessons ?? [];
  const recentAttempts = attempts ?? [];
  const recentWritingFeedback = writingFeedback ?? [];
  const profile = serializeProfile(profileData);
  const displayName = getProfileDisplayName(profile, user.email);
  const vocabularyCount = savedLessons.reduce((count, savedLesson) => {
    const parsed = lessonSchema.safeParse(savedLesson.lesson);
    return count + (parsed.success ? parsed.data.vocabulary.length : 0);
  }, 0);

  if (lessonsError) console.error("Dashboard lessons unavailable", lessonsError);
  if (attemptsError) console.error("Dashboard attempts unavailable", attemptsError);
  if (writingFeedbackError) console.error("Dashboard writing feedback unavailable", writingFeedbackError);

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
          <Link
            href="/dashboard/settings"
            className="flex h-10 items-center rounded-md border border-ink/15 px-3 text-sm font-medium text-ink transition hover:border-lagoon/50 hover:text-lagoon"
          >
            Settings
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

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar profile={profile} email={user.email} />
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-normal text-lagoon">Welcome back</p>
              <h2 className="mt-1 text-3xl font-semibold text-ink">{displayName}</h2>
              <p className="mt-2 max-w-2xl text-sm text-ink/65">
                {profile.learningGoal || `Ready for your next ${profile.targetLanguage} session?`}
              </p>
              {profile.shortBio ? <p className="mt-2 max-w-2xl text-sm text-ink/55">{profile.shortBio}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md bg-lagoon/10 px-2.5 py-1 text-lagoon">{profile.targetLanguage}</span>
            <span className="rounded-md bg-coral/10 px-2.5 py-1 text-coral">{profile.currentLevel}</span>
            <span className="rounded-md bg-saffron/10 px-2.5 py-1 text-saffron">{profile.nativeLanguage}</span>
            <Link href="/dashboard/settings" className="rounded-md border border-ink/10 px-2.5 py-1 text-ink/60 transition hover:border-lagoon/40 hover:text-lagoon">
              Edit profile
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetric label="Saved lessons" value={String(lessonsCount ?? savedLessons.length)} />
        <DashboardMetric label="Quiz attempts" value={String(attemptsCount ?? recentAttempts.length)} />
        <DashboardMetric label="Writing feedback" value={String(writingFeedbackCount ?? recentWritingFeedback.length)} />
        <DashboardMetric label="Recent terms" value={String(vocabularyCount)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Recent Saved Lessons</h2>
          <p className="mt-2 text-sm text-ink/62">
            Your latest saved lessons appear here as soon as you save them from the generator.
          </p>
          {lessonsError ? (
            <div className="mt-5 rounded-md border border-coral/20 bg-coral/10 p-4 text-sm text-ink/70">
              Your saved lessons could not be loaded right now. Please try again later.
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

        <div className="space-y-4">
          <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-ink">Recent Quiz Attempts</h2>
              <Link href="/dashboard/attempts" className="shrink-0 text-sm font-semibold text-lagoon">
                Show more
              </Link>
            </div>
            {attemptsError ? (
              <p className="mt-4 rounded-md border border-coral/20 bg-coral/10 p-3 text-sm text-ink/70">
                Your quiz history could not be loaded right now. Please try again later.
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

          <RecentWritingFeedbackPanel
            error={writingFeedbackError}
            items={recentWritingFeedback}
          />
        </div>
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

function RecentWritingFeedbackPanel({
  error,
  items
}: {
  error: unknown;
  items: WritingFeedbackRow[];
}) {
  return (
    <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">Recent Writing Feedback</h2>
        <Link href="/dashboard/writing-feedback" className="shrink-0 text-sm font-semibold text-lagoon">
          Show more
        </Link>
      </div>
      {error ? (
        <p className="mt-4 rounded-md border border-coral/20 bg-coral/10 p-3 text-sm text-ink/70">
          Your writing feedback history could not be loaded right now. Please try again later.
        </p>
      ) : items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="dashboard-feedback-card rounded-md border border-ink/10 transition-colors hover:border-lagoon/40">
              <Link href={`/dashboard/writing-feedback/${item.id}`} className="block p-3 no-underline">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold text-ink">{item.title}</span>
                  <span className="shrink-0 rounded-md bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">
                    {item.score}/100
                  </span>
                </span>
                <span className="mt-1 block line-clamp-2 text-sm text-ink/62">{item.prompt}</span>
                <span className="mt-2 block text-sm text-ink/58">
                  {item.target_language} | {item.level} | {formatDate(item.created_at)}
                </span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-ink/20 bg-paper/50 p-4 text-sm text-ink/55">
          No writing feedback yet.
        </p>
      )}
    </aside>
  );
}

function Avatar({ profile, email }: { profile: ReturnType<typeof serializeProfile>; email?: string | null }) {
  if (profile.profilePictureUrl) {
    return (
      <div
        aria-hidden="true"
        className="h-20 w-20 shrink-0 rounded-lg bg-ink bg-cover bg-center text-paper"
        style={{ backgroundImage: `url("${profile.profilePictureUrl.replace(/"/g, "%22")}")` }}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-ink text-2xl font-semibold text-paper">
      {getProfileInitials(profile, email)}
    </div>
  );
}
