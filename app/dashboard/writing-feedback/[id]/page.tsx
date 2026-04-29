import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logout } from "@/lib/auth-actions";
import { type WorkbookFeedback, workbookFeedbackSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type WritingFeedbackDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type WritingFeedbackDetailRow = {
  id: string;
  title: string;
  target_language: string;
  native_language: string;
  level: string;
  prompt: string;
  success_criteria: unknown;
  answer: string;
  feedback: unknown;
  score: number;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function parseCriteria(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseFeedback(value: unknown, score: number): WorkbookFeedback {
  const parsed = workbookFeedbackSchema.safeParse(value);

  return parsed.success
    ? parsed.data
    : {
        score,
        strengths: [],
        corrections: [],
        nextStep: "This saved feedback could not be displayed in full."
      };
}

export default async function WritingFeedbackDetailPage({ params }: WritingFeedbackDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?message=Log in to view your writing feedback.");
  }

  const { id } = await params;
  const { data } = await supabase
    .from("writing_feedback")
    .select("id, title, target_language, native_language, level, prompt, success_criteria, answer, feedback, score, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<WritingFeedbackDetailRow>();

  if (!data) {
    notFound();
  }

  const criteria = parseCriteria(data.success_criteria);
  const feedback = parseFeedback(data.feedback, data.score);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard/writing-feedback" className="text-sm font-semibold text-lagoon">
            Writing Feedback
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{data.title}</h1>
          <p className="mt-1 text-sm text-ink/62">
            {data.target_language} | {data.level} | {formatDateTime(data.created_at)}
          </p>
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

      <section className="grid gap-4 sm:grid-cols-3">
        <DetailMetric label="Score" value={`${feedback.score}/100`} />
        <DetailMetric label="Learning" value={data.target_language} />
        <DetailMetric label="Native" value={data.native_language} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Writing Prompt</h2>
            <p className="mt-3 whitespace-pre-wrap text-ink/72">{data.prompt}</p>
            {criteria.length ? (
              <ul className="mt-4 space-y-1 text-sm text-ink/62">
                {criteria.map((criterion) => (
                  <li key={criterion}>- {criterion}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Your Response</h2>
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-paper/55 p-4 text-ink/76">{data.answer}</p>
          </div>
        </div>

        <aside className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink">Feedback</h2>
            <span className="shrink-0 rounded-md bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">
              {feedback.score}/100
            </span>
          </div>
          <div className="mt-4 space-y-4">
            <FeedbackSection title="Strengths" items={feedback.strengths} empty="No strengths were saved." />
            <FeedbackSection title="Corrections" items={feedback.corrections} empty="No corrections were saved." />
            <div>
              <h3 className="text-sm font-semibold text-ink">Next step</h3>
              <p className="mt-2 text-sm text-ink/68">{feedback.nextStep}</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-ink/55">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function FeedbackSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm text-ink/68">
          {items.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink/50">{empty}</p>
      )}
    </div>
  );
}
