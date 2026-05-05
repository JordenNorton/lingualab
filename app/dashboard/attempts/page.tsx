import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import { getCreditSummary } from "@/lib/credits";
import { levels } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const pageSize = 20;

type AttemptsPageProps = {
  searchParams: Promise<{
    q?: string;
    language?: string;
    level?: string;
    minScore?: string;
    maxScore?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
};

type LessonAttemptRow = {
  id: string;
  lesson_key: string;
  title: string;
  target_language: string;
  level: string;
  score: number;
  created_at: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumber(value: string | undefined, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function parseDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function buildHref(filters: Record<string, string | number | undefined>, next: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...filters, ...next };

  Object.entries(merged).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `/dashboard/attempts?${query}` : "/dashboard/attempts";
}

export default async function AttemptsPage({ searchParams }: AttemptsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?message=Log in to view your attempts.");
  }

  const params = await searchParams;
  const q = firstValue(params.q)?.trim().slice(0, 80) || "";
  const language = firstValue(params.language)?.trim().slice(0, 60) || "";
  const levelParam = firstValue(params.level);
  const level = levelParam && (levels as readonly string[]).includes(levelParam) ? levelParam : "";
  const minScore = parseNumber(firstValue(params.minScore), 0, 100);
  const maxScore = parseNumber(firstValue(params.maxScore), 0, 100);
  const from = parseDate(firstValue(params.from));
  const to = parseDate(firstValue(params.to));
  const sortParam = firstValue(params.sort);
  const sort = sortParam === "oldest" || sortParam === "best" ? sortParam : "newest";
  const page = parseNumber(firstValue(params.page), 1, 9999) ?? 1;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("lesson_attempts")
    .select("id, lesson_key, title, target_language, level, score, created_at", { count: "exact" })
    .eq("user_id", user.id);

  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "\\$&")}%`);
  if (language) query = query.ilike("target_language", `%${language.replace(/[%_]/g, "\\$&")}%`);
  if (level) query = query.eq("level", level);
  if (minScore !== undefined) query = query.gte("score", minScore);
  if (maxScore !== undefined) query = query.lte("score", maxScore);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "best") {
    query = query.order("score", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count, error: attemptsError } = await query.range(offset, offset + pageSize - 1).returns<LessonAttemptRow[]>();
  const attempts = data ?? [];
  const total = count ?? attempts.length;
  const creditSummary = await getCreditSummary(supabase);
  const hasPrevious = page > 1;
  const hasNext = offset + attempts.length < total;
  const filters = {
    q,
    language,
    level,
    minScore,
    maxScore,
    from,
    to,
    sort: sort === "newest" ? undefined : sort
  };

  if (attemptsError) console.error("Quiz attempt history unavailable", attemptsError);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <AppNavbar activeItem="dashboard" userEmail={user.email} creditsRemaining={creditSummary?.remaining ?? null} />

      <header className="border-b border-ink/10 pb-5">
        <h1 className="text-3xl font-semibold text-ink">Quiz Attempts</h1>
        <p className="mt-1 text-sm text-ink/62">{total} saved results</p>
      </header>

      <form className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft" method="get">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-sm font-medium text-ink/70">Search lesson title</span>
            <input
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="q"
              defaultValue={q}
              placeholder="Market, travel, coffee..."
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">Language</span>
            <input
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="language"
              defaultValue={language}
              placeholder="Spanish"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">Level</span>
            <select
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="level"
              defaultValue={level}
            >
              <option value="">Any</option>
              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">Min score</span>
            <input
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              max={100}
              min={0}
              name="minScore"
              type="number"
              defaultValue={minScore ?? ""}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">Max score</span>
            <input
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              max={100}
              min={0}
              name="maxScore"
              type="number"
              defaultValue={maxScore ?? ""}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">From</span>
            <input
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="from"
              type="date"
              defaultValue={from ?? ""}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">To</span>
            <input
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="to"
              type="date"
              defaultValue={to ?? ""}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink/70">Sort</span>
            <select
              className="h-10 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
              name="sort"
              defaultValue={sort}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="best">Best score</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-graphite"
          >
            Apply filters
          </button>
          <Link
            href="/dashboard/attempts"
            className="flex h-10 items-center rounded-md border border-ink/15 px-4 text-sm font-semibold text-ink transition hover:border-lagoon/50 hover:text-lagoon"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-ink">Results</h2>
          <p className="text-sm text-ink/58">
            {total ? `${offset + 1}-${offset + attempts.length} of ${total}` : "0 results"}
          </p>
        </div>

        {attemptsError ? (
          <p className="mt-5 rounded-md border border-coral/20 bg-coral/10 p-4 text-sm text-ink/70">
            Your quiz history could not be loaded right now. Please try again later.
          </p>
        ) : attempts.length ? (
          <div className="mt-5 overflow-hidden rounded-md border border-ink/10">
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_90px_90px_120px] gap-3 bg-paper px-4 py-3 text-xs font-semibold uppercase tracking-normal text-ink/50 md:grid">
              <span>Lesson</span>
              <span>Language</span>
              <span>Level</span>
              <span>Score</span>
              <span>Date</span>
            </div>
            <div className="divide-y divide-ink/10">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_120px_90px_90px_120px] md:items-center md:gap-3"
                >
                  <div>
                    <p className="font-semibold text-ink">{attempt.title}</p>
                    <p className="mt-1 text-xs text-ink/45 md:hidden">
                      {attempt.target_language} | {attempt.level} | {formatDate(attempt.created_at)}
                    </p>
                  </div>
                  <span className="hidden text-ink/68 md:block">{attempt.target_language}</span>
                  <span className="hidden text-ink/68 md:block">{attempt.level}</span>
                  <span className="w-fit rounded-md bg-lagoon/10 px-2 py-1 text-xs font-semibold text-lagoon">
                    {attempt.score}%
                  </span>
                  <span className="hidden text-ink/68 md:block">{formatDate(attempt.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-dashed border-ink/20 bg-paper/50 p-6 text-sm text-ink/55">
            No quiz attempts match these filters.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={buildHref(filters, { page: page - 1 <= 1 ? undefined : page - 1 })}
            aria-disabled={!hasPrevious}
            className={`flex h-10 items-center rounded-md border border-ink/15 px-4 text-sm font-semibold transition ${
              hasPrevious ? "text-ink hover:border-lagoon/50 hover:text-lagoon" : "pointer-events-none text-ink/30"
            }`}
          >
            Previous
          </Link>
          <span className="text-sm text-ink/55">Page {page}</span>
          <Link
            href={buildHref(filters, { page: page + 1 })}
            aria-disabled={!hasNext}
            className={`flex h-10 items-center rounded-md border border-ink/15 px-4 text-sm font-semibold transition ${
              hasNext ? "text-ink hover:border-lagoon/50 hover:text-lagoon" : "pointer-events-none text-ink/30"
            }`}
          >
            Next
          </Link>
        </div>
      </section>
    </main>
  );
}
